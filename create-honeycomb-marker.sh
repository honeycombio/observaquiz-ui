#!/bin/bash

DATASET=browser

SHA=$(git rev-parse HEAD)

echo "Creating honeycomb marker for $SHA"

curl -i -X POST \
  "https://api.honeycomb.io/1/markers/$DATASET" \
  -H 'Content-Type: application/json' \
  -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" \
  -d '{
    "message": "deploy $SHA",
    "type": "deploy"
  }'
