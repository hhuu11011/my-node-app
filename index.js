// ============================================
// الخادم المركزي لمنصة الرد الذكي
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
// 4. نقطة الاستقبال الرئيسية
// ============================================
app.post("/webhook/:customerId", async (req, res) => {
  const customerId = req.params.customerId;
  const { message, platform, senderId, senderName } = req.body;

  // منع تكرار المعالجة
  const requestKey = `${customerId}_${senderId}_${message.substring(0, 30)}`;
  if (recentRequests.has(requestKey)) {
    return res.status(200).send("Duplicate ignored");
  }
  recentRequests.set(requestKey, Date.now());
  setTimeout(() => recentRequests.delete(requestKey), 10000);

  // التحقق من اشتراك العميل
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (error || !customer) {
    return res.status(403).json({
      reply: "عذراً، هذا الحساب غير موجود. يرجى التسجيل في الموقع الرسمي.",
    });
  }

  const subscriptionActive =
    customer.subscription_status === "active" &&
    new Date(customer.subscription_end) > new Date();

  if (!subscriptionActive) {
    return res.status(403).json({
      reply:
        "اشتراكك منتهي. يرجى تجديد اشتراكك عبر الموقع الرسمي لتستمر في استخدام الخدمة.",
    });
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
        language: customer.preferred_language || "auto",
      }),
    });

    // محاولة قراءة الرد حتى لو لم يكن JSON صحيحاً
    let makeResult;
    const responseText = await makeResponse.text();
    
    try {
      makeResult = JSON.parse(responseText);
    } catch (e) {
      // إذا لم يكن JSON صحيحاً، نستخدم النص كرد
      makeResult = { reply: responseText };
    }

    // ==========================================
    // معالجة الرد من Make.com
    // ==========================================
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
// 5. نقطة فحص صحة الخادم
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "active", timestamp: new Date().toISOString() });
});

// ============================================
// 6. نقطة اختبار الاتصال بـ Make.com
// ============================================
app.get("/test-make", async (req, res) => {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "هذه رسالة اختبار من الخادم",
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
// 7. تشغيل الخادم
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`الخادم المركزي يعمل على المنفذ ${PORT}`);
  console.log(`جاهز لاستقبال الطلبات من العملاء`);
});
