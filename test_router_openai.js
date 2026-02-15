const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let hfToken = '';
const logFile = path.join(__dirname, 'test_output_3.txt');

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
// const model = "gpt2"; // gpt2 is not a chat model, might fail on chat/completions

async function testEndpoint() {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            model: model,
            messages: [
                { role: "user", content: "What is the capital of France?" }
            ],
            max_tokens: 100
        });

        const options = {
            hostname: "router.huggingface.co",
            path: "/v1/chat/completions",
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        log(`\n----------------------------------------`);
        log(`Testing Router (OpenAI Compatible) | Model: ${model}`);
        log(`URL: https://router.huggingface.co/v1/chat/completions`);

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
    await testEndpoint();
})();
