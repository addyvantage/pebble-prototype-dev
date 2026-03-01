#!/usr/bin/env bash
# deploy-frontend.sh
#
# Builds the Vite frontend and deploys it to S3 + CloudFront.
#
# Usage:
#   bash infra/scripts/deploy-frontend.sh
#
# Environment variables (all optional — sensible defaults shown):
#   AWS_REGION   — AWS region where the CDK stack was deployed  (default: us-east-1)
#   AWS_PROFILE  — AWS CLI profile to use                       (default: default)
#   STACK_NAME   — CloudFormation stack name                    (default: PebbleHostingStack)
#
# Example (custom region + profile):
#   AWS_REGION=ap-south-1 AWS_PROFILE=my-profile bash infra/scripts/deploy-frontend.sh

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
STACK_NAME="${STACK_NAME:-PebbleHostingStack}"

# Convenience wrapper so every aws CLI call uses the same region + profile.
aws_cmd() {
  aws "$@" --region "$AWS_REGION" --profile "$AWS_PROFILE"
}

# ── Resolve repo root (two directories above this script) ─────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "==> Repo root : $REPO_ROOT"
echo "==> Stack     : $STACK_NAME"
echo "==> Region    : $AWS_REGION"
echo "==> Profile   : $AWS_PROFILE"
echo ""

# ── Fetch CloudFormation stack outputs ────────────────────────────────────────
echo "==> Fetching stack outputs from CloudFormation..."

BUCKET_NAME=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

if [[ -z "$BUCKET_NAME" || -z "$DISTRIBUTION_ID" ]]; then
  echo "ERROR: Could not resolve S3BucketName or CloudFrontDistributionId from stack '$STACK_NAME'."
  echo "       Make sure the stack has been deployed: cd infra && npx cdk deploy"
  exit 1
fi

echo "    Bucket          : $BUCKET_NAME"
echo "    Distribution ID : $DISTRIBUTION_ID"
echo ""

# ── Build the frontend ────────────────────────────────────────────────────────
echo "==> Installing dependencies..."
cd "$REPO_ROOT"
npm ci

echo "==> Building frontend (tsc + vite)..."
npm run build

DIST_DIR="$REPO_ROOT/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "ERROR: Build output directory '$DIST_DIR' not found after build."
  exit 1
fi

# ── Upload to S3 ──────────────────────────────────────────────────────────────
# We use three passes to set correct Cache-Control headers per file type:
#
#  1) index.html  → no-cache so browsers always re-validate (short CDK TTL backs this up)
#  2) /assets/*   → immutable 1-year cache (Vite content-hashes these filenames)
#  3) everything else (e.g. favicons, robots.txt) → 1-hour cache, no-store for HTML
#
# --delete removes files from S3 that no longer exist in dist/ (stale deploy cleanup).

echo "==> Syncing dist/ to s3://$BUCKET_NAME ..."

# Pass 1: index.html (and any other .html files at any level)
aws_cmd s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html; charset=utf-8"

# Pass 2: Vite hashed assets (js, css, wasm, sourcemaps — all under /assets/)
aws_cmd s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
  --exclude "*" \
  --include "assets/*" \
  --cache-control "public, max-age=31536000, immutable"

# Pass 3: Everything else (images, fonts, manifest, robots.txt, etc.)
#          Skip already-handled files.
aws_cmd s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
  --exclude "*.html" \
  --exclude "assets/*" \
  --cache-control "public, max-age=3600"

echo "    Upload complete."
echo ""

# ── Invalidate CloudFront cache ───────────────────────────────────────────────
# Invalidate /* so edge nodes fetch fresh content.
# Note: the first 1,000 paths/month are free; /* counts as one path.
echo "==> Creating CloudFront invalidation for '/*' ..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --profile "$AWS_PROFILE" \
  --query "Invalidation.Id" \
  --output text)

echo "    Invalidation ID : $INVALIDATION_ID"
echo "    (Propagation takes ~30–60 seconds. Use 'aws cloudfront get-invalidation' to check status.)"
echo ""
echo "==> Deploy complete!"

DOMAIN=$(aws_cmd cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionDomainName'].OutputValue" \
  --output text)

echo ""
echo "    Site URL: https://$DOMAIN"
