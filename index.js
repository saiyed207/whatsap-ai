const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We will handle printing ourselves for better quality
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // If a QR code is generated, display it in the terminal
        if (qr) {
            console.log('--- SCAN THE QR CODE BELOW ---');
            qrcode.generate(qr, { small: true });
            console.log('--- QR CODE EXPIRES SOON ---');
        }

        if (connection === 'open') {
            console.log('✅ BOT CONNECTED SUCCESSFULLY!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // E-Commerce AI Logic
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        let reply = "";
        if (text.includes("price")) {
            reply = "🛍️ Items start from Rs. 500!";
        } else if (text.includes("order")) {
            reply = "🛒 Send your Name and Address to order.";
        } else if (text.includes("hi") || text.includes("hello")) {
            reply = "👋 Welcome to our E-commerce store! Ask me about 'price' or 'order'.";
        }

        if (reply) {
            await sock.sendMessage(sender, { text: reply });
        }
    });
}

startBot();
