import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as s3 from 'aws-cdk-lib/aws-s3'
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

    const configuredFrontendOrigins = [
      process.env.FRONTEND_ORIGIN,
      this.node.tryGetContext('frontendOrigin') as string | undefined,
      'http://localhost:5173',
      'https://*.cloudfront.net',
      'https://main.d2c2alvh2q833h.amplifyapp.com',
      'https://*.amplifyapp.com',
    ]
      .filter((origin): origin is string => typeof origin === 'string' && origin.trim().length > 0)
      .map((origin) => origin.trim().replace(/\/+$/, ''))

    const avatarCorsAllowedOrigins = [...new Set(configuredFrontendOrigins)]

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

    // ── Profile Lambda (TypeScript / Node 20) ─────────────────────────────────
    //
    // Handles profile/auth/avatar routes under /api/* for user profile flows.
    // Registering these routes in API Gateway is essential: without them, API GW
    // returns 404 → CloudFront remaps 404 → 200 + index.html, so the client gets
    // HTML instead of JSON ("Unexpected token '<'...").
    //
    // IMPORTANT: The Lambda itself never returns HTTP 403 or 404 for the same
    // reason (see respond() helper in the Lambda source).
    const profileFn = new NodejsFunction(this, 'PebbleProfileFunction', {
      functionName: 'PebbleProfileFunction',
      description: 'Pebble profile — GET/PUT profile, POST avatar presign',
      entry: path.join(__dirname, '../lambda/profile/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
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
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.HEAD,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
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

    // Profile + avatar presign routes — wired after profilesTable and avatarsBucket
    // are declared below so we can use their .grantReadWriteData() / .grantReadWrite()
    // methods. We declare the routes here to keep API Gateway setup together, and
    // apply grants after the resource declarations.

    // Export the bare domain (no protocol, no trailing slash) for use as a
    // CloudFront HttpOrigin. API Gateway $default stage has no path prefix.
    this.apiDomain = `${api.httpApiId}.execute-api.${this.region}.amazonaws.com`

    // ── Phase 1: Auth & Profiles ─────────────────────────────────────────────

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'PebbleUserPool', {
      userPoolName: 'PebbleUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        preferredUsername: { required: false, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Auto-confirm for hackathon (lambda trigger would be needed for true auto-confirm,
    // but we can use the Cognito console to disable verification for demo)
    const userPoolClient = new cognito.UserPoolClient(this, 'PebbleWebClient', {
      userPool,
      userPoolClientName: 'PebbleWebClient',
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      generateSecret: false,
    })

    // DynamoDB Profiles Table
    const profilesTable = new dynamodb.Table(this, 'PebbleProfilesTable', {
      tableName: 'pebble-profiles',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    profilesTable.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    })

    // S3 Avatars Bucket
    const avatarsBucket = new s3.Bucket(this, 'PebbleAvatarsBucket', {
      bucketName: `pebble-avatars-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedOrigins: avatarCorsAllowedOrigins,
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // ── Profile Lambda: API Gateway routes + IAM grants ───────────────────────

    // Environment variables the Lambda needs at runtime
    profileFn.addEnvironment('PROFILES_TABLE_NAME', profilesTable.tableName)
    profileFn.addEnvironment('AVATARS_BUCKET_NAME', avatarsBucket.bucketName)
    profileFn.addEnvironment('COGNITO_CLIENT_ID', userPoolClient.userPoolClientId)
    profileFn.addEnvironment('COGNITO_USER_POOL_ID', userPool.userPoolId)
    if (process.env.ADMIN_EMAILS) {
      profileFn.addEnvironment('ADMIN_EMAILS', process.env.ADMIN_EMAILS)
    }

    // Least-privilege grants
    profilesTable.grantReadWriteData(profileFn)
    avatarsBucket.grantReadWrite(profileFn)

    // Register routes with API Gateway
    const profileIntegration = new HttpLambdaIntegration('ProfileIntegration', profileFn)
    api.addRoutes({
      path: '/api/profile',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/profile/username',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/username/available',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/auth/username-available',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/auth/login',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/auth/signup',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/auth/confirm-signup',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/auth/resend-signup-code',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/avatar/presign',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })
    api.addRoutes({
      path: '/api/avatar/url',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.OPTIONS],
      integration: profileIntegration,
    })

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? `https://${this.apiDomain}/`,
      description: 'API Gateway HTTP API base URL',
    })

    new cdk.CfnOutput(this, 'ApiDomain', {
      value: this.apiDomain,
      description: 'API Gateway domain used as the CloudFront /api/* origin',
    })

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })

    new cdk.CfnOutput(this, 'ProfilesTableName', {
      value: profilesTable.tableName,
    })

    new cdk.CfnOutput(this, 'AvatarsBucketName', {
      value: avatarsBucket.bucketName,
    })
  }
}
