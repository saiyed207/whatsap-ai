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
            console.log('📱 --- SCAN FOR KIRANA STORE AI --- 📱');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'open') {
            console.log('✅ KIRANA SHOP AI IS ONLINE!');
            console.log('📢 TEST NOW: Send a message from a DIFFERENT phone number.');
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        // 1. Basic checks to prevent errors
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        // 2. 🛑 STRICT LOOP PROTECTION 🛑
        // This stops the bot from responding to itself or you typing to yourself.
        // YOU MUST TEST FROM A DIFFERENT PHONE NUMBER.
        if (msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || "").toLowerCase();

        console.log(`📩 New Message from Customer: ${text}`);

        // --- KIRANA BUSINESS LOGIC ---
        
        // GREETINGS
        if (text.includes("hi") || text.includes("hello") || text.includes("hey") || text.includes("start")) {
            await sock.sendMessage(sender, { text: "👋 *Welcome to our Kirana Store!* \n\nI am your AI Assistant. You can ask me about prices for *Oil, Rice, Dal, Sugar, or Chocolates*. \n\nHow can I help you today?" });
        }

        // OIL
        else if (text.includes("oil") || text.includes("tel")) {
            await sock.sendMessage(sender, { text: "🌻 *Oil Price List:* \n- Sunflower Oil (1L): Rs. 190\n- Mustard Oil (1L): Rs. 175\n- Soyabean Oil (1L): Rs. 160" });
        }

        // RICE
        else if (text.includes("rice") || text.includes("chawal")) {
            await sock.sendMessage(sender, { text: "🌾 *Rice Price List:* \n- Basmati Rice: Rs. 120/kg\n- Jeera Masino: Rs. 75/kg\n- Long Grain Rice: Rs. 95/kg" });
        }

        // DAL
        else if (text.includes("dal") || text.includes("pulses")) {
            await sock.sendMessage(sender, { text: "🍲 *Dal Price List:* \n- Arhar/Toor Dal: Rs. 160/kg\n- Moong Dal: Rs. 140/kg\n- Masoor Dal: Rs. 130/kg" });
        }

        // CHOCOLATES
        else if (text.includes("chocolate") || text.includes("cadbury") || text.includes("biscuit")) {
            await sock.sendMessage(sender, { text: "🍫 *Chocolates & Snacks:* \n- Dairy Milk: Rs. 10 to Rs. 100\n- KitKat: Rs. 20\n- Oreo/Parle-G: Available" });
        }

        // GENERAL RATES
        else if (text.includes("price") || text.includes("rate") || text.includes("list")) {
            await sock.sendMessage(sender, { text: "🛍️ *Daily Rates:* \n- Sugar: Rs. 48/kg\n- Salt: Rs. 25/pack\n- Tea (250g): Rs. 150\n\n_Type the item name (like 'Oil') for details!_" });
        }

        // CONTACT / ORDER
        else if (text.includes("contact") || text.includes("call") || text.includes("order") || text.includes("email")) {
            await sock.sendMessage(sender, { text: "📞 *Contact Info:* \n\n- *Phone:* +918792549215\n- *Email:* saiyedkhan207@gmail.com\n- *Owner:* Saiyed Khan" });
        }

        // FALLBACK (If item is unknown)
        else {
            await sock.sendMessage(sender, { 
                text: "🤔 *Inquiry Received:* \nI am not sure about the price of that item yet.\n\n📧 *Please contact us directly:* \nEmail: *saiyedkhan207@gmail.com*\nPhone: *+918792549215*" 
            });
        }
    });
}

startBot().catch(err => console.log("Error: " + err));
