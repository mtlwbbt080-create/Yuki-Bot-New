const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const express = require('express'); 
const qrcodeImg = require('qrcode'); // المكتبة الجديدة الذكية لتحويل الـ QR لصورة متحركة في الموقع
const { Boom } = require('@hapi/boom');

// --- 🌐 تشغيل سيرفر الويب الذكي لمنع الـ Timeout وعرض الـ QR ---
const app = express();
const port = process.env.PORT || 10000; 
let currentQR = null; // مخزن الـ QR المؤقت

app.get('/', async (req, res) => {
    if (!currentQR) {
        res.send(`
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <div style="text-align: center; margin-top: 50px; font-family: Arial; background-color: #fcf8fa; padding: 20px;">
                <h2 style="color: #4CAF50;">🌸 عالم يوكي السحري يعمل بنجاح وبدون توقف! ✨</h2>
                <p style="color: #555; font-size: 18px;">✅ البوت متصل بالواتساب حالياً أو جاري إنتاج رمز QR جديد.. انتظر 10 ثوانٍ وحدّث الصفحة أو انتظرها تتحدث تلقائياً!</p>
                <script>setTimeout(() => { location.reload(); }, 10000);</script>
            </div>
        `);
    } else {
        try {
            // رسم الـ QR كود وتوليده كصورة Base64 لعرضها فوراً في المتصفح
            const qrImage = await qrcodeImg.toDataURL(currentQR);
            res.send(`
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <div style="text-align: center; margin-top: 30px; font-family: Arial; background-color: #fcf8fa; padding: 20px;">
                    <h2 style="color: #ff66a3;">🌸 امسح الـ QR كود لتشغيل إمبراطورية يوكي 🌸</h2>
                    <p style="color: #666;">افتح الواتساب من جوالك ➜ الأجهزة المرتبطة ➜ ربط جهاز، ثم وجه الكاميرا للرمز أدناه:</p>
                    <div style="margin: 20px auto; padding: 15px; border: 3px dashed #ff66a3; display: inline-block; background: #fff; border-radius: 10px;">
                        <img src="${qrImage}" style="width: 300px; height: 300px;" />
                    </div>
                    <p style="color: #888; font-size: 13px;">🔄 تتحدث هذه الصفحة تلقائياً كل 7 ثوانٍ عند تجدد الرمز</p>
                    <script>setTimeout(() => { location.reload(); }, 7000);</script>
                </div>
            `);
        } catch (err) {
            res.send('❌ حدث خطأ أثناء توليد الـ QR كود، يرجى إعادة تحديث الصفحة.');
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ [Render] تم فتح المنفذ والموقع بنجاح على الـ Port: ${port}`);
});

// --- إعدادات القاعدة ---
let db = { users: {}, groupSettings: {}, lastAnswer: {} };
if (fs.existsSync('./database.json')) db = fs.readJsonSync('./database.json');
const saveDB = () => fs.writeJsonSync('./database.json', db);

// --- نظام الرتب ---
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

// --- بنك الشخصيات العملاق ليوكي ---
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

// --- 🎯 بنك الأسئلة المطور 🎯 ---
const animeQuizzes = [
    { q: "من هو مبرمج يوكي وصاحب الهيبة？", a: "ليفاي" },
    { q: "ما هو حلم لوفي الأساسي؟", a: "ملك القراصنة" },
    { q: "من هو وميض كونوها الأصفر？", a: "ميناتو" },
    { q: "من قتل عائلة وعشيرة إيتاتشي؟", a: "إيتاتشي" },
    { q: "ما اسم سيف ميهوك الأسطوري الأسود？", a: "يورو" },
    { q: "من هو ملك اللعنات في جوجوتسو؟", a: "سوكونا" },
    { q: "من هو أقوى سياف في العالم في ون بيس؟", a: "ميهوك" },
    { q: "ما اسم فاكهة الشيطان الخاصة بـ لاو؟", a: "العمليات" },
    { q: "من هو مؤسس نينجا قرية كونوها الأول؟", a: "هاشيراما" },
    { q: "ما اسم السلاح الأسطوري (الدرجة الأولى) الذي يملكه بوزيدون؟", a: "شيراهوشي" },
    { q: "من هو صاحب مقولة: عدم الاستسلام هو سحري؟", a: "أستا" },
    { q: "ما اسم التحول الأخير والمخيف لـ إيرين؟", a: "العملاق المؤسس" },
    { q: "من هو مدرب ناروتو الأول في الأكاديمية؟", a: "ايروكا" },
    { q: "من هو قائد الفرقة العاشرة الكيوت في بليتش؟", a: "توشيرو" },
    { q: "ما اسم والد الصياد غون؟", a: "جين" },
    { q: "من هو السياف الأسطوري الذي يستخدم 3 سيوف؟", a: "زورو" },
    { q: "ما اسم المنظمة السرية التي ينتمي إليها إيتاتشي؟", a: "الأكاتسكي" },
    { q: "من هي الشخصية الملقبة بـ غراب كونوها المظلم؟", a: "إيتاتشي" },
    { q: "ما هي رتبة كاكاشي قبل أن يصبح الهوكاجي السادس؟", a: "جونين" },
    { q: "من هو مستخدم تقنية وزلزال اللحية البيضاء بعد موته؟", a: "تيتش" },
    { q: "ما اسم الأكاديمية الأبطال التي يدرس بها ميدوريا？", a: "اليو ايه" },
    { q: "من هي الفتاة التي تمتلك مفاتيح الأرواح السحرية؟", a: "لوسي" },
    { q: "من هو الشيطان الكيوت الذي يسكن داخل سيف أستا؟", a: "ليبي" },
    { q: "ما اسم السيف الذي يمتلكه تانجيرو الأسود؟", a: "نيشيرين" },
    { q: "من صاحب مقولة: العالم ليس مثالياً، لكنه موجود من أجلنا؟", a: "إدوارد" },
    { q: "ما اسم الجزيرة الأخيرة في ون بيس التي تخبئ الون بيس؟", a: "لاف تيل" },
    { q: "من هو الهاشيرا اللهب الذي ضحى بحياته في القطار؟", a: "رينغوكو" },
    { q: "من هو الهوكاجي الخامس والطبية الأسطورية لقرية كونوها؟", a: "تسونادي" },
    { q: "ما اسم عيون ساسكي الأسطورية الأبدية؟", a: "الرينغان" },
    { q: "من هو قائد منظمة الفرسان السحرية الثيران السوداء؟", a: "يامي" },
    { q: "من هو ابن أو ولد ناروتو الأسطوري الجديد؟", a: "بوروتو" },
    { q: "من هو والد ناروتو الحقيقي؟", a: "ميناتو" },
    { q: "ما هو اسم عّم بوروتو وصديق ومنافس ناروتو؟", a: "ساسكي" },
    { q: "من هو الشخص الأسطوري الذي درب لوفي على الهاكي؟", a: "رالي" },
    { q: "من صاحب مقولة: أنا الرجل الذي سيصبح ملك القراصنة؟", a: "لوفي" },
    { q: "ما هي القرية المخفية التي ينتمي إليها ناروتو？", a: "كونوها" },
    { q: "من هي مؤسسة الجدار والعملاق الأول في هجوم العمالقة؟", a: "يمير" },
    { q: "من هو مستخدم عيون اللانهاية القاتلة في جوجوتسو؟", a: "قوجو" },
    { q: "ما اسم شقيقة تانجيرو الكيوت التي أصبحت شيطانة؟", a: "نيزوكو" },
    { q: "من هو الأدميرال الكسول الذي يمتلك قدرة ونور الضوء؟", a: "كيزارو" },
    { q: "ما اسم ابن جينبي وقائد قراصنة الشمس القديم؟", a: "فيشر تايجر" },
    { q: "من هو العضو المقنع الأسطوري في الأكاتسكي الذي تبين أنه أوبيتو؟", a: "توبي" },
    { q: "من هو الشينغامي الذي أسقط كشكول الموت لـ لايت؟", a: "ريوك" },
    { q: "من هو أسرع شخصية وقائد الفيلق في هجوم العمالقة؟", a: "ليفاي" },
    { q: "ما هي التقنية التي اخترعها ميناتو واستغرق 3 سنوات لتطويرها؟", a: "الراسينغان" },
    { q: "من هي القطة التي ترافق يورويتشي في بليتش؟", a: "يورويتشي" },
    { q: "ما اسم السفينة الأولى لطاقم قراصنة قبعة القش؟", a: "غوينغ ميري" },
    { q: "من هو الصياد الرقم 44 في اختبار الصيادين؟", a: "هيسوكا" },
    { q: "ما هو اسم سيف زورو الذي حصل عليه من هيروري في وانو؟", a: "إنما" },
    { q: "من هو الشينوبي الذي لُقب بـ إله الشينوبي الحقيقي؟", a: "هاشيراما" },
    { q: "ما اسم الكيان المظلم الذي يختبئ داخل جسد كوروساكي إيتشيغو؟", a: "هولو" },
    { q: "من هو صانع الجدران الثلاثة في أنمي هجوم العمالقة؟", a: "كارل فريتز" },
    { q: "من هي الشخصية التي تمتلك أسرع أسلوب ركض ونينجا في ناروتو؟", a: "ميناتو" },
    { q: "ما اسم النقابة السحرية الأقوى التي ينتمي إليها ناتسو دراغنيل؟", a: "فيرى تيل" },
    { q: "من هو الأوتـاكـو العبقري مخترع آلة الزمن والملقب بـ هوبولين كيوما؟", a: "أوكابي" },
    { q: "ما اسم السيف العريض والمخيف الذي كان يملكه زابوزا؟", a: "قاطع الرؤوس" },
    { q: "من هو الهاشيرا الأعمى الأقوى في فيلق قاتلي الشياطين？", a: "غيومي" },
    { q: "ما هو اسم الفاكهة الأسطورية التي تناولها لوفي وبان حقيقتها (غود نيكا)؟", a: "المطاط" },
    { q: "من هو ملك النمل المرعم في هانتر x هانتر؟", a: "ميرويم" },
    { q: "ما اسم الهوكاجي الثاني المخترع لغالبية التقنيات المحرمة؟", a: "توبيراما" }
];

// --- 🏪 قائمة منتجات المتجر الكيوت ليوكي 🏪 ---
const shopItems = [
    { id: 1, name: "⚔️ سيف ليفاي القاطع", price: 5000, desc: "يعطيك هيبة وفخامة القادة في القروب!" },
    { id: 2, name: "👒 قبعة لوفي القشية", price: 3000, desc: "تجعلك قرصانًا مشهورًا ومحبوبًا!" },
    { id: 3, name: "👁️ عين الشارينغان الأسطورية", price: 8000, desc: "تمنحك القدرة على نسخ ملصقات الأعضاء!" },
    { id: 4, name: "🧪 جرعة يوكي السحرية", price: 1500, desc: "تزيد من حظك الكيوت في ألعاب الروليت!" }
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_yuki');
    
    // 🛡️ إعدادات السوكيت المحدثة كلياً لتخطي قيود الحظر والـ Loop في Render
    const sock = makeWASocket({ 
        auth: state, 
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // تفعيلها احتياطياً في اللوج للتحقق الفوري
        
        // تغيير هوية السيرفر لمتصفح سفاري عادي لخداع سيرفرات الميتا ومنع كود 405
        browser: ['Mac OS', 'Safari', '10.15.7'], 
        
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000
    });

    // 🔑 تعديل عبقري: نطلب الكود النصي ولكن نترك ميزة الـ QR تعمل في نفس الوقت للموقع!
    if (!sock.authState.creds.registered) {
        const myNumber = "249992574007"; // رقمك الموثق والجاهز للربط
        await delay(3000); // إعطاء السيرفر مهلة ليستقر
        try {
            console.log(`⏳ جاري طلب كود الربط من سيرفرات واتساب للرقم: ${myNumber}...`);
            const code = await sock.requestPairingCode(myNumber);
            console.log(`\n=================================================`);
            console.log(`🌸 كود ربط يوكي بالواتساب الخاص بك هو 👈 [ ${code} ] 🌸`);
            console.log(`=================================================\n`);
        } catch (error) {
            console.error('⚠️ تعذر طلب الكود النصي حالياً (بسبب كود 405)، السيرفر يعتمد الآن على الـ QR في الموقع الأساسي...');
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // تعديل جوهري: إجبار التقاط الـ QR وتخزينه ليعرض في الموقع غصب عن السيرفر
        if (qr) {
            currentQR = qr; 
            console.log('✨ [Yuki] 🟢 تم توليد رمز QR بنجاح! افتح رابط الموقع فوراً لكسحه!');
        }

        if (connection === 'close') {
            currentQR = null;
            const statusCode = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode : null;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`🔄 انقطع الاتصال بكود: ${statusCode}. جاري حماية وإعادة بناء الجلسة...`);

            // ⚠️ السيطرة الذكية على الأخطاء 428 و 405 و 401 لمنع الـ Loop المستمر
            if (statusCode === 405 || statusCode === 428 || statusCode === 401 || statusCode === DisconnectReason.restartRequired) {
                console.log('🧹 [Yuki] تم رصد قيود اتصال، جاري تصفير كاش الجلسة لضمان إنتاج كود جديد سليم...');
                try {
                    if (fs.existsSync('./session_yuki')) {
                        fs.emptyDirSync('./session_yuki'); 
                    }
                } catch (e) { console.log('خطأ أثناء تنظيف الملفات، جاري التخطي.'); }
                
                // مهلة أطول (10 ثواني) لتهدئة السيرفر وتخطي الـ IP Block الخاص بـ Render
                setTimeout(() => startBot(), 10000);
            } else if (shouldReconnect) {
                setTimeout(() => startBot(), 5000); 
            }
        } else if (connection === 'open') {
            currentQR = null; 
            console.log('\n============================================');
            console.log('✅ تم تشغيل إمبراطورية يوكي بنجاح واكتمل الاتصال بالكامل!');
            console.log('============================================\n');
        }
    });

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

        if (text === ".") return sock.sendMessage(from, { text: `لبيه ولبى قلبك يا قائد ليفاي الأسطوري! 🥰 هههههه يوكي تسمعك كلي آذان صاغية ومتحمسة لأوامرك الفخمة! 🌸✨` });
        if (text.toLowerCase().includes("سلام عليكم") || text.toLowerCase().includes("السلام عليكم")) {
            await sock.sendMessage(from, { text: "وعليكم السلام ورحمة الله وبركاته يا هلاااا ومية هلاااا! 😍 نورت القروب بطلتك العسل، كيف حالك؟ هههههه ✨🌸🎀" });
        }

        if (db.lastAnswer[from] && !text.startsWith('.')) {
            const entry = db.lastAnswer[from]; let isCorrect = false;
            if (entry.options) {
                const optIdx = parseInt(text) - 1;
                if (entry.options[optIdx] === entry.answer || text === entry.answer) isCorrect = true;
            } else if (text === entry.answer) { 
                isCorrect = true; 
            }

            if (isCorrect) {
                delete db.lastAnswer[from];
                await sock.sendMessage(from, { react: { text: "💗", key: m.key } });
                await sock.sendMessage(from, { text: `⏳ *ثواااني يا حلوين جاري فحص الإجابة من الأرشيف السحري ليوكي..* ✨` });
                setTimeout(async () => {
                    user.points += 1000;
                    await sock.sendMessage(from, { text: `ياااااي كفوووو بطلل مذهل! 🎉 *مبروووك يا ${pushName}!* إجابتك صحيحة مية بالمية وتهبّل 😻.\n💰 زدت لك +1000 نقطة ذهبية في رصيدك.\n👤 المسؤول الكيوت: ${entry.host} هههههه` });
                    saveDB();
                }, 1200);
            } else { 
                await sock.sendMessage(from, { react: { text: "❌", key: m.key } }); 
            }
            return;
        }

        if (!text.startsWith('.')) return;
        const args = text.slice(1).trim().split(' '); const cmd = args[0].toLowerCase();
        if (db.groupSettings[from].closed && cmd !== 'فتح' && cmd !== 'ليفاي') return;

        switch (cmd) {
            case 'اوامر':
                const menu = `🌸 *مرحباً بك في عالم يوكي السحري المطور* 🌸\n\n` +
                             `🎮 *ألعاب الأنمي والفعاليات:* (.خمن، .سؤال، .تفكيك، .حل، .العاب)\n` +
                             `🎲 *تسلية وحب وحماس:* (.روليت، .لوخيروك School، .كت تويت، .نسبة_الحب)\n` +
                             `💰 *الاقتصاد والفلوس:* (.راتب، .متجر، .شراء، .تحويل، .نقاطي)\n` +
                             `📜 *الإدارة والسيطرة:* (.قفل، .فتح، .تاق، .قوانين)\n` +
                             `📊 *حسابك الإمبراطوري:* (.رتبتي، .بروفايل، .ليفاي)\n\n` +
                             `_يوكي تسعد بخدمتكم دايماً يا حلوين يا رب تنبسطوا!_ 💕🎀🌟`;
                await sock.sendMessage(from, { text: menu }); break;
                
            case 'خمن':
            case 'سؤال':
                const qItem = animeQuizzes[Math.floor(Math.random() * animeQuizzes.length)];
                let opts = [qItem.a]; 
                while(opts.length < 4) { 
                    let r = bigBank[Math.floor(Math.random() * bigBank.length)]; 
                    if(!opts.includes(r)) opts.push(r); 
                }
                opts.sort(() => Math.random() - 0.5); 
                db.lastAnswer[from] = { answer: qItem.a, options: opts, host: pushName };
                await sock.sendMessage(from, { text: `🧐 *تحدي الأوتـاكـو المذهل من عالم يوكي:* \n\n❓ السـؤال: ${qItem.q}\n\n1️⃣ ➜ ${opts[0]}\n2️⃣ ➜ ${opts[1]}\n3️⃣ ➜ ${opts[2]}\n4️⃣ ➜ ${opts[3]}\n\n✨ أرسل رقم الإجابة أو الاسم الصحيح لتربح الفوز! هههههه` }); 
                break;
                
            case 'تفكيك':
                const target = bigBank[Math.floor(Math.random() * bigBank.length)]; db.lastAnswer[from] = { answer: target, host: pushName };
                await sock.sendMessage(from, { text: `🧩 *يلا يا شاطر فكك اسم هالشخصية الكيوت في عالم يوكي:* [ ${target} ]` }); break;
                
            case 'حل':
                if (!db.lastAnswer[from]) return sock.sendMessage(from, { text: "❌ أويلي.. ما في أي فعاليات شغالة الحين عشان أحلها!" });
                const correct = db.lastAnswer[from].answer; delete db.lastAnswer[from];
                await sock.sendMessage(from, { text: `💡 الإجابة الصحيحة والمنقذة في أرشيف يوكي هي: *${correct}*` }); break;

            case 'العاب':
                const funEvents = [
                    "💬 صراحة: وش أكثر شيء تحبه بشخصية القائد ليفاي؟",
                    "🔥 تحدي: غير اسمك بالجروب إلى 'مساعد يوكي الكيوت' لمدة ساعة!",
                    "💡 نكتة: محشش شاف إشارة ممنوع الوقوف.. قام انسدح هههههه!",
                    "⚔️ هيبة: منشن شخص بالجروب وقول له أنا هيبتك الملكية هنا!"
                ];
                let event = funEvents[Math.floor(Math.random() * funEvents.length)];
                await sock.sendMessage(from, { text: `🎯 *فعالية يوكي العشوائية والممتعة:* \n\n${event}` }); break;

            case 'نسبة_الحب':
                let mentions = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                let p1 = `@${sender.split('@')[0]}`;
                let p2 = mentions[0] ? `@${mentions[0].split('@')[0]}` : "القائد ليفاي 👑";
                let lovePercent = Math.floor(Math.random() * 101);
                let comment = "علاقة باردة جداً.. تحتاجون تتابعون أنمي سوا! ❄️";
                if(lovePercent > 40) comment = "بداية حب أوتامو جميل ولطيف! 🥰";
                if(lovePercent > 75) comment = "وااااو! حب أسطوري وعميق يشبه قصة لوفي واللحم! 🍖💖";
                
                await sock.sendMessage(from, { 
                    text: `❤️ *مـقـيـاس الـحـب الـسـحـري لـيـوكـي* ❤️\n\n💘 الـطـرف الأول: ${p1}\n💞 الـطـرف الـثـانـي: ${p2}\n\n📊 نسبة الحب بينكما هي: [ *${lovePercent}%* ] \n📝 الحكم السحري: ${comment}`,
                    mentions: mentions[0] ? [sender, mentions[0]] : [sender]
                }); break;
                
            case 'متجر':
                let shopText = `🏪 *مـتـجـر يـوكـي الـسـحـري لـلأسـلـحـة والأدوات* 🏪\n\n`;
                shopItems.forEach(item => {
                    shopText += `📦 *[ ${item.id} ] - ${item.name}*\n💰 السعر: ${item.price} نقطة\n📝 الوصف: ${item.desc}\n---------------------------\n`;
                });
                shopText += `🛒 لشراء أي أداة أكتب: .شراء [رقم المنتج]`;
                await sock.sendMessage(from, { text: shopText }); break;
                
            case 'شراء':
                let itemID = parseInt(args[1]);
                let selectedItem = shopItems.find(i => i.id === itemID);
                if (!selectedItem) return sock.sendMessage(from, { text: "❌ أويلي! أدخل رقم منتج صحيح من المتجر يا عسل!" });
                if (user.points < selectedItem.price) return sock.sendMessage(from, { text: `❌ رصيدك لا يكفي! تحتاج إلى ${selectedItem.price} نقطة لشراء هذا المنتج الأسطوري!` });
                user.points -= selectedItem.price;
                if(!user.inventory) user.inventory = [];
                user.inventory.push(selectedItem.name);
                await sock.sendMessage(from, { text: `🎉 *مبرووووك المقتنيات الجديدة!* \nتم شراء *${selectedItem.name}* بنجاح وخصم ${selectedItem.price} نقطة من حصالتك! 🥳✨` });
                saveDB(); break;

            case 'بروفايل':
                let inv = (user.inventory && user.inventory.length > 0) ? user.inventory.join(', ') : "حقيبتك فارغة 🎒";
                await sock.sendMessage(from, { text: `👤 *مـلـف حـسـابـك الإمـبـراطـوري الكيوت* 👤\n\n🎯 الاسم: ${pushName}\n💰 النقاط: ${user.points}\n🎖️ الرتبة: ${getRole(user.points)}\n🎒 الممتلكات: ${inv}\n\n✨ تفاعل أكثر لتصبح ملك الأوتاكو الأسطوري! هههههه` }); break;

            case 'راتب':
                const now = Date.now(); if (now - user.lastSalary < 86400000) return sock.sendMessage(from, { text: "طماااع! 🤭 استلمت راتبك خلاص.. تعال بكرة وبعطيك من عيوني!" });
                user.points += 2000; user.lastSalary = now; await sock.sendMessage(from, { text: "💰 وااااو! تم إيداع *2000* نقطة في حسابك لأنك متفاعل وعسل في عالم يوكي! تتهنى فيهم هههههه ✨💖" }); saveDB(); break;
                
            case 'روليت':
                if (user.points < 500) return sock.sendMessage(from, { text: "❌ يا قلبي أنت تحتاج 500 نقطة على الأقل عشان تلعب!" });
                await sock.sendMessage(from, { text: "🎰 *جـاري تـدويـر عـجـلة الـحـظ الـكـيـوت الآن.. شششش!* 🤫⏳" });
                setTimeout(async () => {
                    const win = Math.random() > 0.45; 
                    if (win) { 
                        user.points += 600; 
                        await sock.sendMessage(from, { text: `🎰 *وااااو الحظ فجّر المكااان!* 🥳🎉\nكفوو فزت بـ 600 نقطة ذهبية كاملة أضيفت لرصيدك الكيوت هههههه!` }); 
                    } else { 
                        user.points -= 500; 
                        await sock.sendMessage(from, { text: `🎰 *أوووش.. العجلة وقفت على اللون الأسود الحزين!* 💀🥺\nخسرت 500 نقطة من رصيدك في عالم يوكي.. تعوضها الجولة الجاية يا بطل!` }); 
                    }
                    saveDB();
                }, 2000); break;

            case 'تحويل':
                if (!args[1] || !args[2]) return sock.sendMessage(from, { text: "❌ *طريقة التحويل الخاطئة:* استخدم الأمر كذا بالظبط ➜ `.تحويل [المنشن] [المبلغ]`" });
                let targetUser = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || args[1].replace('@', '') + '@s.whatsapp.net';
                let amount = parseInt(args[2]);
                if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: "❌ أويلي! أدخل مبلغ صحيح وصالح للتحويل يا عسل!" });
                if (user.points < amount) return sock.sendMessage(from, { text: "❌ رصيدك الذهبي غير كافي لإتمام هذه العملية الضخمة!" });
                await sock.sendMessage(from, { text: `💸 *جـاري فـحـص الـخـزنـة الـمـلـكـيـة وتـحـويـل الأمـوال الآن..* ⏳` });
                setTimeout(async () => {
                    if (!db.users[targetUser]) db.users[targetUser] = { points: 500, inventory: [], lastSalary: 0 };
                    user.points -= amount; db.users[targetUser].points += amount;
                    await sock.sendMessage(from, { text: `✅ *تمت عملية التحويل السحرية بنحاح بنكهة يوكي!* \n💰 تم تحويل *${amount}* نقطة ذهبية من حسابك إلى المستلم الكيوت بنجاح تام! هههههه تتهنوا ✨🌸` });
                    saveDB();
                }, 1500); break;
                
            case 'نقاطي':
                await sock.sendMessage(from, { text: `💰 رصيدك الحالي وحصالتك الذهبية في عالم يوكي هي: *${user.points}* نقطة! تبي أزيدك؟ اتفاعل معنا هههههه 👑` }); break;
            case 'رتبتي':
                await sock.sendMessage(from, { text: `📊 *بـطـاقـة الـعـضـو الإمـبـراطـوريـة الـكـيـوت في عالم يوكي*\n👤 الاسم: ${pushName}\n💰 نقاطك الحلوة: ${user.points}\n🎖️ رتبتك الفخمة: ${getRole(user.points)} ✨` }); break;
            case 'تاق':
                const meta = await sock.groupMetadata(from); const mems = meta.participants.map(p => p.id);
                await sock.sendMessage(from, { text: `📣 *نداء ملكي عاجل وحماسي من عالم يوكي بواسطة ${pushName}:*\n\n${args.slice(1).join(' ')}`, mentions: mems }); break;
            case 'قفل': db.groupSettings[from].closed = true; await sock.sendMessage(from, { text: "🔒 تم قفل الحصن بطلب من القادة.. هدوء يا حلوين ششش! 🤫" }); break;
            case 'فتح': db.groupSettings[from].closed = false; await sock.sendMessage(from, { text: "🔓 يااااي تم فتح البوابات من جديد في عالم يوكي.. انطلقوا وفجروها تفاعل يا مبدعين! 🥳✨" }); break;
            case 'قوانين':
                await sock.sendMessage(from, { text: `📜 *قوانين إمبراطورية يوكي الفخمة:* \n\n1- ممنوع السب أو الشتم بأي شكل ❌\n2- احترم القادة والأعضاء الكيوت دايماً 👑\n3- ممنوع التكرار أو إرسال روابط السبام 🚫\n\n_تفاعل واستمتع بالألعاب لترتفع رتبتك السحرية معنا!_` }); break;
            case 'لوخيروك':
                const choises = ["تأكل بيضة نية 🥚", "تحذف الواتساب يوم كامل 📱", "تعتزل الأنمي للأبد 😭", "تغير اسمك بالجروب لـ 'أنا دجاجة' 🐔"];
                let c1 = choises[Math.floor(Math.random() * choises.length)];
                let c2 = choises[Math.floor(Math.random() * choises.length)];
                while(c1 === c2) { c2 = choises[Math.floor(Math.random() * choises.length)]; }
                await sock.sendMessage(from, { text: `🎲 *لو خيروك الكيوت من يوكي:* \n\n🔴 الاختيار الأول: ${c1}\n🔵 الاختيار الثاني: ${c2}\n\nوش تختار? ورونا صدماتكم هههههه` }); break;
            case 'كت تويت':
                const tweets = ["وش أكثر أنمي تندمت إنك تابعته؟ 🧐", "لو عاد بك الزمن، بتدخل نفس هذا القروب？ 😂", "من هو أقرب شخص لك في هذا الفيلق؟ 💕", "اعتراف خطير ما قلته لأحد بالجروب قبل كذا؟ 🤫"];
                let tweet = tweets[Math.floor(Math.random() * tweets.length)];
                await sock.sendMessage(from, { text: `💭 *كت تويت حماسي من يوكي:* \n\n💬 ${tweet}` }); break;
            case 'ليفاي': await sock.sendMessage(from, { text: `⚔️ *القائد ليفاي* هو سيدي الأسطوري الغالي وتاج راسي.. هيبته تملى المكان ويوكي تفتخر بخدمته وتنفذ كل كلامه بسعادة! 💖🌸` }); break;
        }
        saveDB();
    });
}
startBot();
