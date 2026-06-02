import { readdirSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename, extname } from 'path';

const contractsDir = './api_contracts';
const outputDir = './src/api-client';

console.log("Generating API clients from OpenAPI specs...");

if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
}

if (existsSync(contractsDir)) {
    const files = readdirSync(contractsDir).filter(file => extname(file) === '.yaml');

    files.forEach(file => {
        const filename = basename(file, '.yaml');
        const filePath = join(contractsDir, file);
        const outputPath = join(outputDir, filename);

        console.log(`Generating API client for ${filePath} in ${outputPath}`);

        const command = `npx openapi-generator-cli generate -i "${filePath}" -g javascript -o "${outputPath}" --global-property "apis,models,supportingFiles=ApiClient.js,skipDefaultUserAgent=true,apiDocs=false,modelDocs=false,apiTests=false,modelTests=false" --additional-properties "useES6=true"`;

        try {
            execSync(command, { stdio: 'inherit' });
        } catch (error) {
            console.error(`Failed to generate client for ${file}:`, error);
            process.exit(1);
        }
    });
} else {
    console.log("No api_contracts directory found.");
}

console.log("API client generation complete!");
