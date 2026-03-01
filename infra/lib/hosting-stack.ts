import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class HostingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -------------------------------------------------------------------------
    // Removal policy: controlled via CDK context so operators can override at
    // deploy time with: cdk deploy --context removalPolicy=DESTROY
    // -------------------------------------------------------------------------
    const removalPolicyRaw: string = this.node.tryGetContext("removalPolicy") ?? "RETAIN";
    const removalPolicy =
      removalPolicyRaw.toUpperCase() === "DESTROY"
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN;

    // -------------------------------------------------------------------------
    // S3 Bucket — fully private, no public access, no website hosting endpoint.
    // CloudFront accesses it via Origin Access Control (OAC), not a public URL.
    // -------------------------------------------------------------------------
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      // Block every form of public access at the bucket and object levels.
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Server-side encryption with S3-managed keys (SSE-S3).
      // Free, zero-config, sufficient for public web assets.
      encryption: s3.BucketEncryption.S3_MANAGED,

      // Versioning lets you roll back if a bad deploy overwrites objects.
      versioned: true,

      // Enforce HTTPS-only access (denies s3:* over plain HTTP).
      enforceSSL: true,

      // Controlled by context flag; defaults to RETAIN for safety.
      removalPolicy,

      // Never auto-delete objects — require explicit manual cleanup.
      autoDeleteObjects: false,
    });

    // -------------------------------------------------------------------------
    // Cache Policies
    //
    // assets/* — Vite outputs content-hashed filenames (e.g. index-BxC2aFkP.js)
    //   so we can cache them aggressively. Browsers will always fetch a new URL
    //   after a deploy, so a 1-year TTL is safe.
    //
    // default (index.html and everything else) — short TTL so that a new deploy
    //   propagates to users within ~60 seconds without a manual invalidation.
    //   We still run an invalidation in deploy-frontend.sh, but this is a safety net.
    // -------------------------------------------------------------------------
    const assetsCachePolicy = new cloudfront.CachePolicy(this, "AssetsCachePolicy", {
      cachePolicyName: "PebbleAssets-LongCache",
      comment: "1-year cache for content-hashed Vite assets (js, css, images)",
      minTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.days(1),      // initial default; browsers respect max-age header
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const defaultCachePolicy = new cloudfront.CachePolicy(this, "DefaultCachePolicy", {
      cachePolicyName: "PebbleDefault-ShortCache",
      comment: "60-second cache for index.html and other non-hashed routes",
      minTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.seconds(60),
      maxTtl: cdk.Duration.seconds(60),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // -------------------------------------------------------------------------
    // CloudFront Distribution
    //
    // S3BucketOrigin.withOriginAccessControl() (CDK ≥ 2.130):
    //   • Creates an OAC resource (replaces legacy OAI)
    //   • Grants cloudfront.amazonaws.com s3:GetObject on the bucket via bucket policy
    //   • No public bucket access is required
    // -------------------------------------------------------------------------
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "Pebble prototype — S3+CloudFront via OAC",

      // The S3 origin uses OAC — the CDK L2 handles policy attachment automatically.
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),

        // Redirect plain HTTP to HTTPS; no HTTP-only viewers allowed.
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

        // Enable gzip + brotli compression at the edge for faster delivery.
        compress: true,

        // GET and HEAD only — this is a static site; no mutations from the CDN.
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,

        // Short TTL for index.html (and any un-hashed assets at the root level).
        cachePolicy: defaultCachePolicy,
      },

      additionalBehaviors: {
        // Vite outputs all bundled assets under /assets/.
        // These filenames include a content hash so they're immutable — use long TTL.
        "/assets/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: assetsCachePolicy,
        },
      },

      // Serve index.html when the viewer requests the root path.
      defaultRootObject: "index.html",

      // -----------------------------------------------------------------------
      // SPA routing: React Router uses the HTML5 History API, so deep links
      // like /dashboard or /settings never map to real S3 keys.
      //
      // When OAC is used (no public bucket), S3 returns 403 (AccessDenied) for
      // missing keys — NOT 404 — so we must handle both codes.
      //
      // We remap both to a 200 + /index.html so React Router can handle routing.
      // TTL of 0 ensures CloudFront never caches error responses (we want the
      // next real invalidation / deploy to be picked up immediately).
      // -----------------------------------------------------------------------
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],

      // CloudFront is a global service; distributions always live in us-east-1
      // internally, but edge caching is worldwide — no region config needed here.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // US, Canada, Europe, Asia, Middle East, Africa
    });

    // -------------------------------------------------------------------------
    // Stack Outputs — used by the deploy-frontend.sh script and visible in the
    // AWS Console under CloudFormation → PebbleHostingStack → Outputs.
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, "CloudFrontDistributionDomainName", {
      value: distribution.distributionDomainName,
      description: "CloudFront distribution domain (use as your site URL)",
      exportName: "PebbleCloudFrontDomain",
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID (needed for cache invalidations)",
      exportName: "PebbleCloudFrontDistributionId",
    });

    new cdk.CfnOutput(this, "S3BucketName", {
      value: siteBucket.bucketName,
      description: "S3 bucket name (target for aws s3 sync)",
      exportName: "PebbleS3BucketName",
    });
  }
}
