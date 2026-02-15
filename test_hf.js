const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let hfToken = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/HF_TOKEN=(.+)/);
    if (match) {
        hfToken = match[1].trim();
        console.log("Token found (length: " + hfToken.length + ")");
    } else {
        console.error("HF_TOKEN not found in .env.local");
        process.exit(1);
    }
} catch (err) {
    console.error("Error reading .env.local:", err);
    process.exit(1);
}

const model = "microsoft/Phi-3-mini-4k-instruct";
const data = JSON.stringify({
    inputs: "[INST] Hello, who are you? [/INST]",
    parameters: {
        max_new_tokens: 50,
        temperature: 0.7,
        return_full_text: false,
    }
});

const options = {
    hostname: 'api-inference.huggingface.co',
    path: `/models/${model}`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Sending request to ${model}...`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('BODY: ' + body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
