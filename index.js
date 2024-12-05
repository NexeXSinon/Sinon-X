const Baileys = require('@whiskeysockets/baileys');
const makeWASocket = Baileys.default;
const { initAuthCreds, proto } = Baileys;
const fs = require('fs');
const path = require('path');

// Path to store authentication state
const authFilePath = path.resolve(__dirname, './auth_info.json');

// Load or initialize authentication state
function loadAuthState() {
    if (fs.existsSync(authFilePath)) {
        return JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));
    }
    return {
        creds: initAuthCreds(),
        keys: {}
    };
}

const authState = loadAuthState();

// Save updated authentication state
function saveAuthState() {
    fs.writeFileSync(authFilePath, JSON.stringify(authState, null, 2));
}

// Update the keys as they are used
function authStateCallback(type, ids) {
    switch (type) {
        case 'creds.update':
            saveAuthState();
            break;
        case 'keys.set':
            for (const [key, value] of Object.entries(ids)) {
                authState.keys[key] = value;
            }
            saveAuthState();
            break;
    }
}

async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: authState,
        authStateCallback,
        printQRInTerminal: true
    });

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            console.log('Connection closed:', lastDisconnect?.error);
            connectToWhatsApp(); // Attempt reconnection
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        console.log('Received a new message:', m.messages[0]);

        const message = m.messages[0];
        const sender = message.key.remoteJid;
        const content = message.message?.conversation || "No content";

        console.log(`Message from ${sender}: ${content}`);

        // Reply to the sender
        if (!message.key.fromMe) {
            await sock.sendMessage(sender, { text: 'Hello! This is an automated reply.' });
        }
    });
}

// Start the WhatsApp connection
connectToWhatsApp();
