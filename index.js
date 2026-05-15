const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const qrcode = require('qrcode-terminal'); 
const express = require('express'); 

// --- 🌐 تشغيل سيرفر الويب المُنقذ لـ Render لمنع الـ Timeout ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🌸 عالم يوكي السحري ! ✨');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ [Render] تم فتح المنفذ والموقع الوهمي بنجاح على الـ Port: ${port}`);
});

// --- إعدادات القاعدة ---
let db = { users: {}, groupSettings: {}, lastAnswer: {} };
if (fs.existsSync('./database.json')) db = fs.readJsonSync('./database.json');
const saveDB = () => fs.writeJsonSync('./database.json', db);

// --- نظام الرتب (النسخة الكاملة بدون أي حذف) ---
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

// --- بنك الشخصيات العملاق ليوكي (كامل مية بالمية) ---
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

// --- 🎯 بنك الأسئلة ومقولات الأنمي المضخم بالكامل 🎯 ---
const animeQuizzes = [
    { q: "من هو مبرمج يوكي？", a: "ليفاي" },
    { q: "ما هو حلم لوفي？", a: "ملك القراصنة" },
    { q: "من هو وميض كونوها الأصفر؟", a: "ميناتو" },
    { q: "من قتل عائلة إيتاتشي؟", a: "إيتاتشي" },
    { q: "ما اسم سيف ميهوك الأسطوري؟", a: "يورو" },
    { q: "من هو ملك اللعنات؟", a: "سوكونا" },
    { q: "من هو أقوى سياف في العالم؟", a: "ميهوك" },
    { q: "ما اسم فاكهة الشيطان الخاصة بـ لاو؟", a: "العمليات" },
    { q: "من هو مؤسس نينجا كونوها؟", a: "هاشيراما" },
    { q: "ما اسم السلاح الأسطوري الذي يملكه بوزيدون؟", a: "شيراهوشي" },
    { q: "من هو صاحب مقولة: عدم الاستسلام هو سحري？", a: "أستا" },
    { q: "ما اسم التحول الأخير لـ إيرين؟", a: "العملاق المؤسس" },
    { q: "من هو مدرب ناروتو الأول؟", a: "ايروكا" },
    { q: "من هو قائد الفرقة العاشرة في بليتش؟", a: "توشيرو" },
    { q: "ما اسم والد غون؟", a: "جين" },
    { q: "من هو السياف الذي يستخدم 3 سيوف؟", a: "زورو" },
    { q: "ما اسم المنظمة التي ينتمي إليها إيتاتشي؟", a: "الأكاتسكي" },
    { q: "من هي الشخصية الملقبة بـ غراب كونوها؟", a: "إيتاتشي" },
    { q: "ما هي رتبة كاكاشي قبل أن يصبح الهوكاجي السادس؟", a: "جونين" },
    { q: "من هو مستخدم تقنية اللحية البيضاء بعد موته؟", a: "تيتش" },
    { q: "ما اسم الأكاديمية التي يدرس بها ميدوريا في أنمي بوكو نو هيرو؟", a: "اليو ايه" },
    { q: "من هي الفتاة التي تمتلك مفاتيح الأرواح السحرية في فيري تيل؟", a: "لوسي" },
    { q: "من هو الشيطان الذي يسكن داخل سيف أستا؟", a: "ليبي" },
    { q: "ما اسم السيف الذي يمتلكه تانجيرو بعد هزيمة موزان؟", a: "نيشيرين" },
    { q: "من هو صاحب مقولة: العالم ليس مثالياً، لكنه موجود من أجلنا؟", a: "إدوارد" },
    { q: "ما اسم الجزيرة الأخيرة في ون بيس التي تخبئ الكنز؟", a: "اف تيل" },
    { q: "من هو الهاشيرا الذي ضحى بحياته في قطار اللانهاية？", a: "رينغوكو" },
    { q: "من هو الهوكاجي الخامس لقرية كونوها؟", a: "تسونادي" },
    { q: "ما اسم عيون ساسكي الأسطورية بعد دمجها مع عيون إيتاتشي؟", a: "الرينغان" },
    { q: "من هو قائد منظمة الفرسان السحرية الثيران السوداء؟", a: "يامي" }
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_yuki');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false });
    sock.ev.on('creds.update', saveCreds);

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

    // --- نظام الترحيب والوداع التفاعلي الأنثوي اللطيف المبهج ---
    sock.ev.on('group-participants.update', async (anu) => {
        const from = anu.id; const user = anu.participants[0];
        if (anu.action === 'add') {
            await sock.sendMessage(from, { text: `يا هلاا ومية هلاا نورت دنيتناااا الجميلة 🥳✨ @${user.split('@')[0]} \nأهلاً بك في عالم يوكي السحري، ان شاء الله تنبسط وتستانس معنا يا عسل! 🌸💖🎀`, mentions: [user] });
        } else if (anu.action === 'remove') {
            await sock.sendMessage(from, { text: `أوويلييي.. زعلتني ليش غادر الكيوت 🥺💔 @${user.split('@')[0]} \nبنشتاق لك كثييير والله.. تمنياتي لك بأيام سعيدة يا رب! 🌌🌸`, mentions: [user] });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]; if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid; const sender = m.key.participant || m.key.remoteJid;
        const pushName = m.pushName || "أحد الأبطال";
        const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();

        if (!db.users[sender]) db.users[sender] = { points: 500, inventory: [], lastSalary: 0 };
        if (!db.groupSettings[from]) db.groupSettings[from] = { closed: false };
        let user = db.users[sender];

        // --- الردود التفاعلية اللطيفة والأنثوية المليئة بالحماس والضحك ---
        if (text === ".") return sock.sendMessage(from, { text: `لبيه ولبى قلبك يا قائد ليفاي الأسطوري! 🥰 هههههه يوكي تسمعك كلي آذان صاغية ومتحمسة لأوامرك الفخمة! 🌸✨` });
        if (text.toLowerCase().includes("سلام عليكم") || text.toLowerCase().includes("السلام عليكم")) {
            await sock.sendMessage(from, { text: "وعليكم السلام ورحمة الله وبركاته يا هلاااا ومية هلاااا! 😍 نورت القروب بطلتك العسل، كيف حالك؟ هههههه ✨🌸🎀" });
        }

        // --- نظام التحقق الذكي من الإجابات ---
        if (db.lastAnswer[from] && !text.startsWith('.')) {
            const entry = db.lastAnswer[from]; let isCorrect = false;
            if (entry.options) {
                const optIdx = parseInt(text) - 1;
                if (entry.options[optIdx] === entry.answer || text === entry.answer) isCorrect = true;
            } else if (text === entry.answer) { isCorrect = true; }

            if (isCorrect) {
                delete db.lastAnswer[from];
                await sock.sendMessage(from, { react: { text: "💗", key: m.key } });
                await sock.sendMessage(from, { text: `⏳ *ثواااني يا حلوين جاري فحص الإجابة من الأرشيف السحري ليوكي..* ✨` });
                setTimeout(async () => {
                    user.points += 1000;
                    await sock.sendMessage(from, { text: `ياااااي كفوووو بطلل مذهل! 🎉 *مبروووك يا ${pushName}!* إجابتك صحيحة مية بالمية وتهبّل 😻.\n💰 زدت لك +1000 نقطة ذهبية في رصيدك.\n👤 المسؤول الكيوت: ${entry.host} هههههه` });
                    saveDB();
                }, 1500);
            } else { await sock.sendMessage(from, { react: { text: "❌", key: m.key } }); }
            return;
        }

        if (!text.startsWith('.')) return;
        const args = text.slice(1).trim().split(' '); const cmd = args[0].toLowerCase();
        if (db.groupSettings[from].closed && cmd !== 'فتح' && cmd !== 'ليفاي') return;

        switch (cmd) {
            case 'اوامر':
                const menu = `🌸 *مرحباً بك في عالم يوكي السحري* 🌸\n\n` +
                             `🎮 *ألعاب الأنمي الممتعة:* (.خمن، .سؤال، .تفكيك، .حل)\n` +
                             `🎲 *فعاليات وحماس:* (.روليت، .لوخيروك، .كت تويت)\n` +
                             `💰 *الاقتصاد والفلوس:* (.راتب، .متجر، .شراء، .تحويل، .نقاطي)\n` +
                             `📜 *الإدارة والسيطرة:* (.قفل، .فتح، .تاق، .قوانين)\n` +
                             `📊 *حسابك الإمبراطوري:* (.رتبتي، .بروفايل، .ليفاي)\n\n` +
                             `_أتمنى لك قضاء وقت ممتع ويجنن في عالم يوكي المليء بالبهجة والحماس.. هههههه تسعدني خدمتكم دايماً يا حلوين!_ 💕🎀🌟`;
                await sock.sendMessage(from, { text: menu }); break;
            case 'خمن':
                const qItem = animeQuizzes[Math.floor(Math.random() * animeQuizzes.length)];
                let opts = [qItem.a]; while(opts.length < 4) { let r = bigBank[Math.floor(Math.random() * bigBank.length)]; if(!opts.includes(r)) opts.push(r); }
                opts.sort(() => Math.random() - 0.5); db.lastAnswer[from] = { answer: qItem.a, options: opts, host: pushName };
                await sock.sendMessage(from, { text: `🧐 *تحدي ذكاء وسرعة لعيونكم من عالم يوكي:* ${qItem.q}\n\n1- ${opts[0]}\n2- ${opts[1]}\n3- ${opts[2]}\n4- ${opts[3]}\n\n👤 المسؤول اللطيف: ${pushName} ✨ وروني شطارتكم هههههه` }); break;
            case 'تفكيك':
                const target = bigBank[Math.floor(Math.random() * bigBank.length)]; db.lastAnswer[from] = { answer: target, host: pushName };
                await sock.sendMessage(from, { text: `🧩 *يلا يا شاطر فكك اسم هالشخصية الكيوت في عالم يوكي:* [ ${target} ]` }); break;
            case 'حل':
                if (!db.lastAnswer[from]) return sock.sendMessage(from, { text: "❌ أويلي.. ما في أي فعاليات شغالة الحين عشان أحلها!" });
                const correct = db.lastAnswer[from].answer; delete db.lastAnswer[from];
                await sock.sendMessage(from, { text: `💡 الإجابة الصحيحة والمنقذة في أرشيف يوكي هي: *${correct}* \nتم إنهاء الفعالية بنجاح، هاردلك للي ما لحقوا هههههه 🌸` }); break;
            case 'راتب':
                const now = Date.now(); if (now - user.lastSalary < 86400000) return sock.sendMessage(from, { text: "طماااع! 🤭 استلمت راتبك خلاص.. تعال بكرة وبعطيك من عيوني!" });
                user.points += 2000; user.lastSalary = now; await sock.sendMessage(from, { text: "💰 وااااو! تم إيداع *2000* نقطة في حسابك لأنك متفاعل وعسل في عالم يوكي! تتهنى فيهم هههههه ✨💖" }); saveDB(); break;
            case 'روليت':
                if (user.points < 500) return sock.sendMessage(from, { text: "❌ يا قلبي أنت تحتاج 500 نقطة على الأقل عشان تلعب!" });
                const win = Math.random() > 0.4; if (win) { user.points += 500; await sock.sendMessage(from, { text: "🎰 وااااو حظك يجننن! فزت بـ 500 نقطة كاملة! هههههه 🔥🥳" }); }
                else { user.points -= 500; await sock.sendMessage(from, { text: "🎰 أوووش.. الحظ خانك هالمرة وخسرت 500 نقطة في عالم يوكي.. تعوضها يا بطل 💀🥺" }); }
                saveDB(); break;
            case 'رتبتي':
                await sock.sendMessage(from, { text: `📊 *بـطـاقـة الـعـضـو الإمـبـراطـوريـة الـكـيـوت في عالم يوكي*\n👤 الاسم: ${pushName}\n💰 نقاطك الحلوة: ${user.points}\n🎖️ رتبتك الفخمة: ${getRole(user.points)} ✨` }); break;
            case 'تاق':
                const meta = await sock.groupMetadata(from); const mems = meta.participants.map(p => p.id);
                await sock.sendMessage(from, { text: `📣 *نداء ملكي عاجل وحماسي من عالم يوكي بواسطة ${pushName}:*\n\n${args.slice(1).join(' ')}`, mentions: mems }); break;
            case 'قفل': db.groupSettings[from].closed = true; await sock.sendMessage(from, { text: "🔒 تم قفل الحصن بطلب من القادة.. هدوء يا حلوين ششش! 🤫" }); break;
            case 'فتح': db.groupSettings[from].closed = false; await sock.sendMessage(from, { text: "🔓 يااااي تم فتح البوابات من جديد في عالم يوكي.. انطلقوا وفجروها تفاعل يا مبدعين! 🥳✨" }); break;
            case 'ليفاي': await sock.sendMessage(from, { text: `⚔️ *القائد ليفاي* هو سيدي الأسطوري الغالي وتاج راسي.. هيبته تملى المكان ويوكي تفتخر بخدمته وتنفذ كل كلامه بسعادة! 💖🌸` }); break;
        }
        saveDB();
    });
}
startBot();
