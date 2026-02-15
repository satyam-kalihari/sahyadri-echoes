const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let hfToken = '';
const logFile = path.join(__dirname, 'test_output.txt');

// Clear log file
fs.writeFileSync(logFile, '');

function log(message) {
    console.log(message);
    fs.appendFileSync(logFile, message + '\n');
}

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/HF_TOKEN=(.+)/);
    if (match) {
        hfToken = match[1].trim();
        log("HF Token found (length: " + hfToken.length + ")");
    } else {
        log("HF_TOKEN not found in .env.local");
        process.exit(1);
    }
} catch (err) {
    log("Error reading .env.local: " + err);
    process.exit(1);
}

const models = [
    "mistralai/Mistral-7B-Instruct-v0.2",
    "gpt2",
    "HuggingFaceH4/zephyr-7b-beta"
];

const prompt = "Hello there";

async function testEndpoint(endpointName, hostname, pathPrefix, model) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            inputs: prompt,
            options: { wait_for_model: true }
        });

        // Ensure path starts with / and no double slashes
        const fullPath = `${pathPrefix}/${model}`.replace(/\/\//g, '/');

        const options = {
            hostname: hostname,
            path: fullPath,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        log(`\n----------------------------------------`);
        log(`Testing ${endpointName} | Model: ${model}`);
        log(`URL: https://${hostname}${fullPath}`);

        const req = https.request(options, (res) => {
            log(`STATUS: ${res.statusCode}`);
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                log(`BODY: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            log(`ERROR: ${e.message}`);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

(async () => {
    // 1. Router Endpoint (User's current)
    log("=== Testing Router Endpoint ===");
    for (const model of models) {
        await testEndpoint("Router", "router.huggingface.co", "/hf-inference/models", model);
    }

    // 2. Standard Inference API
    log("\n=== Testing Standard Inference API ===");
    for (const model of models) {
        await testEndpoint("Standard", "api-inference.huggingface.co", "/models", model);
    }
})();
