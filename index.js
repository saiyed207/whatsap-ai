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
            console.log('📱 --- SCAN NEW QR CODE --- 📱');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.log('✅ AI AGENT IS ONLINE AND LOOP-PROTECTED!');
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;

        // 🛑 THE LOOP PROTECTOR 🛑
        // This stops the bot from replying to itself
        if (msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || "").toLowerCase();

        // Log the customer message to GitHub Terminal
        console.log(`📩 Customer [${sender}] said: ${text}`);

        // --- AI RESPONSES ---
        if (text.includes("hi") || text.includes("hello")) {
            await sock.sendMessage(sender, { text: "👋 *Hello!* Welcome to our Store. How can I help you today?" });
        } 
        else if (text.includes("price") || text.includes("cost")) {
            await sock.sendMessage(sender, { text: "🛍️ *Our Prices:* \n- Item A: Rs. 500\n- Item B: Rs. 1200\n\nReply with 'Order' to buy!" });
        }
        else if (text.includes("order")) {
            await sock.sendMessage(sender, { text: "🛒 *Order Confirmed!* Please send your address." });
        }
    });
}

startBot().catch(err => console.log("Error: " + err));
