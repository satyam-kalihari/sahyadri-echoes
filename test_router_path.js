const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let hfToken = '';
const logFile = path.join(__dirname, 'test_output_2.txt');

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

const model = "mistralai/Mistral-7B-Instruct-v0.2";
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
        log(`Testing ${endpointName}`);
        log(`URL: https://${hostname}${fullPath}`);

        const req = https.request(options, (res) => {
            log(`STATUS: ${res.statusCode}`);
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                const preview = body.length > 500 ? body.substring(0, 500) + "..." : body;
                log(`BODY: ${preview}`);
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
    // 1. Router without /hf-inference
    await testEndpoint("Router (Simple Path)", "router.huggingface.co", "/models", model);

    // 2. Just in case, try v1/chat/completions style for router? (Unlikely for generic model endpoint)
    // skipping for now.
})();
