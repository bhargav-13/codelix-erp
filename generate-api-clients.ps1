Write-Host "Generating API clients from OpenAPI specs..." -ForegroundColor Green

# Create output directory
New-Item -ItemType Directory -Force -Path "src/api-client" | Out-Null

# Generate clients for each contract
Get-ChildItem -Path .\api_contracts\*.yaml | ForEach-Object {
  $filename = $_.BaseName
  Write-Host "Generating API client for $($_.FullName) in .\src\api-client" -ForegroundColor Yellow
  npx openapi-generator-cli generate -i $_.FullName -g javascript -o ".\src\api-client\$filename" --global-property "apis,models,supportingFiles=ApiClient.js,skipDefaultUserAgent=true,apiDocs=false,modelDocs=false,apiTests=false,modelTests=false" --additional-properties "useES6=true"
}

Write-Host "API client generation complete!" -ForegroundColor Green
