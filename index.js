const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

// This grabs the phone number you type into GitHub Actions
const phoneNumber = process.env.PHONE_NUMBER; 

async function startBot() {
    // This saves your session so you don't have to link it every time
    const { state, saveCreds } = await useMultiFileAuthState('session_folder');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We use pairing code instead of QR
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // If there is no session, generate an 8-digit Pairing Code
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            // Format the code nicely with a dash (e.g., ABCD-1234)
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n======================================================`);
            console.log(`🔥 YOUR PAIRING CODE IS: ${code} 🔥`);
            console.log(`======================================================\n`);
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    // E-Commerce Auto-Reply Logic
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const lowerText = text.toLowerCase();

        let reply = "";

        if (lowerText.includes("price") || lowerText.includes("cost")) {
            reply = "🛍️ Our products range from Rs. 500 to Rs. 5000. Let me know which item you are looking for!";
        } else if (lowerText.includes("shipping") || lowerText.includes("delivery")) {
            reply = "🚚 We offer nationwide delivery! Standard delivery takes 2-3 business days.";
        } else if (lowerText.includes("order") || lowerText.includes("buy")) {
            reply = "🛒 To place an order, please reply with the Product Name/ID, your Delivery Address, and Contact Number.";
        } else if (lowerText.includes("human") || lowerText.includes("agent")) {
            reply = "🧑‍💻 Please wait, I am transferring you to our human support agent. They will reply shortly.";
        } else {
            reply = "👋 Welcome to our Store!\nI am your AI assistant. Try asking me about 'price', 'shipping', or 'how to order'.";
        }

        // Send the reply message to the customer
        if (reply) {
            await sock.sendMessage(sender, { text: reply });
        }
    });
}

startBot();
