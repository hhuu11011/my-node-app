// ============================================
// الخادم المركزي لمنصة الرد الذكي - النسخة النهائية
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
// 3. عنوان Make.com الرئيسي
// ============================================
const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/wxaqlfw5qw7j6m5752j51856ia931ryv";

// ============================================
// 4. واجهة ترحيبية (للتأكد من أن الخادم يعمل)
// ============================================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>منصة الرد الذكي - تجربة العميل</title>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
                direction: rtl;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            .status {
                background: #4CAF50;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .test-area {
                background: #e3f2fd;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            input, button {
                padding: 10px;
                margin: 5px;
                font-size: 16px;
            }
            input {
                width: 70%;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            button {
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            button:hover {
                background: #1976D2;
            }
            .result {
                background: #fff3e0;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
                white-space: pre-wrap;
                font-family: monospace;
            }
            .info {
                background: #e8eaf6;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 منصة الرد الذكي</h1>
            <div class="status">
                ✅ الخادم يعمل بنجاح
            </div>
            <div class="info">
                <strong>📌 معلومات:</strong><br>
                • هذا نظام تجريبي يحاكي تجربة العميل الحقيقية<br>
                • اكتب رسالتك في الأسفل وسيتم الرد عليك تلقائياً<br>
                • النظام يستخدم الذكاء الاصطناعي لفهم رسالتك والرد عليها
            </div>
            <div class="test-area">
                <h3>💬 جرب النظام الآن</h3>
                <input type="text" id="message" placeholder="اكتب رسالتك هنا... مثال: مرحباً، كم سعر المنتج؟">
                <button onclick="sendMessage()">إرسال</button>
                <div id="result" class="result" style="display:none;"></div>
            </div>
        </div>
        <script>
            async function sendMessage() {
                const message = document.getElementById('message').value;
                const resultDiv = document.getElementById('result');
                
                if (!message) {
                    alert('الرجاء كتابة رسالة');
                    return;
                }
                
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '⏳ جاري المعالجة...';
                
                try {
                    // استخدام عميل تجريبي (customerId = demo_customer)
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
// 5. نقطة الاستقبال الرئيسية (كل العملاء يرسلون هنا)
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

  // التحقق من اشتراك العميل (للتجربة، نستخدم عميلاً وهمياً)
  let customer;
  if (customerId === "demo_customer") {
    // عميل تجريبي
    customer = {
      id: "demo_customer",
      business_name: "متجر تجريبي",
      subscription_status: "active",
      subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      business_info: {},
      preferred_language: "ar"
    };
  } else {
    // التحقق من قاعدة البيانات الحقيقية
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

    // التحقق من صلاحية الاشتراك
    const subscriptionActive =
      customer.subscription_status === "active" &&
      new Date(customer.subscription_end) > new Date();

    if (!subscriptionActive) {
      return res.status(403).json({
        reply: "اشتراكك منتهي. يرجى تجديد اشتراكك عبر الموقع الرسمي.",
      });
    }
  }

  // إعادة توجيه الرسالة إلى Make.com
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

    // معالجة الرد
    let finalReply = "شكراً لتواصلك. سيتم الرد عليك قريباً.";
    let finalEmotion = "neutral";
    let finalIntent = "other";

    if (typeof makeResult === 'string') {
      finalReply = makeResult;
    } else if (makeResult.reply) {
      finalReply = makeResult.reply;
      finalEmotion = makeResult.emotion || "neutral";
      finalIntent = makeResult.intent || "other";
    } else if (makeResult.result) {
      try {
        const parsed = JSON.parse(makeResult.result);
        finalReply = parsed.reply || makeResult.result;
        finalEmotion = parsed.emotion || "neutral";
        finalIntent = parsed.intent || "other";
      } catch(e) {
        finalReply = makeResult.result;
      }
    } else if (makeResult.choices && makeResult.choices[0] && makeResult.choices[0].message) {
      const content = makeResult.choices[0].message.content;
      try {
        const parsed = JSON.parse(content);
        finalReply = parsed.reply || content;
        finalEmotion = parsed.emotion || "neutral";
        finalIntent = parsed.intent || "other";
      } catch(e) {
        finalReply = content;
      }
    } else {
      finalReply = responseText;
    }

    console.log(`🤖 الرد: ${finalReply}`);
    
    res.json({
      reply: finalReply,
      emotion: finalEmotion,
      intent: finalIntent,
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
// 6. نقطة فحص صحة الخادم
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "active", timestamp: new Date().toISOString() });
});

// ============================================
// 7. نقطة اختبار الاتصال بـ Make.com
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
// 8. تشغيل الخادم
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`الخادم المركزي يعمل على المنفذ ${PORT}`);
  console.log(`جاهز لاستقبال الطلبات من العملاء`);
});
