const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function startBot() {
    // auth_info stores the session after you scan
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 --- SCAN THIS SMALL QR CODE --- 📱\n');
            // {small: true} uses special characters to make it 50% smaller
            qrcode.generate(qr, { small: true });
            console.log('\n----------------------------------\n');
            console.log('TIP: If it looks messy, zoom OUT your browser or turn phone to Landscape.');
        }

        if (connection === 'open') {
            console.log('✅ BOT CONNECTED!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Simple Auto-Reply
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        if (text.includes("price")) {
            await sock.sendMessage(sender, { text: "🛍️ Shop Items: Rs. 500 - Rs. 5000" });
        } else if (text.includes("hi") || text.includes("hello")) {
            await sock.sendMessage(sender, { text: "👋 Hello! I am your AI Business Agent." });
        }
    });
}

startBot();
