// ============================================
// الخادم المركزي لمنصة الرد الذكي - Automatix
// الإصدار النهائي المتكامل مع Meta WhatsApp API
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
// 3. عنوان Make.com الرئيسي (الذكاء الاصطناعي)
// ============================================
const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/db1um6goq3uwrgdn7nq7l9el31p2iudx";

// ============================================
// 4. بيانات اعتماد Meta WhatsApp (من متغيرات البيئة)
// ============================================
// يتم قراءة الرمز المميز من متغيرات البيئة في Railway
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
// رقم تعريف رقم الهاتف التجاري (ضع الرقم الصحيح هنا)
const META_PHONE_NUMBER_ID = "1107617902441383"; // ⚠️ استبدل هذا بالرقم الصحيح من ميتا
// رقم الهاتف التجاري (للتوثيق فقط)
const META_BUSINESS_PHONE_NUMBER = "+966531138572"; // ⚠️ استبدل هذا برقم هاتفك التجاري

// ============================================
// 5. واجهة ترحيبية (Dashboard)
// ============================================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>منصة الرد الذكي - Automatix</title>
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
            <h1>🤖 Automatix - منصة الرد الذكي</h1>
            <div class="status">✅ الخادم يعمل بنجاح | متكامل مع Meta WhatsApp</div>
            <div class="info">
                <strong>📌 معلومات:</strong><br>
                • نظام ردود ذكي لخدمة العملاء عبر واتساب<br>
                • يستخدم الذكاء الاصطناعي لفهم رسالتك والرد عليها بجميع اللغات
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
// 6. نقطة التحقق من Webhook لميتا (GET)
// ============================================
app.get("/webhook", (req, res) => {
  const verifyToken = "Automatix2026";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`📞 Webhook verification request - mode: ${mode}, token: ${token}`);

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verified successfully with Meta!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed.");
    res.sendStatus(403);
  }
});

// ============================================
// 7. نقطة استقبال الرسائل من واتساب (POST)
// ============================================
app.post("/webhook", async (req, res) => {
  const body = req.body;
  console.log("📨 Received webhook from Meta:", JSON.stringify(body, null, 2));

  // الرد فوراً لإعلام ميتا باستلام الرسالة (يمنع التكرار)
  res.sendStatus(200);

  // معالجة الرسالة في الخلفية (حتى لا نؤخر الرد على ميتا)
  setImmediate(async () => {
    try {
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (value && value.messages && value.messages[0]) {
              const message = value.messages[0];
              const from = message.from;
              const text = message.text?.body || "";

              if (!text) {
                console.log("⚠️ Received non-text message (image, audio, etc.)");
                return;
              }

              console.log(`💬 WhatsApp Message from ${from}: "${text}"`);

              // ==========================================
              // معالجة الرسالة عبر الذكاء الاصطناعي
              // ==========================================
              let aiReply = "شكراً لتواصلك مع Automatix. كيف يمكنني مساعدتك؟";

              try {
                // إرسال الرسالة إلى Make.com
                const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: text,
                    platform: "whatsapp",
                    senderId: from,
                    senderName: "عميل واتساب",
                    language: "auto"
                  }),
                });

                const responseText = await makeResponse.text();
                
                // محاولة استخراج الرد من Make.com
                try {
                  const makeResult = JSON.parse(responseText);
                  aiReply = makeResult.reply || makeResult.message || responseText;
                } catch (e) {
                  aiReply = responseText;
                }

                console.log(`🤖 AI Reply: "${aiReply.substring(0, 100)}..."`);

                // إرسال الرد إلى العميل
                await sendWhatsAppMessage(from, aiReply);
              } catch (error) {
                console.error("❌ Error processing message with Make.com:", error);
                await sendWhatsAppMessage(from, "عذراً، حدث خطأ تقني. يرجى المحاولة لاحقاً.");
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in webhook processing:", error);
    }
  });
});

// ============================================
// 8. دالة إرسال الرد عبر Meta API
// ============================================
async function sendWhatsAppMessage(to, message) {
  // التحقق من وجود بيانات الاعتماد
  if (!META_ACCESS_TOKEN) {
    console.error("❌ META_ACCESS_TOKEN is missing! Please add it in Railway Variables.");
    return false;
  }

  if (!META_PHONE_NUMBER_ID || META_PHONE_NUMBER_ID === "1107617902441383") {
    console.error("❌ META_PHONE_NUMBER_ID is not set correctly! Please update it in the code.");
    return false;
  }

  const url = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`;

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { body: message.substring(0, 4096) }, // الحد الأقصى لطول الرسالة
  };

  try {
    console.log(`📤 Sending message to ${to}: "${message.substring(0, 50)}..."`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ Message sent successfully to ${to}`);
      return true;
    } else {
      console.error(`❌ Failed to send message to ${to}:`, result);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error sending message to ${to}:`, error);
    return false;
  }
}

// ============================================
// 9. نقطة الاستقبال للتجارب عبر الويب
// ============================================
app.post("/webhook/:customerId", async (req, res) => {
  const customerId = req.params.customerId;
  const { message, platform, senderId, senderName } = req.body;

  console.log(`📩 استلام رسالة من ${senderName || customerId}: ${message}`);

  const requestKey = `${customerId}_${senderId}_${message.substring(0, 30)}`;
  if (recentRequests.has(requestKey)) {
    return res.status(200).send("Duplicate ignored");
  }
  recentRequests.set(requestKey, Date.now());
  setTimeout(() => recentRequests.delete(requestKey), 10000);

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
    let finalReply = "شكراً لتواصلك. سيتم الرد عليك قريباً.";

    try {
      const makeResult = JSON.parse(responseText);
      finalReply = makeResult.reply || makeResult.message || responseText;
    } catch (e) {
      finalReply = responseText;
    }

    console.log(`🤖 الرد: ${finalReply.substring(0, 100)}`);
    
    res.json({
      reply: finalReply,
    });
  } catch (error) {
    console.error("Make.com error:", error);
    res.json({
      reply: "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى لاحقاً.",
    });
  }
});

// ============================================
// 10. نقطة فحص صحة الخادم
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "active", timestamp: new Date().toISOString() });
});

// ============================================
// 11. نقطة اختبار الاتصال بـ Make.com
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
// 12. تشغيل الخادم
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 خادم Automatix يعمل على المنفذ ${PORT}`);
  console.log(`✅ جاهز لاستقبال الطلبات وWebhooks من Meta`);
  console.log(`🔗 رابط التحقق: https://my-node-app-production-5923.up.railway.app/health`);
  console.log(`🔗 رابط Webhook: https://my-node-app-production-5923.up.railway.app/webhook`);
  console.log(`========================================\n`);
});
