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
// ⚠️ استبدل هذه القيم بقيم حسابك في Supabase
const supabaseUrl = "https://wwlzblztysghxxlgxcnp.supabase.co"; // من إعدادات Supabase
const supabaseKey = "sb_publishable_5owjaAAZadbSrA7Zstd7dg_V2-zXKR9"; // من إعدادات Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// 2. تخزين مؤقت للطلبات (لمنع التكرار)
// ============================================
const recentRequests = new Map(); // لمنع معالجة نفس الرسالة مرتين

// ============================================
// 3. عنوان Make.com الرئيسي (سيناريوك الرئيسي)
// ============================================
const MAKE_WEBHOOK_URL =
  "https://hook.eu1.make.com/wxaqlfw5qw7j6m5752j51856ia931ryv"; // استبدله برابط السيناريو الرئيسي على Make.com

// ============================================
// 4. نقطة الاستقبال الرئيسية (كل العملاء يرسلون هنا)
// ============================================
app.post("/webhook/:customerId", async (req, res) => {
  const customerId = req.params.customerId;
  const { message, platform, senderId, senderName } = req.body;

  // منع تكرار المعالجة (نفس الرسالة خلال 10 ثوانٍ)
  const requestKey = `${customerId}_${senderId}_${message.substring(0, 30)}`;
  if (recentRequests.has(requestKey)) {
    return res.status(200).send("Duplicate ignored");
  }
  recentRequests.set(requestKey, Date.now());
  setTimeout(() => recentRequests.delete(requestKey), 10000);

  // ==========================================
  // 5. التحقق من اشتراك العميل
  // ==========================================
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

  // التحقق من صلاحية الاشتراك
  const subscriptionActive =
    customer.subscription_status === "active" &&
    new Date(customer.subscription_end) > new Date();

  if (!subscriptionActive) {
    return res.status(403).json({
      reply:
        "اشتراكك منتهي. يرجى تجديد اشتراكك عبر الموقع الرسمي لتستمر في استخدام الخدمة.",
    });
  }

  // ==========================================
  // 6. إعادة توجيه الرسالة إلى Make.com للمعالجة الذكية
  // ==========================================
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

    const makeResult = await makeResponse.json();

    // إرسال الرد النهائي
    res.json({
      reply: makeResult.reply || "شكراً لتواصلك. سيتم الرد عليك قريباً.",
      emotion: makeResult.emotion,
      intent: makeResult.intent,
    });
  } catch (error) {
    console.error("Make.com error:", error);
    res.json({
      reply: "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى لاحقاً.",
    });
  }
});

// ============================================
// 7. نقطة للتحقق من صحة الخادم (للتأكد من أنه يعمل)
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "active", timestamp: new Date().toISOString() });
});

// ============================================
// 8. نقطة اختبار الاتصال بـ Make.com (للتجربة فقط)
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
    const result = await response.json();
    res.json({ success: true, makeResponse: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================================
// 9. تشغيل الخادم
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`الخادم المركزي يعمل على المنفذ ${PORT}`);
  console.log(`جاهز لاستقبال الطلبات من العملاء`);
});
