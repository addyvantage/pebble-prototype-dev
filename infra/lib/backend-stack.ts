import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as path from 'path'

export interface BackendStackProps extends cdk.StackProps {
  /** Bedrock model ID (default: from cdk.json context or claude-haiku-4-5). */
  bedrockModelId?: string
}

export class BackendStack extends cdk.Stack {
  /** Domain name for the API Gateway HTTP API — used as a CloudFront origin. */
  public readonly apiDomain: string

  constructor(scope: Construct, id: string, props: BackendStackProps = {}) {
    super(scope, id, props)

    const bedrockModelId =
      props.bedrockModelId ??
      (this.node.tryGetContext('bedrockModelId') as string | undefined) ??
      'anthropic.claude-haiku-4-5-20251001-v1:0'

    // ── LLM Lambda (TypeScript / Node 20) ─────────────────────────────────────
    //
    // NodejsFunction uses esbuild to bundle the TypeScript handler into a single
    // CommonJS file. @aws-sdk/* is excluded because it ships with the Lambda
    // Node 20 runtime (no need to bundle it, keeps the zip tiny).
    //
    // esbuild follows the relative import `../../../shared/pebblePromptRules`
    // back to the repo root and bundles it automatically.
    const llmFn = new NodejsFunction(this, 'PebbleLlmFunction', {
      functionName: 'PebbleLlmFunction',
      description: 'Pebble LLM — forwards prompts to Bedrock Claude',
      entry: path.join(__dirname, '../lambda/pebble/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(25),
      environment: {
        BEDROCK_MODEL_ID: bedrockModelId,
      },
      bundling: {
        // @aws-sdk/* ships with the Node 20 Lambda runtime — no need to bundle.
        externalModules: ['@aws-sdk/*'],
      },
    })

    // Grant least-privilege Bedrock access.
    //
    // Default model: anthropic.claude-3-haiku-20240307-v1:0 (direct invocation,
    // no Bedrock model-access subscription required).
    //
    // To use cross-region inference profiles (apac.*, global.*) you must first
    // enable model access in the AWS Console:
    //   Amazon Bedrock → Model access → Manage model access → enable Claude models
    // Then override bedrockModelId in cdk.json (e.g. apac.anthropic.claude-3-5-sonnet-20241022-v2:0).
    llmFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'BedrockInvokeModel',
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:*::foundation-model/*',
          `arn:aws:bedrock:*:${this.account}:inference-profile/*`,
        ],
      }),
    )

    // ── Runner Lambda (Python 3.12) ────────────────────────────────────────────
    //
    // Uses the Lambda Python 3.12 runtime which has python3 available for
    // subprocess execution. No external dependencies — self-contained handler.
    const runnerFn = new lambda.Function(this, 'PebbleRunnerFunction', {
      functionName: 'PebbleRunnerFunction',
      description: 'Pebble Runner — executes Python code in a sandboxed subprocess',
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/run')),
      handler: 'index.handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
    })

    // ── Health Lambda (TypeScript / Node 20) ──────────────────────────────────
    const healthFn = new NodejsFunction(this, 'PebbleHealthFunction', {
      functionName: 'PebbleHealthFunction',
      description: 'Pebble health check — returns 200 OK with runtime info',
      entry: path.join(__dirname, '../lambda/health/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    })

    // ── HTTP API (API Gateway v2) ──────────────────────────────────────────────
    //
    // Routes are exposed at the $default stage (no stage prefix in the URL).
    // CORS preflight is handled at the API Gateway level for all routes.
    const api = new apigwv2.HttpApi(this, 'PebbleApi', {
      apiName: 'PebbleApi',
      description: 'Pebble backend HTTP API — LLM, runner, health',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.HEAD,
        ],
        allowHeaders: ['Content-Type'],
      },
    })

    api.addRoutes({
      path: '/api/pebble',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('LlmIntegration', llmFn),
    })

    api.addRoutes({
      path: '/api/run',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('RunnerIntegration', runnerFn),
    })

    api.addRoutes({
      path: '/api/health',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.HEAD],
      integration: new HttpLambdaIntegration('HealthIntegration', healthFn),
    })

    // Export the bare domain (no protocol, no trailing slash) for use as a
    // CloudFront HttpOrigin. API Gateway $default stage has no path prefix.
    this.apiDomain = `${api.httpApiId}.execute-api.${this.region}.amazonaws.com`

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? `https://${this.apiDomain}/`,
      description: 'API Gateway HTTP API base URL',
    })

    new cdk.CfnOutput(this, 'ApiDomain', {
      value: this.apiDomain,
      description: 'API Gateway domain used as the CloudFront /api/* origin',
    })
  }
}
