#!/bin/bash

echo "Generating API clients from OpenAPI specs..."

# Create output directory
mkdir -p src/api-client

# Generate clients for each contract
for file in api_contracts/*.yaml; do
  filename=$(basename "$file" .yaml)
  echo "Generating API client for $file in ./src/api-client"
  npx openapi-generator-cli generate -i "$file" -g javascript -o "./src/api-client/$filename" --global-property "apis,models,supportingFiles=ApiClient.js,skipDefaultUserAgent=true,apiDocs=false,modelDocs=false,apiTests=false,modelTests=false" --additional-properties "useES6=true"
done

echo "API client generation complete!"
