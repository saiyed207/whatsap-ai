const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

// 🌟 1. IMPORT OFFICIAL FIREBASE 🌟
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, push, set } = require("firebase/database");

// 🌟 2. PASTE YOUR FIREBASE CONFIG HERE 🌟
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const orderStates = {}; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser:["S", "K", "1"] 
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.clear(); 
            console.log('\n==================================================');
            console.log('⚠️ QR CODE TOO BIG? DO THIS ON YOUR DESKTOP:');
            console.log('1. Click the ⚙️ (Gear Icon) in the top right.');
            console.log('2. Click "View raw logs".');
            console.log('==================================================\n');
            qrcode.generate(qr, { small: true }); 
        }

        if (connection === 'open') console.log('✅ KIRANA SHOP AI IS ONLINE!');
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
        if (msg.key.fromMe) return; // Loop Protection

        const sender = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        console.log(`📩 Query: ${text}`);

        // --- 🛒 STEP 2: FINISHING THE ORDER & FIREBASE SAVE ---
        
        // Check if customer is typing their Address for an existing order
        if (orderStates[sender]?.step === 'WAITING_FOR_ADDRESS') {
            const customerAddress = text;
            const customerProduct = orderStates[sender].product;
            const customerPhone = sender.split('@')[0];

            // Save to Official Firebase Database
            try {
                const orderRef = push(ref(db, 'orders'));
                await set(orderRef, {
                    phone: customerPhone,
                    product: customerProduct,
                    address: customerAddress,
                    time: new Date().toLocaleString()
                });
            } catch (error) {
                console.log("Firebase Error: ", error);
            }

            await sock.sendMessage(sender, { text: `✅ *Order Confirmed!* \n\nThank you! Your order for *${customerProduct}* has been recorded and will be delivered to your address within *1 hour*.` });
            delete orderStates[sender]; // Clear memory so they can order again
            return;
        }

        // --- KIRANA BUSINESS LOGIC ---
        
        // 🌟 MOVED TO TOP: START THE ORDER FLOW
        if (text.startsWith("order ")) {
            const productRequested = text.replace("order ", "").trim(); // Extracts the product name
            orderStates[sender] = { step: 'WAITING_FOR_ADDRESS', product: productRequested };
            await sock.sendMessage(sender, { text: `🛒 *Let's place your order!* \n\nYou want to order: *${productRequested}*\n\nPlease reply with your *Full Name* and *Delivery Address*.` });
        }
        else if (text === "order") { // Just in case they type ONLY "order" without a product
            await sock.sendMessage(sender, { text: "🛒 *How to order:* \nPlease type 'order' followed by the item name. \nExample: *order 5kg rice*" });
        }
        
        // NORMAL INQUIRIES
        else if (text.includes("hi") || text.includes("hello") || text.includes("hey") || text.includes("start")) {
            await sock.sendMessage(sender, { text: "👋 *Welcome to our Kirana Store!* \n\nI am your AI Assistant. You can ask me about prices for *Oil, Rice, Dal, Sugar, or Chocolates*. \n\nHow can I help you today?" });
        }
        else if (text.includes("oil") || text.includes("tel")) {
            await sock.sendMessage(sender, { text: "🌻 *Oil Price List:* \n- Sunflower Oil (1L): Rs. 190\n- Mustard Oil (1L): Rs. 175\n- Soyabean Oil (1L): Rs. 160" });
        }
        else if (text.includes("rice") || text.includes("chawal")) {
            await sock.sendMessage(sender, { text: "🌾 *Rice Price List:* \n- Basmati Rice: Rs. 120/kg\n- Jeera Masino: Rs. 75/kg\n- Long Grain Rice: Rs. 95/kg" });
        }
        else if (text.includes("dal") || text.includes("pulses")) {
            await sock.sendMessage(sender, { text: "🍲 *Dal Price List:* \n- Arhar/Toor Dal: Rs. 160/kg\n- Moong Dal: Rs. 140/kg\n- Masoor Dal: Rs. 130/kg" });
        }
        else if (text.includes("chocolate") || text.includes("cadbury") || text.includes("biscuit")) {
            await sock.sendMessage(sender, { text: "🍫 *Chocolates & Snacks:* \n- Dairy Milk: Rs. 10 to Rs. 100\n- KitKat: Rs. 20\n- Oreo/Parle-G: Available" });
        }
        else if (text.includes("price") || text.includes("rate") || text.includes("list")) {
            await sock.sendMessage(sender, { text: "🛍️ *Daily Rates:* \n- Sugar: Rs. 48/kg\n- Salt: Rs. 25/pack\n- Tea (250g): Rs. 150\n\n_Type the item name (like 'Oil') for details!_" });
        }
        else if (text.includes("contact") || text.includes("call") || text.includes("email")) {
            await sock.sendMessage(sender, { text: "📞 *Contact Info:* \n\n- *Phone:* +918792549215\n- *Email:* saiyedkhan207@gmail.com\n- *Owner:* Saiyed Khan" });
        }
        else {
            await sock.sendMessage(sender, { text: "🤔 *Inquiry Received:* \nI am not sure about the price of that item yet.\n\n📧 *Please contact us directly:* \nEmail: *saiyedkhan207@gmail.com*\nPhone: *+918792549215*" });
        }
    });
}

startBot().catch(err => console.log("Error: " + err));
