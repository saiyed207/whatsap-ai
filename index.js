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
        }
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || 
                      msg.message.extendedTextMessage?.text || 
                      msg.message.imageMessage?.caption || "").toLowerCase();

        // --- SMART LOOP PROTECTOR ---
        // Prevents bot from replying to its own business messages
        const isBotReply = msg.key.fromMe && (text.includes("📧") || text.includes("🛍️") || text.includes("👋"));
        if (msg.key.fromMe && isBotReply) return; 

        console.log(`📩 Customer Query: ${text}`);

        // --- E-COMMERCE BUSINESS LOGIC ---
        
        // 1. GREETINGS
        if (text.includes("hi") || text.includes("hello") || text.includes("hey") || text.includes("start")) {
            await sock.sendMessage(sender, { text: "👋 *Welcome to our JavaGoat Store!* \n\nI am your AI Assistant. You can ask me about prices for *Oil, Rice, Dal, Sugar, or Chocolates*. \n\nHow can I help you today?" });
        }

        // 2. OIL CATEGORY
        else if (text.includes("oil") || text.includes("tel")) {
            await sock.sendMessage(sender, { text: "🌻 *Oil Price List:* \n- Sunflower Oil (1L): Rs. 190\n- Mustard Oil (1L): Rs. 175\n- Soyabean Oil (1L): Rs. 160\n\n_Quality guaranteed!_" });
        }

        // 3. RICE CATEGORY
        else if (text.includes("rice") || text.includes("chawal")) {
            await sock.sendMessage(sender, { text: "🌾 *Rice Price List:* \n- Basmati Rice: Rs. 120/kg\n- Jeera Masino: Rs. 75/kg\n- Long Grain Rice: Rs. 95/kg" });
        }

        // 4. DAL / PULSES
        else if (text.includes("dal") || text.includes("pulses")) {
            await sock.sendMessage(sender, { text: "🍲 *Dal Price List:* \n- Arhar/Toor Dal: Rs. 160/kg\n- Moong Dal: Rs. 140/kg\n- Masoor Dal: Rs. 130/kg" });
        }

        // 5. CHOCOLATES & SNACKS
        else if (text.includes("chocolate") || text.includes("cadbury") || text.includes("biscuit")) {
            await sock.sendMessage(sender, { text: "🍫 *Chocolates & Snacks:* \n- Dairy Milk: Rs. 10 to Rs. 100\n- KitKat: Rs. 20\n- Oreo/Parle-G: Available\n- 5-Star: Rs. 5/10/20" });
        }

        // 6. GENERAL PRICE LIST / EVERYTHING
        else if (text.includes("price") || text.includes("rate") || text.includes("list") || text.includes("items")) {
            await sock.sendMessage(sender, { text: "🛍️ *Daily Requirements Price List:* \n- Sugar: Rs. 48/kg\n- Salt: Rs. 25/pack\n- Tea (250g): Rs. 150\n- Detergent: Rs. 20 to Rs. 200\n\n_Type the item name (e.g. 'Oil') for more details!_" });
        }

        // 7. CONTACT / ORDERING
        else if (text.includes("contact") || text.includes("call") || text.includes("number") || text.includes("order")) {
            await sock.sendMessage(sender, { text: "📞 *Contact & Orders:* \n\n- *Phone:* +918792549215\n- *Email:* saiyedkhan207@gmail.com\n- *Address:* Visit our store for home delivery!" });
        }

        // 8. FALLBACK (If the bot doesn't know the item)
        else {
            await sock.sendMessage(sender, { 
                text: "🤔 *Inquiry Received:* \nI'm sorry, I don't have the current price for that specific item in my database.\n\n📧 *For custom inquiries:* \nPlease email us at *saiyedkhan207@gmail.com* or call/WhatsApp our owner at *+918792549215* for the best rates!" 
            });
        }
    });
}

startBot().catch(err => console.log("Critical Error: " + err));
