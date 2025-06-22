#!/bin/bash

# Create a deployment marker in Honeycomb for the UI deploy
# This script should be run after a successful deployment

set -e

# Get git commit info
ref=$(git rev-parse HEAD | cut -c1-10)
full_sha=$(git rev-parse HEAD)

# Get build info if available
if [[ -f "src/tracing/build_info.tmp.ts" ]]; then
    build_uuid=$(grep 'build.uuid' src/tracing/build_info.tmp.ts | cut -d'"' -f4)
    build_hostname=$(grep 'build.hostname' src/tracing/build_info.tmp.ts | cut -d'"' -f4)
    message="UI Deploy - ref:$ref uuid:$build_uuid host:$build_hostname"
else
    message="UI Deploy - ref:$ref"
fi

# Create the JSON body for the marker
body=$(echo '{"message":"'$message'", "type":"deploy"}')

# Use observaquiz-browser dataset (matches the UI/frontend service)
dataset="observaquiz-browser"

echo "Creating deployment marker..."
echo "Dataset: $dataset"
echo "Message: $message"

# Create the marker using the API key from environment
curl https://api.honeycomb.io/1/markers/${dataset} -X POST \
    -H "X-Honeycomb-Team: ${HONEYCOMB_MARKER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$body"

echo ""
echo "Deployment marker created successfully!"
