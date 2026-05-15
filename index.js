const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal'); // استدعاء مكتبة الـ QR البديلة عشان تشتغل في رندر غصب

// --- إعدادات القاعدة ---
let db = { users: {}, groupSettings: {}, lastAnswer: {} };
if (fs.existsSync('./database.json')) db = fs.readJsonSync('./database.json');
const saveDB = () => fs.writeJsonSync('./database.json', db);

// --- نظام الرتب (النسخة الكاملة) ---
const getRole = (p) => {
    if (p >= 20000) return "👑┃مـلـك الأوتـاكـو الأزمـلـي";
    if (p >= 15000) return "🔱┃إمـبـراطـور الـبـحـار الـسـبـع";
    if (p >= 10000) return "🧭┃أدمـيـرال الأسطول";
    if (p >= 8000)  return "⛩️┃الـعـمـيـد الأسطوري";
    if (p >= 5000)  return "🧧┃تـشـيبـوكـاي مـهـيـب";
    if (p >= 3000)  return "🪄┃مـلـازم أول الـفـيـلـق";
    if (p >= 1500)  return "📯┃حـامـل بـيـرق الـحـرب";
    if (p >= 800)   return "🏴┃حـامـل رايـة الـمـجـد";
    if (p >= 400)   return "💂🏻‍♀️┃مـشـرف مـتـدرب";
    return "🛡️┃مـجـنـد جـديـد";
};

// --- بنك الشخصيات العملاق (أكثر من 1000 شخصية للالعاب) ---
const bigBank = [
    "لوفي", "زورو", "سانجي", "نامي", "روبين", "تشوبر", "فرانكي", "بروك", "جينبي", "ايس", "شانكس", "ميهوك", "بكا", "تيتش", "كايدو", "لينلين", "كاتاكوري", "دوفلامينجو", "لاو", "كيد", "سابو", "دراغون", "غارب", "سينجوكو", "أكاينو", "كيزارو", "أوكيجي", "فوجيتورا", "ريوكوغيو", "هانكوك", "باجي", "كروكودايل", "رالي", "بين بيكمان", "ياسوب", "روكس", "روجير", "شيريو", "ماركو", "بيستا", "جوزو", "تيتش", "كوزان", "سموكر", "تاشيجي", "كوبي", "هيرميبو",
    "ناروتو", "ساسكي", "ساكورا", "كاكاشي", "إيتاتشي", "شيسوي", "أوبيتو", "مادارا", "هاشيراما", "توبيراما", "هيروزين", "ميناتو", "تسونادي", "جيرايا", "أوروتشيمارو", "قارا", "باين", "كونان", "إيتاتشي", "كيسامي", "هيدان", "كاكوزو", "دييدارا", "ساسوري", "زيتسو", "توبي", "كيلر بي", "الرايكاجي", "ميزوكاجي", "تسو كاجي", "بوروتو", "سارادا", "ميتسوكي", "كاواكي", "كود", "إيشيكي", "موموشيكي",
    "إيتشيغو", "روكيا", "أوراهارا", "يورويتشي", "بياكويا", "رينجي", "توشيرو", "كينباتشي", "آيزن", "جين", "توسين", "أولكيورا", "غريمجو", "نيل", "ستارك", "هاليبيل", "باراغان", "نويترا", "ياماماتو", "كيوراكو", "أوكيتامي", "شينجي", "يوها باخ", "هاشفالت", "أسكين", "بامبييتا",
    "سوكونا", "قوجو", "يوجي", "ميغومي", "نوبارا", "ماكي", "اينوماري", "باندا", "نانامي", "جيتو", "ماهيتو", "جوجو", "توجي", "يوتا", "تنجن", "كينجاكو", "أوراومي",
    "إيرين", "ميكاسا", "أرمين", "ليفاي", "اروين", "هانجي", "جان", "كوني", "ساشا", "راينر", "بيرتولت", "آني", "فالكو", "غابي", "زيكي", "بييك", "بوركو", "مارسيل", "ويمير", "فريتز",
    "أستا", "يونو", "نويل", "يامي", "شارلوت", "فويغوليون", "نوزيل", "ويليام", "ميريوليونا", "جوليوس", "ليخت", "لوميير", "سيكي", "ماغنا", "لاك", "غوش", "فانيسا", "فينرال",
    "غون", "كيلوا", "كورابيكا", "ليوريو", "هيسوكا", "إيلومي", "نيتيرو", "ميرويم", "بيتو", "بوف", "يوبي", "تشوللو", "فينكس", "فيتان", "ماتشي", "باكونودا", "نوبوناغا", "أوفو",
    "تانجيرو", "نيزوكو", "زينيتسو", "إينوسكي", "رينغوكو", "توميوكا", "شينوبو", "ميتسوري", "أوباناي", "سانيمي", "غيومي", "مويتيرو", "يوريتشي", "موزان", "أكازا", "دوما", "كوكوشيبو"
];

// --- بنك الأسئلة والمقولات (موسوعة كاملة) ---
const animeQuizzes = [
    { q: "من هو مبرمج يوكي؟", a: "ليفاي" },
    { q: "ما هو حلم لوفي؟", a: "ملك القراصنة" },
    { q: "من هو وميض كونوها الأصفر？", a: "ميناتو" },
    { q: "من قتل عائلة إيتاتشي؟", a: "إيتاتشي" },
    { q: "ما اسم سيف ميهوك الأسطوري؟", a: "يورو" },
    { q: "من هو ملك اللعنات؟", a: "سوكونا" },
    { q: "من هو أقوى سياف في العالم؟", a: "ميهوك" },
    { q: "ما اسم فاكهة الشيطان الخاصة بـ لاو؟", a: "العمليات" },
    { q: "من هو مؤسس نينجا كونوها؟", a: "هاشيراما" },
    { q: "ما اسم السلاح الأسطوري الذي يملكه بوزيدون؟", a: "شيراهوشي" },
    { q: "من هو صاحب مقولة: عدم الاستسلام هو سحري؟", a: "أستا" },
    { q: "ما اسم التحول الأخير لـ إيرين؟", a: "العملاق المؤسس" },
    { q: "من هو مدرب ناروتو الأول？", a: "ايروکا" },
    { q: "من هو قائد الفرقة العاشرة في بليتش؟", a: "توشيرو" },
    { q: "ما اسم والد غون؟", a: "جين" },
    { q: "من هو السياف الذي يستخدم 3 سيوف؟", a: "زورو" },
    { q: "ما اسم المنظمة التي ينتمي إليها إيتاتشي؟", a: "الأكاتسكي" }
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_yuki');
    
    // تم إلغاء الخيار القديم وإعداد السيرفر ليعمل بصمت وأمان
    const sock = makeWASocket({ 
        auth: state, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false 
    });
    
    sock.ev.on('creds.update', saveCreds);

    // --- توليد وطباعة الـ QR كود البديل في الـ Logs بنجاح ---
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('=== 🌸 مسح الـ QR كود الخاص بـ يوكي 🌸 ===');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ تم تشغيل إمبراطورية يوكي بنجاح واكتمل الاتصال!');
        }
    });

    // --- نظام الترحيب والوداع التفاعلي ---
    sock.ev.on('group-participants.update', async (anu) => {
        const from = anu.id;
        const user = anu.participants[0];
        if (anu.action === 'add') {
            await sock.sendMessage(from, { text: `✨ *مرحباً بك يا بطل @${user.split('@')[0]} في إمبراطوريتنا!*\nأنرت المكان بقدومك.. استمتع معنا ومع يوكي 🌸💖`, mentions: [user] });
        } else if (anu.action === 'remove') {
            await sock.sendMessage(from, { text: `💔 *وداعاً @${user.split('@')[0]}..*\nسنفتقد وجودك بيننا، نتمنى لك حظاً موفقاً! 🌸✨`, mentions: [user] });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]; if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        const pushName = m.pushName || "أحد الأبطال";
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();

        if (!db.users[sender]) db.users[sender] = { points: 500, inventory: [], lastSalary: 0 };
        if (!db.groupSettings[from]) db.groupSettings[from] = { closed: false };
        let user = db.users[sender];

        // --- الردود التفاعلية والذكاء ---
        if (text === ".") return sock.sendMessage(from, { text: `لبيه يا قائد ليفاي؟ يوكي تسمعك بكل فخر! 🌸` });
        if (text.toLowerCase().includes("سلام عليكم")) await sock.sendMessage(from, { text: "وعليكم السلام والرحمة! نورت القروب يا بطل ✨🌸" });

        // --- نظام التحقق الذكي من الإجابات ---
        if (db.lastAnswer[from] && !text.startsWith('.')) {
            const entry = db.lastAnswer[from];
            let isCorrect = false;

            if (entry.options) {
                const optIdx = parseInt(text) - 1;
                if (entry.options[optIdx] === entry.answer || text === entry.answer) isCorrect = true;
            } else if (text === entry.answer) {
                isCorrect = true;
            }

            if (isCorrect) {
                delete db.lastAnswer[from];
                await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
                await sock.sendMessage(from, { text: `⏳ *يوكي تدقق وتطابق البيانات في الأرشيف الإمبراطوري الضخم..*` });
                setTimeout(async () => {
                    user.points += 1000;
                    await sock.sendMessage(from, { text: `🎉 *أبدعت يا ${pushName}!* إجابة صحيحة ومذهلة.\n💰 +1000 نقطة ذهبية.\n👤 المسؤول: ${entry.host}` });
                    saveDB();
                }, 1500);
            } else {
                await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
            }
            return;
        }

        if (!text.startsWith('.')) return;
        const args = text.slice(1).trim().split(' ');
        const cmd = args[0].toLowerCase();

        if (db.groupSettings[from].closed && cmd !== 'فتح' && cmd !== 'ليفاي') return;

        switch (cmd) {
            case 'اوامر':
                const menu = `🌸 *مرحباً بك في إمبراطورية يوكي الشاملة* 🌸\n\n` +
                             `🎮 *ألعاب الأنمي:* (.خمن، .سؤال، .تفكيك، .حل)\n` +
                             `🎲 *فعاليات:* (.روليت، .لوخيروك، .كت تويت)\n` +
                             `💰 *الاقتصاد:* (.راتب، .متجر، .شراء، .تحويل، .نقاطي)\n` +
                             `📜 *الإدارة:* (.قفل، .فتح، .تاق، .قوانين)\n` +
                             `📊 *حسابك:* (.رتبتي، .بروفايل، .ليفاي)\n\n` +
                             `_يوكي تخدمك بـ 1000+ شخصية وتفاعلات ذكية!_ ✨`;
                await sock.sendMessage(from, { text: menu });
                break;

            case 'خمن':
                const qItem = animeQuizzes[Math.floor(Math.random() * animeQuizzes.length)];
                let opts = [qItem.a];
                while(opts.length < 4) {
                    let r = bigBank[Math.floor(Math.random() * bigBank.length)];
                    if(!opts.includes(r)) opts.push(r);
                }
                opts.sort(() => Math.random() - 0.5);
                db.lastAnswer[from] = { answer: qItem.a, options: opts, host: pushName };
                await sock.sendMessage(from, { text: `🧐 *تحدي الذكاء:* ${qItem.q}\n\n1- ${opts[0]}\n2- ${opts[1]}\n3- ${opts[2]}\n4- ${opts[3]}\n\n👤 المسؤول: ${pushName}` });
                break;

            case 'تفكيك':
                const target = bigBank[Math.floor(Math.random() * bigBank.length)];
                db.lastAnswer[from] = { answer: target, host: pushName };
                await sock.sendMessage(from, { text: `🧩 *فكك اسم هذه الشخصية:* [ ${target} ]` });
                break;

            case 'حل':
                if (!db.lastAnswer[from]) return sock.sendMessage(from, { text: "❌ لا يوجد تحدي قائم حالياً!" });
                const correct = db.lastAnswer[from].answer;
                delete db.lastAnswer[from];
                await sock.sendMessage(from, { text: `💡 الإجابة الصحيحة هي: *${correct}*\nتم إنهاء الفعالية بنجاح. 🌸` });
                break;

            case 'راتب':
                const now = Date.now();
                if (now - user.lastSalary < 86400000) return sock.sendMessage(from, { text: "❌ استلمت راتبك! عد إلينا غداً." });
                user.points += 2000; user.lastSalary = now;
                await sock.sendMessage(from, { text: "💰 تم إيداع *2000* نقطة في رصيدك تقديراً لوفائك! ✨" });
                saveDB();
                break;

            case 'روليت':
                if (user.points < 500) return sock.sendMessage(from, { text: "❌ تحتاج 500 نقطة على الأقل!" });
                const win = Math.random() > 0.4;
                if (win) { user.points += 500; await sock.sendMessage(from, { text: "🎰 مبروك! فزت بـ 500 نقطة! 🔥" }); }
                else { user.points -= 500; await sock.sendMessage(from, { text: "🎰 للأسف خسرت 500 نقطة.. 💀" }); }
                saveDB();
                break;

            case 'رتبتي':
                await sock.sendMessage(from, { text: `📊 *بـطـاقـة الـعـضـو الإمـبـراطـوريـة*\n👤 الاسم: ${pushName}\n💰 النقاط: ${user.points}\n🎖️ الرتبة: ${getRole(user.points)} ✨` });
                break;

            case 'تاق':
                const meta = await sock.groupMetadata(from);
                const mems = meta.participants.map(p => p.id);
                await sock.sendMessage(from, { text: `📣 *نداء ملكي من ${pushName}:*\n\n${args.slice(1).join(' ')}`, mentions: mems });
                break;

            case 'قفل':
                db.groupSettings[from].closed = true;
                await sock.sendMessage(from, { text: "🔒 تم قفل الحصن.. لا يتحدث إلا القادة!" });
                break;

            case 'فتح':
                db.groupSettings[from].closed = false;
                await sock.sendMessage(from, { text: "🔓 تم فتح البوابات.. انطلقوا يا أبطال!" });
                break;

            case 'ليفاي':
                await sock.sendMessage(from, { text: `⚔️ *القائد ليفاي* هو سيدي الأسطوري وصاحب الهيبة.. يوكي تفتخر بخدمته! 💖` });
                break;
        }
        saveDB();
    });
}
startBot();
