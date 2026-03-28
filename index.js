const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.clear();
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.log('✅ AI AGENT IS ONLINE!');
            console.log('Keep this window open. Now send a message from a DIFFERENT phone.');
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // --- MESSAGE LISTENER ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;
        // Get text from any type of message
        const text = (msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || "").toLowerCase();

        // 🟢 DEBUG LOG: This will show in GitHub Actions when you send a message
        console.log(`📩 Received message from [${sender}]: ${text}`);

        // If you are testing from the SAME number, we will allow it just for this test
        // Remove "if (msg.key.fromMe) return;" for testing yourself
        
        if (text.includes("hi") || text.includes("hello")) {
            console.log("🤖 Sending Reply: Welcome message...");
            await sock.sendMessage(sender, { text: "👋 *Hello!* This is my AI Agent working from GitHub!" });
        } 
        else if (text.includes("price")) {
            console.log("🤖 Sending Reply: Price list...");
            await sock.sendMessage(sender, { text: "🛍️ *Prices:* \n- Product A: Rs. 1000\n- Product B: Rs. 2000" });
        }
    });
}

startBot().catch(err => console.log(err));
