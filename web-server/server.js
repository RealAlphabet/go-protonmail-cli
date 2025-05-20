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

// Storage directories
const TIMERS_DIR = 'timers';
const NOTES_DIR = 'notes';

// Créer les dossiers s'ils n'existent pas
for (const dir of [TIMERS_DIR, NOTES_DIR]) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
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
app.get('/api/timer/:id', (req, res) => {
    const timerId = req.params.id;
    const timerFile = path.join(TIMERS_DIR, `${timerId}.json`);

    try {
        if (fs.existsSync(timerFile)) {
            res
                .type('application/json')
                .send(fs.readFileSync(timerFile, 'utf8'));
        } else {
            res.status(404).json({ error: 'Timer not found' });
        }
    } catch (error) {
        console.error(`Error reading timer ${timerId}:`, error);
        res.status(500).json({ error: 'Failed to read timer data' });
    }
});

app.post('/api/timer/:id', (req, res) => {
    const timerId = req.params.id;
    const timerFile = path.join(TIMERS_DIR, `${timerId}.json`);

    try {
        fs.writeFileSync(timerFile, JSON.stringify(req.body));
        res.json({ success: true });
    } catch (error) {
        console.error(`Error saving timer ${timerId}:`, error);
        res.status(500).json({ error: 'Failed to save timer data' });
    }
});

// Notes API routes
app.get('/api/notes', (req, res) => {
    try {
        const notes = fs.readdirSync(NOTES_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, file), 'utf8'));
                return {
                    id: path.basename(file, '.json'),
                    title: content.title,
                    updatedAt: content.updatedAt
                };
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);

        res.json(notes);
    } catch (error) {
        console.error('Error reading notes:', error);
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

app.get('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    const noteFile = path.join(NOTES_DIR, `${noteId}.json`);

    try {
        if (fs.existsSync(noteFile)) {
            res.type('application/json').send(fs.readFileSync(noteFile, 'utf8'));
        } else {
            res.status(404).json({ error: 'Note not found' });
        }
    } catch (error) {
        console.error(`Error reading note ${noteId}:`, error);
        res.status(500).json({ error: 'Failed to read note' });
    }
});

app.post('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    const noteFile = path.join(NOTES_DIR, `${noteId}.json`);

    try {
        const noteData = {
            ...req.body,
            updatedAt: Date.now()
        };
        fs.writeFileSync(noteFile, JSON.stringify(noteData, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error(`Error saving note ${noteId}:`, error);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.resolve("dist", "index.html"));
});

// Start server
app.listen(port, () => {
    console.log(`Web server running on http://localhost:${port}`);
});
