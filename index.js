const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');

// Path to store authentication state
const { state, saveState } = useSingleFileAuthState(path.resolve(__dirname, './auth_info.json'));

async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: state, // Use the saved authentication state
        printQRInTerminal: true // Display QR code in the terminal
    });

    // Save authentication state to a file on updates
    sock.ev.on('creds.update', saveState);

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log('Reconnecting...');
                connectToWhatsApp();
            } else {
                console.log('Logged out or connection closed. Please restart.');
            }
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
