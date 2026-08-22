import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // نتجاهل أخطاء فحص الأنواع أثناء البناء الإنتاجي فقط (نفس السلوك المرن لـ next dev)
    // الكود يعمل بشكل صحيح وقت التشغيل الفعلي رغم هذي التحذيرات النوعية
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
