import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import path, { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('dist'));

// Timer data storage
const TIMER_DATA_FILE = 'timer-data.json';
let timerData = { startTime: 0, lastCheckpoint: 0, isRunning: false, checkpoints: [] };

// Load timer data if exists
try {
    if (fs.existsSync(TIMER_DATA_FILE)) {
        timerData = JSON.parse(fs.readFileSync(TIMER_DATA_FILE, 'utf8'));
    }
} catch (error) {
    console.error('Error loading timer data:', error);
}

// Load protobuf
const PROTO_PATH = resolve(__dirname, '../proto/protonmail.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const client = new protoDescriptor.protonmail.ProtonmailService(
    'unix:///tmp/protonmail.sock',
    grpc.credentials.createInsecure()
);

// Routes
app.post('/api/login', (req, res) => {
    const { username, password, captchaToken, totpCode, totpSecret } = req.body;
    
    client.Login({
        username,
        password,
        captchaToken,
        totpCode,
        totpSecret
    }, (err, response) => {
        console.error(err, response);
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (response.error) {
            res.status(400).json(response);
            return;
        }

        res.json(response.success);
    });
});

app.post('/api/logout', (req, res) => {
    const { sessionId } = req.body;
    
    client.Logout({ session_id: sessionId }, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(response);
    });
});

app.get('/api/emails', (req, res) => {
    const { sessionId, page = 0 } = req.query;
    
    client.FetchEmails({
        session_id: sessionId,
        page_index: parseInt(page),
        page_size: 50
    }, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(response);
    });
});

app.get('/api/emails/:id', (req, res) => {
    const { sessionId } = req.query;
    const { id } = req.params;
    
    client.FetchEmailByID({
        session_id: sessionId,
        email_id: id
    }, (err, response) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(response);
    });
});

// Timer API routes
app.get('/api/timer', (req, res) => {
    res.json(timerData);
});

app.post('/api/timer', (req, res) => {
    timerData = req.body;
    // Save to file
    fs.writeFileSync(TIMER_DATA_FILE, JSON.stringify(timerData));
    res.json({ success: true });
});

app.get("*", (req, res) => {
    res.sendFile(path.resolve("dist", "index.html"));
});

// Start server
app.listen(port, () => {
    console.log(`Web server running on http://localhost:${port}`);
});
