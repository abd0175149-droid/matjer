# متجر — إكسسوارات الذهب التقليدي 🏷️

متجر إلكتروني متخصص في بيع إكسسوارات الذهب التقليدي (الروسي والصيني) — أطقم، خواتم، أساور، قلادات — مع **نظام ERP** لإدارة المنتجات والمخزون والطلبات في منظومة واحدة متزامنة.

> **الحالة:** أساس متكامل قابل للتشغيل (MVP foundation) — متجر + باكند + لوحة إدارة، يعمل end-to-end.

## الستاك التقني

- **الواجهة:** Next.js 14 (App Router, TypeScript, Tailwind, RTL عربي) — متجر + لوحة `/admin`
- **الباكند:** NestJS (TypeScript) — REST `/api` + JWT + RBAC + Prisma
- **قاعدة البيانات:** PostgreSQL 16 + Redis
- **النشر:** Docker Compose عبر Cloudflare Tunnel — `https://sooq.grade.sbs`

## بنية المشروع

```
matjer/
├── backend/          # NestJS API + Prisma (auth, catalog, inventory, orders, cart)
├── frontend/         # Next.js storefront + admin
├── docker-compose.yml
├── deploy.sh
├── .env.example
└── mds/              # التوثيق الكامل (00–12)
```

## التشغيل محلياً (تطوير)

```bash
# باكند
cd backend && npm install && npx prisma generate
# شغّل Postgres+Redis (عبر docker أو محلياً) واضبط DATABASE_URL/REDIS_URL
npx prisma db push && npm run db:seed && npm run start:dev

# واجهة (نافذة أخرى)
cd frontend && npm install && npm run dev   # http://localhost:3020
```

## النشر على السيرفر

```bash
cp .env.example .env   # اضبط القيم
docker compose build --pull && docker compose up -d
docker compose exec backend npm run db:seed
# ثم ربط Cloudflare Tunnel (انظر mds/11 + mds/12)
```

أو عبر السكربت: `./deploy.sh`

## الوحدات الجاهزة (MVP foundation)

- **المتجر:** رئيسية، تصنيفات + فلترة/فرز، صفحة منتج، سلة، دفع (COD)، تتبّع طلب.
- **الإدارة:** دخول، لوحة معلومات، إدارة منتجات، إدارة طلبات (تغيير الحالة).
- **المحرّك:** حجز مخزون + قفل صفوف (منع البيع المزدوج)، آلة حالات الطلب، RBAC، seed لأدوار/صلاحيات/منتجات.

## التوثيق

كل التفاصيل في [`mds/`](mds/): النظرة العامة (01)، البنية (02)، الميزات (03)، ERP (04)، قاعدة البيانات (05)، دورة الطلب (06)، الأمان (07)، الخطة (08)، التكاملات (09)، الصلاحيات (10)، **السيرفر والنشر (11)**، **خطة البناء التنفيذية (12)**.
