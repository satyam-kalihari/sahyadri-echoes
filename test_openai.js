const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let openaiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    if (match) {
        openaiKey = match[1].trim();
        console.log("OpenAI Key found (length: " + openaiKey.length + ")");
    } else {
        console.error("OPENAI_API_KEY not found in .env.local");
        process.exit(1);
    }
} catch (err) {
    console.error("Error reading .env.local:", err);
    process.exit(1);
}

const data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello!" }
    ],
    max_tokens: 50
});

const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Sending request to OpenAI...`);

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            if (parsed.choices && parsed.choices.length > 0) {
                console.log('RESPONSE: ' + parsed.choices[0].message.content);
            } else {
                console.log('BODY: ' + body);
            }
        } catch (e) {
            console.log('BODY: ' + body);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
