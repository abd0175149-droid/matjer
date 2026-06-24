#!/bin/bash
# ═══════════════ matjer — سكربت النشر ═══════════════
set -e

echo "🛒 ═══════════════════════════════════════"
echo "   matjer — Deployment"
echo "═══════════════════════════════════════════"

# 1) آخر تحديثات الكود
echo ""
echo "1️⃣  سحب آخر تحديثات من GitHub..."
git pull origin main

# 2) التحقق من .env
if [ ! -f .env ]; then
  echo "⚠️  لا يوجد .env — أُنشئ من القالب. اضبط القيم ثم أعد التشغيل."
  cp .env.example .env
  exit 1
fi

# 3) بناء الحاويات (build cache أخف على الذاكرة — errata C-5)
echo ""
echo "2️⃣  بناء الحاويات..."
docker compose build --pull

# 4) التشغيل
echo ""
echo "3️⃣  تشغيل/استبدال الحاويات..."
docker compose up -d --force-recreate

# 5) مزامنة المخطّط + السيد (idempotent)
echo ""
echo "4️⃣  مزامنة قاعدة البيانات وبيانات البذرة..."
sleep 6
docker compose exec -T backend npx prisma db push --skip-generate || true
docker compose exec -T backend npm run db:seed || true

# 6) تنظيف
echo ""
echo "5️⃣  تنظيف صور Docker القديمة..."
docker image prune -f

# 7) التحقق
echo ""
echo "6️⃣  حالة الخدمات:"
docker compose ps

echo ""
echo "✅ تم النشر — https://sooq.grade.sbs"
