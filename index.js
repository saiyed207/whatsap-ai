const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs-extra');

async function startBot() {
    // 1. Setup Session Storage
    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version } = await fetchLatestBaileysVersion();

    // 2. Initialize Connection
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We handle printing manually for small size
        logger: pino({ level: 'silent' }), // Hide messy background logs
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 3. Monitor Connection Status
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log('\n📱 --- SCAN THIS QR CODE --- 📱');
            console.log('Use "Desktop Site" & Zoom OUT for best results\n');
            qrcode.generate(qr, { small: true });
            console.log('\n----------------------------------');
        }

        if (connection === 'open') {
            console.log('✅ AI AGENT IS ONLINE AND CONNECTED!');
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Connection Closed. Reason: ${reason}`);
            
            // Reconnect if not manually logged out
            if (reason !== DisconnectReason.loggedOut) {
                console.log('🔄 Reconnecting...');
                startBot();
            } else {
                console.log('⚠️ Logged out. Please delete "session_data" folder and scan again.');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 4. AI E-COMMERCE LOGIC
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        // Automatic Replies
        if (text.includes("price") || text.includes("cost")) {
            await sock.sendMessage(sender, { text: "🛍️ *Price List:* \n- Product A: Rs. 1000\n- Product B: Rs. 2500\n\n_To order, reply with 'Order'._" });
        } 
        else if (text.includes("order")) {
            await sock.sendMessage(sender, { text: "🛒 *How to Order:* \nPlease send your Name, Full Address, and Mobile Number. Our team will call you!" });
        }
        else if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
            await sock.sendMessage(sender, { text: "👋 *Hello!* Welcome to our Store.\n\nI am your AI Assistant. You can ask me about:\n1. *Price*\n2. *Order*\n3. *Shipping*" });
        }
        else if (text.includes("shipping") || text.includes("delivery")) {
            await sock.sendMessage(sender, { text: "🚚 We deliver within 24-48 hours across the city! Delivery fee is Rs. 100." });
        }
    });
}

// Start the application
startBot().catch(err => console.log("Critical Error: " + err));
