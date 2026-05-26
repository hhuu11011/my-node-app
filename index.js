// ============================================
// الخادم المركزي لمنصة الرد الذكي - النسخة النهائية مع تكامل Meta WhatsApp
// ============================================

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// ============================================
// 1. الاتصال بقاعدة بيانات Supabase
// ============================================
const supabaseUrl = "https://wwlzblztysghxxlgxcnp.supabase.co";
const supabaseKey = "sb_publishable_5owjaAAZadbSrA7Zstd7dg_V2-zXKR9";
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// 2. تخزين مؤقت للطلبات (لمنع التكرار)
// ============================================
const recentRequests = new Map();

// ============================================
// 3. عنوان Make.com الرئيسي (سيناريو Main Webhook V2)
// ============================================
const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/db1um6goq3uwrgdn7nq7l9el31p2iudx";

// ============================================
// 3.1 بيانات اعتماد Meta WhatsApp (سيتم تعبئتها لاحقاً)
// ============================================
// سنقوم بإضافة Permanent Access Token و Phone Number ID لاحقاً
let META_ACCESS_TOKEN = ""; // سيتم تعبئته من متغيرات البيئة أو لاحقاً
let META_PHONE_NUMBER_ID = ""; // سيتم تعبئته لاحقاً

// ============================================
// 4. واجهة ترحيبية (Dashboard)
// ============================================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
       <head>
        <title>منصة الرد الذكي - Evarial Cortex</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; direction: rtl; }
            .container { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .status { background: #4CAF50; color: white; padding: 10px; border-radius: 5px; margin: 20px 0; }
            .test-area { background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            input, button { padding: 10px; margin: 5px; font-size: 16px; }
            input { width: 70%; border: 1px solid #ddd; border-radius: 5px; }
            button { background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #1976D2; }
            .result { background: #fff3e0; padding: 15px; border-radius: 5px; margin-top: 20px; white-space: pre-wrap; }
            .info { background: #e8eaf6; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Evarial Cortex - منصة الرد الذكي</h1>
            <div class="status">✅ الخادم يعمل بنجاح | Meta Webhook جاهز</div>
            <div class="info">
                <strong>📌 معلومات:</strong><br>
                • هذا النظام متكامل مع واتساب عبر Meta API<br>
                • يمكنك إرسال رسالة تجريبية من هنا أو من حساب واتساب المرتبط<br>
                • النظام يستخدم الذكاء الاصطناعي لفهم رسالتك والرد عليها بجميع اللغات
            </div>
            <div class="test-area">
                <h3>💬 جرب النظام الآن (محاكي)</h3>
                <input type="text" id="message" placeholder="اكتب رسالتك هنا... مثال: مرحباً، كم سعر المنتج؟">
                <button onclick="sendMessage()">إرسال</button>
                <div id="result" class="result" style="display:none;"></div>
            </div>
        </div>
        <script>
            async function sendMessage() {
                const message = document.getElementById('message').value;
                const resultDiv = document.getElementById('result');
                if (!message) { alert('الرجاء كتابة رسالة'); return; }
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '⏳ جاري المعالجة...';
                try {
                    const response = await fetch('/webhook/demo_customer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message,
                            platform: 'web_demo',
                            senderId: 'demo_' + Date.now(),
                            senderName: 'مستخدم تجريبي'
                        })
                    });
                    const result = await response.json();
                    resultDiv.innerHTML = '📨 <strong>الرد:</strong><br>' + result.reply;
                } catch (error) {
                    resultDiv.innerHTML = '❌ خطأ: ' + error.message;
                }
            }
        </script>
    </body>
    </html>
  `);
});

// ============================================
// 5. نقطة التحقق من Webhook لميتا (WhatsApp API)
// ============================================
// هذا المسار (Endpoint) هو الذي ستتواصل معه Meta للتحقق من صحة الرابط
// Verify Token (رمز التحقق) يجب أن يكون مطابقاً لما هو مدخل في لوحة تحكم Meta
app.get("/webhook", (req, res) => {
  const verifyToken = "Automatix2026"; // استخدم الرمز الجديد الذي طلبته

  // استخراج المعاملات (parameters) من طلب التحقق
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // التحقق من صحة الطلب
  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified successfully with Meta!");
    res.status(200).send(challenge); // يجب إرسال التحدي (challenge) كما هو
  } else {
    console.log("❌ Webhook verification failed. Invalid token or mode.");
    res.sendStatus(403); // Forbidden
  }
});

// ============================================
// 6. نقطة استقبال الرسائل من ميتا (WhatsApp Webhook)
// ============================================
// عندما يرسل عميل رسالة عبر واتساب، سترسلها Meta إلى هذا المسار
app.post("/webhook", (req, res) => {
  const body = req.body;

  console.log("📨 Received webhook from Meta:", JSON.stringify(body, null, 2));

  // التأكد من أن الحدث (event) هو من حساب واتساب تجاري
  if (body.object === "whatsapp_business_account") {
    // معالجة كل الإدخالات (entries) في الجسم
    body.entry.forEach(async (entry) => {
      // استخراج التغييرات (changes)
      const changes = entry.changes;
      if (changes && changes[0] && changes[0].value) {
        const messageObj = changes[0].value.messages;
        // التأكد من وجود رسالة
        if (messageObj && messageObj[0]) {
          const message = messageObj[0];
          const from = message.from; // رقم هاتف المرسل
          const text = message.text?.body || "⚠️ رسالة بدون نص (قد تكون صورة أو مقطع)";

          console.log(`💬 WhatsApp Message from ${from}: ${text}`);

          // ==========================================
          // هنا نبدأ عملية المعالجة الذكية للرسالة
          // ==========================================
          
          // 1. إرسال الرسالة إلى Make.com لتحليلها عبر OpenAI
          // 2. الحصول على الرد المناسب
          // 3. إرسال الرد مرة أخرى إلى العميل عبر Meta API
          
          // مؤقتاً، نرسل رداً بسيطاً للتأكد من أن الاستقبال يعمل
          // سنقوم لاحقاً باستبدال هذا الرد بالتكامل مع Make.com
          const aiReply = "شكراً لتواصلك مع Evarial Cortex! نظام الرد الذكي يعمل الآن. كيف يمكنني مساعدتك؟";

          // استدعاء دالة إرسال الرد
          await sendWhatsAppMessage(from, aiReply);
        }
      }
    });
    // إرسال استجابة 200 لإعلام Meta بأننا استلمنا الرسالة بنجاح
    res.sendStatus(200);
  } else {
    // إذا كان الطلب ليس من واتساب، نرفضه
    res.sendStatus(404);
  }
});

// ============================================
// 6.1 دالة مساعدة لإرسال الرد عبر واتساب API
// ============================================
// هذه الدالة ستقوم بالتواصل مع Meta API لإرسال الرسالة إلى العميل
async function sendWhatsAppMessage(to, message) {
  // TODO: سيتم استبدال هذه القيم بالقيم الفعلية بعد الحصول عليها من Meta
  const accessToken = META_ACCESS_TOKEN;
  const phoneNumberId = META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("❌ Meta credentials are missing. Please set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { body: message },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (response.ok) {
      console.log(`✅ Message sent successfully to ${to}`);
    } else {
      console.error(`❌ Failed to send message to ${to}:`, result);
    }
  } catch (error) {
    console.error(`❌ Error sending message to ${to}:`, error);
  }
}

// ============================================
// 7. نقطة الاستقبال الرئيسية للتجارب عبر الويب (نظام العميل التجريبي)
// ============================================
app.post("/webhook/:customerId", async (req, res) => {
  const customerId = req.params.customerId;
  const { message, platform, senderId, senderName } = req.body;

  console.log(`📩 استلام رسالة من ${senderName || customerId}: ${message}`);

  // منع تكرار المعالجة
  const requestKey = `${customerId}_${senderId}_${message.substring(0, 30)}`;
  if (recentRequests.has(requestKey)) {
    return res.status(200).send("Duplicate ignored");
  }
  recentRequests.set(requestKey, Date.now());
  setTimeout(() => recentRequests.delete(requestKey), 10000);

  // التحقق من اشتراك العميل
  let customer;
  if (customerId === "demo_customer") {
    customer = {
      id: "demo_customer",
      business_name: "متجر تجريبي",
      subscription_status: "active",
      subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      business_info: {},
      preferred_language: "ar"
    };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    
    if (error || !data) {
      return res.status(403).json({
        reply: "عذراً، هذا الحساب غير موجود. يرجى التسجيل في الموقع الرسمي.",
      });
    }
    customer = data;
    const subscriptionActive = customer.subscription_status === "active" && new Date(customer.subscription_end) > new Date();
    if (!subscriptionActive) {
      return res.status(403).json({
        reply: "اشتراكك منتهي. يرجى تجديد اشتراكك عبر الموقع الرسمي.",
      });
    }
  }

  // إرسال إلى Make.com
  try {
    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId,
        message: message,
        platform: platform,
        senderId: senderId,
        senderName: senderName,
        businessInfo: customer.business_info || {},
        language: customer.preferred_language || "ar",
      }),
    });

    const responseText = await makeResponse.text();
    let makeResult;
    try {
      makeResult = JSON.parse(responseText);
    } catch (e) {
      makeResult = { reply: responseText };
    }

    // ==========================================
    // نظام ذكي لاستخراج الرد
    // ==========================================
    let finalReply = "شكراً لتواصلك. سيتم الرد عليك قريباً.";
    let finalEmotion = "neutral";
    let finalIntent = "other";
    let finalLanguage = "ar";
    let needsHuman = false;
    let collectedData = {};

    // دالة ذكية لاستخراج البيانات من رد OpenAI
    function extractFromOpenAI(data) {
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        try {
          const parsed = JSON.parse(content);
          return {
            reply: parsed.reply || content,
            emotion: parsed.emotion || "neutral",
            intent: parsed.intent || "other",
            language: parsed.language || "ar",
            needs_human: parsed.needs_human || false,
            collected_data: parsed.collected_data || {}
          };
        } catch(e) {
          return { reply: content, emotion: "neutral", intent: "other", language: "ar", needs_human: false, collected_data: {} };
        }
      }
      if (data.reply) {
        return {
          reply: data.reply,
          emotion: data.emotion || "neutral",
          intent: data.intent || "other",
          language: data.language || "ar",
          needs_human: data.needs_human || false,
          collected_data: data.collected_data || {}
        };
      }
      if (typeof data === 'string') {
        return { reply: data, emotion: "neutral", intent: "other", language: "ar", needs_human: false, collected_data: {} };
      }
      return { reply: JSON.stringify(data), emotion: "neutral", intent: "other", language: "ar", needs_human: false, collected_data: {} };
    }

    const extracted = extractFromOpenAI(makeResult);
    finalReply = extracted.reply;
    finalEmotion = extracted.emotion;
    finalIntent = extracted.intent;
    finalLanguage = extracted.language;
    needsHuman = extracted.needs_human;
    collectedData = extracted.collected_data;

    console.log(`🌐 اللغة: ${finalLanguage}`);
    console.log(`😊 المشاعر: ${finalEmotion}`);
    console.log(`🎯 النية: ${finalIntent}`);
    console.log(`👤 بيانات مجمعة:`, collectedData);
    if (needsHuman) {
      console.log(`⚠️ تنبيه: هذه الحالة تحتاج تدخل بشري!`);
    }

    // دالة إضافية لاستخراج الرد النصي من أي هيكل
    function extractReply(data) {
      if (typeof data === 'string') return data;
      if (data.reply) return data.reply;
      if (data.result) {
        if (typeof data.result === 'string') {
          try { return JSON.parse(data.result).reply || data.result; }
          catch(e) { return data.result; }
        }
        if (data.result.reply) return data.result.reply;
      }
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        if (typeof content === 'string') {
          try { 
            const parsed = JSON.parse(content);
            return parsed.reply || content;
          } catch(e) { return content; }
        }
        if (content.reply) return content.reply;
      }
      if (data.message) return data.message;
      if (data.text) return data.text;
      return JSON.stringify(data);
    }

    finalReply = extractReply(makeResult);
    
    if (makeResult.emotion) finalEmotion = makeResult.emotion;
    else if (makeResult.result && makeResult.result.emotion) finalEmotion = makeResult.result.emotion;
    else if (makeResult.choices && makeResult.choices[0] && makeResult.choices[0].message) {
      try {
        const parsed = JSON.parse(makeResult.choices[0].message.content);
        if (parsed.emotion) finalEmotion = parsed.emotion;
        if (parsed.intent) finalIntent = parsed.intent;
      } catch(e) {}
    }
    
    if (makeResult.intent) finalIntent = makeResult.intent;
    else if (makeResult.result && makeResult.result.intent) finalIntent = makeResult.result.intent;

    console.log(`🤖 الرد: ${finalReply}`);
    
    res.json({
      reply: finalReply,
      emotion: finalEmotion,
      intent: finalIntent,
      language: finalLanguage,
      needs_human: needsHuman,
      collected_data: collectedData
    });
  } catch (error) {
    console.error("Make.com error:", error);
    res.json({
      reply: "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى لاحقاً.",
      emotion: "neutral",
      intent: "other",
    });
  }
});

// ============================================
// 8. نقطة فحص صحة الخادم (Health Check)
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "active", timestamp: new Date().toISOString() });
});

// ============================================
// 9. نقطة اختبار الاتصال بـ Make.com
// ============================================
app.get("/test-make", async (req, res) => {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "مرحباً، أريد اختبار النظام",
        platform: "test",
        senderId: "test123",
        senderName: "مستخدم تجريبي"
      }),
    });
    
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch(e) {
      result = { reply: responseText };
    }
    
    res.json({ success: true, makeResponse: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================================
// 10. تشغيل الخادم
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 الخادم المركزي Evarial Cortex يعمل على المنفذ ${PORT}`);
  console.log(`✅ جاهز لاستقبال الطلبات من العملاء وWebhooks من Meta`);
  console.log(`🔗 رابط التحقق من الصحة: https://my-node-app-production-5923.up.railway.app/health`);
  console.log(`🔗 رابط Webhook لميتا: https://my-node-app-production-5923.up.railway.app/webhook`);
});
