# 12 — خطة البناء التنفيذية (Build Plan)

> **هذا الملف هو الخطة التنفيذية المتكاملة لبناء مشروع matjer.** بُني بالاعتماد الكامل على وثائق `mds/00` إلى `mds/11` كمرجع موثّق وملزِم — كل قرار هنا يستند إلى وثيقة ويستشهد بها (مثل: «حسب mds/05»). عند أي تعارض، **الوثائق من 00 إلى 11 هي المرجع الأعلى**، وهذا الملف يترجمها إلى blueprint تنفيذي.

> **آخر تحديث:** 2026-06-24.

## القرارات المثبّتة (Locked Decisions)

| البند | القرار | المرجع |
|-------|--------|--------|
| الواجهة | Next.js (App Router, TS, Tailwind, RTL) | mds/02 |
| الباكند | Node.js + NestJS (TS), REST `/api`, JWT+Refresh | mds/02, mds/07 |
| ORM | Prisma | mds/05, mds/07 |
| قاعدة البيانات | PostgreSQL 16 | mds/02, mds/05 |
| الكاش/السلة | Redis | mds/02, mds/07 |
| البحث | Meilisearch | mds/02, mds/03 |
| الحزم | npm | mds/11 |
| النشر | Docker Compose + Cloudflare Tunnel على `mafia-prod` | mds/11 |
| المنافذ | frontend 3020 · backend 4002 · postgres 5436 · redis 6383 (127.0.0.1) | mds/11 |
| النطاق المرحلي | MVP أولاً ثم التوسّع | mds/08 |

## قرارات توحيدية ملزِمة (Errata — تَسبِق كل ما بعدها)

> هذه القرارات تحلّ التناقضات التي رصدتها المراجعة النقدية (الملحق أ). **عند أي تعارض بين قسم لاحق وهذه الكتلة، هذه الكتلة هي المرجع.** الرموز (C-x/R-x/G-x) تشير لبنود الملحق أ.

**أ. اتفاقيات موحّدة (تكسر البناء إن أُهملت):**
- **بادئة API** (C-1): تُعتمد **`/api`** بلا نسخة في الـ MVP (مطابقة mds/11 §4.3 وأغلب الأقسام)؛ `setGlobalPrefix('api')` وعميل الواجهة على `/api`. الـ versioning مؤجّل. كل ذِكر لـ `/api/v1` في الأقسام يُقرأ كـ `/api`.
- **صيغة مفاتيح الصلاحيات** (C-10): **`resource.action` بالنقطة** حصراً (مثل `products.write`)، تُخزَّن في `permissions.name` وتُطابَق في `PermissionsGuard` و`<Can>`. أي `resource:action` بنقطتين يُصحَّح إلى نقطة.
- **قيم الـ enums** (C-2): **لاتينية في قاعدة البيانات** (`OrderStatus`, `PaymentStatus`, `PaymentMethod`, `StockMovementType`)، والعربية للعرض فقط عبر طبقة ترجمة في الواجهة.
- **العنونة داخل شبكة Docker** (C-3, C-4): تُستخدم **أسماء الخدمات + المنافذ الداخلية**: `database:5432` و`redis:6379`. المنافذ `5436/6383` للوصول من المضيف (`127.0.0.1`) فقط. اسم خدمة القاعدة **`database`** (ليس `postgres`).
- **مصدر `DATABASE_URL`** (C-12): يُعرَّف صراحةً في `.env` و`.env.example` (يحتاجه Prisma CLI للـ migrations خارج الحاوية)، لا يُبنى داخل compose فقط.
- **العمّال (BullMQ)** (C-8): يعملون **داخل عملية backend نفسها** عبر `@nestjs/bullmq` (لا خدمة `worker` منفصلة في الـ MVP)؛ ملف compose يعكس ذلك.
- **عدد الحاويات** (C-7): النظام = تطبيقان (frontend + backend، واللوحة ضمن frontend) + خدمات بنية تحتية (`database`, `redis`, `meilisearch`) — وليس «حاويتين».
- **بناء النشر** (C-5): يُستخدم build cache افتراضياً (`docker compose build --pull`) لأنه أخف على ذاكرة السيرفر المحمّل؛ انحراف مُقَرّ عن قالب mds/11 §7.ج (`--no-cache`).

**ب. سلامة المخزون والتزامن (جوهر mds/06 — أخطر بند):**
- **منطق التأكيد** (R-1): `confirm()` يعيد التحقق من التوفّر الفعلي `stock_quantity >= quantity` (لا مقارنة بـ `reserved` فقط)، وكل الاستعلامات داخل نفس عميل `$transaction (tx)`.
- **ترتيب قفل عام ثابت** (R-2): في **كل** المسارات (reserve/confirm/release/restock/state-machine) — اقفل `orders` أولاً (بالـ id) ثم `product_variants` بترتيب `variant_id` تصاعدي. قاعدة معمارية ملزمة + اختبار تزامن.
- **توليد `order_number`** (R-11): عبر **Postgres SEQUENCE** (`nextval`) لا `COUNT(*)+1` (يمنع تكرار المفتاح الفريد تحت التزامن).
- **الطلبات لا تُحذف** (G1): تُلغى عبر آلة الحالات (تحرّر المخزون)؛ `deleted_at` للأرشفة الإدارية بعد الإلغاء فقط، لا بديلاً عن الإلغاء.

**ج. الدفع والتكاملات والأمان (تكسر صامتاً):**
- **Webhook raw body** (R-6): إنشاء التطبيق بـ `rawBody: true` واستثناء `/api/webhooks/*` من body-parser/ValidationPipe العام (وإلا يفشل التحقق من HMAC).
- **جداول/حقول ناقصة تُدرَج في schema (P1)** (R-7, R-8): الجداول `payment_events(charge_id UNIQUE)`, `integration_logs`, `shipping_zones`, `push_subscriptions`؛ وأعمدة على `orders`: `payment_reference, payment_provider, tracking_number, shipping_carrier, shipping_label_url, tax_amount, internal_notes`؛ وعلى `users`: `provider, provider_id, password_hash (nullable), tfa_secret, tfa_enabled`.
- **كاش Cloudflare للصفحات الخاصة** (R-13): مسارات `account/cart/checkout` تُرسل `Cache-Control: private, no-store` + قاعدة Cloudflare لاستثنائها من الكاش (منع تسريب الجلسة).
- **سرّ إعادة التحقق** (R-14): `REVALIDATE_SECRET` في `.env.example` يُتحقق منه في `POST /api/revalidate` ويُقيَّد على الشبكة الداخلية.
- **WAF/Rate-limit** (R-10): تفعيل قواعد Cloudflare على مستوى الدومين (إعداد تشغيلي قبل الإطلاق) كطبقة أولى + `throttler` كطبقة ثانية.

**د. إقرارات نطاق صريحة (G-بنود):**
- **العملة** (G5): أحادية في الـ MVP، مُعرّفة في `SettingsModule` (تعدّد العملات مؤجّل).
- **الضرائب** (G4): إعداد `tax_rate` اختياري في `SettingsModule` + عمود `tax_amount` على `orders` (افتراضي 0)؛ يُحسب في `PricingService`.
- **«وصل حديثاً»** (G2): فرز `created_at` تنازلياً ضمن نافذة (30 يوماً) بلا عمود؛ ويُضاف `sales_count` و`avg_rating` على `products` (تُحدَّث عبر events: order.confirmed / review.approved) لتمكين الفرز «الأكثر مبيعاً/الأعلى تقييماً».
- **المواصفات المتنوّعة** (G7): عمود `attributes JSONB` على `products` (خامة، عدد قطع الأطقم، قياسات).
- **الوسوم** (G3): مؤجّلة خارج MVP (غير مذكورة في mds/08) — أو جدولا `tags`/`product_tags` عند الحاجة.
- **تشفير الحقول الحساسة** (G9): الـ MVP يعتمد encryption-at-rest على مستوى القرص/volume؛ تشفير عمود-مستوى (pgcrypto) للـ PII مؤجّل ومُقَرّ.
- **كلمة المرور المؤقتة** (G11): تخص **المستخدمين الإداريين** المُنشَئين من `/admin/users` (إجبار تغييرها أول دخول)؛ عملاء المتجر يختارون كلمتهم.
- **تخزين الصور** (mds/02 §4): volume محلي/MinIO خلف Cloudflare بدل S3/Cloudinary — انحراف مُقَرّ بسبب قيود السيرفر.

## فهرس الخطة

1. المعمارية العامة وأسس المشروع
2. طبقة البيانات وقاعدة البيانات
3. وحدات الباكند (NestJS) ومنطق العمل
4. واجهة المتجر (Next.js Storefront)
5. لوحة الإدارة / ERP (واجهة)
6. التكاملات الخارجية والخدمات
7. البنية التحتية والنشر (DevOps)
8. الاختبار والأمان والجودة
9. خارطة الطريق والتنفيذ المرحلي
10. ملحق أ — مراجعة نقدية: ثغرات وتناقضات وتصحيحات

---

## 1. المعمارية العامة وأسس المشروع

### 1. المعمارية الكلية (Overall Architecture)

النظام يتبع معمارية **متعددة الطبقات (Layered) مع فصل تام بين الواجهة والخادم عبر REST API** (حسب mds/02 §1)، منشورة كـ monorepo واحد على Docker Compose خلف Cloudflare Tunnel (حسب mds/11 §4).

```
┌───────────────────────────────────────────────────────────────┐
│  الإنترنت → Cloudflare Edge (SSL طرفي + WAF + DDoS)            │  mds/11 §4
│            → cloudflared (ingress: /api/*,/uploads/* → :4002    │
│                                       الباقي → :3020)          │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│  طبقة العرض (Presentation) — frontend/ Next.js App Router       │  mds/02 §1
│  • Storefront (RTL، SSR/SSG)   • لوحة ERP (/admin، CSR محمية)   │
│  • طبقة API client (fetch wrapper) + إدارة حالة (Zustand)       │
└───────────────────────────────┬───────────────────────────────┘
                                │ REST /api/v1/*  (JWT في Header / refresh في httpOnly cookie)
┌───────────────────────────────▼───────────────────────────────┐
│  طبقة منطق العمل (Business Logic) — backend/ NestJS             │  mds/02 §1,§5
│  ┌─────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ Controllers  │  Guards/      │  Services     │  Domain logic │ │
│  │ (HTTP/DTO)   │  Interceptors │ (use-cases)   │ (inventory/   │ │
│  │              │  Pipes        │               │  orders…)     │ │
│  └─────────────┴──────────────┴──────────────┴───────────────┘ │
│  وحدات (Modules): auth, users, rbac, products, inventory,      │
│  orders, cart, ... + cross-cutting (audit, logger, config)     │
└───────────────────────────────┬───────────────────────────────┘
                                │ Prisma Client (type-safe, parameterized)  mds/07 §1
┌───────────────────────────────▼───────────────────────────────┐
│  طبقة البيانات (Data Layer)                                     │  mds/02 §1
│  PostgreSQL 16 (المصدر) · Redis (cache/session/cart/rate-limit) │
│  · Meilisearch (بحث) · uploads volume (صور WebP) خلف Cloudflare │
└───────────────────────────────────────────────────────────────┘
```

**مبادئ الفصل الملزِمة:**
- **الواجهة لا تتصل بقاعدة البيانات إطلاقاً** — كل وصول عبر `/api/v1` (mds/02 §1). الـ Storefront يستخدم SSR/SSG للـ SEO (mds/07 §2)، ولوحة ERP تُعرض كـ CSR محمي تحت مسار `/admin`.
- **التحقق من الصلاحية على مستوى الخادم حصراً** عبر Guards، وليس الواجهة فقط (mds/10 §6).
- **تدفق أحادي الاتجاه للبيانات داخل NestJS:** `Controller → Service → Repository(Prisma)`؛ المنطق الحساس (المخزون/الطلبات) داخل الـ Service ضمن transactions مع row-lock (mds/06 §3).
- **ORM = Prisma** (type-safe + migrations؛ يحقق متطلب parameterized queries في mds/07 §1) — أُكِّد مقابل TypeORM كقرار مثبّت.

---

### 2. هيكل المستودع التفصيلي (Monorepo Layout)

الجذر يطابق mds/11 §6 بالضبط. التفصيل الداخلي أدناه.

```
matjer/
├── backend/                          # NestJS API (mds/11 §6)
│   ├── Dockerfile                    # multi-stage: deps → build → runtime (node:20-alpine)
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── prisma/
│   │   ├── schema.prisma             # نماذج مطابقة لأسماء mds/05 (snake_case via @@map/@map)
│   │   ├── migrations/               # ترحيلات (npm run migration:run — mds/11 §7-ج)
│   │   └── seed.ts                   # roles/permissions/admin افتراضي (mds/10 §2)
│   └── src/
│       ├── main.ts                   # bootstrap: helmet, cors, ValidationPipe، global prefix api/v1
│       ├── app.module.ts
│       ├── common/                   # عناصر مشتركة (cross-cutting)
│       │   ├── decorators/           # @CurrentUser, @Roles, @Permissions, @Public, @Audit
│       │   ├── guards/               # JwtAuthGuard, RolesGuard, PermissionsGuard, TwoFactorGuard
│       │   ├── interceptors/         # ResponseInterceptor (الشكل الموحّد), AuditInterceptor, LoggingInterceptor
│       │   ├── filters/              # AllExceptionsFilter (شكل الخطأ الموحّد)
│       │   ├── pipes/                # ParseUuidPipe، تنظيف XSS (mds/07 §1)
│       │   └── dto/                  # PaginationDto, BaseResponseDto
│       ├── config/                   # @nestjs/config + Joi validation للـ env
│       │   ├── configuration.ts
│       │   └── env.validation.ts
│       ├── prisma/                   # PrismaModule + PrismaService (global)
│       ├── modules/
│       │   ├── auth/                 # login, refresh, logout, 2fa (mds/07 §1, mds/10 §6)
│       │   │   ├── strategies/       # jwt.strategy, jwt-refresh.strategy
│       │   │   ├── auth.controller.ts auth.service.ts auth.module.ts
│       │   │   └── dto/
│       │   ├── users/                # جدول users (mds/05)
│       │   ├── rbac/                 # roles, permissions, role_permissions (mds/05, mds/10)
│       │   ├── products/             # products, product_variants, product_images, categories
│       │   ├── inventory/            # stock_movements, stock_quantity/reserved (mds/06 §3)
│       │   ├── orders/               # orders, order_items, order_status_history (mds/06)
│       │   ├── cart/                 # carts, cart_items (مخزّنة في Redis + persist)
│       │   ├── wishlist/             # wishlists
│       │   ├── reviews/              # reviews
│       │   ├── coupons/              # coupons
│       │   ├── addresses/            # addresses
│       │   ├── suppliers/            # suppliers (MVP: عرض أساسي)
│       │   ├── purchase-orders/      # purchase_orders, purchase_order_items (مؤجّل جزئياً mds/08)
│       │   ├── search/               # تكامل Meilisearch (فهرسة products)
│       │   ├── uploads/              # رفع/تحسين الصور WebP (mds/07 §2)
│       │   └── audit/               # audit_log (mds/10 §7)
│       └── jobs/                     # مهام مجدولة: إلغاء الحجز عند انتهاء المهلة (mds/06)
├── frontend/                         # Next.js (mds/11 §6)
│   ├── Dockerfile                    # multi-stage + output: 'standalone'
│   ├── package.json
│   ├── next.config.mjs               # i18n RTL، images، rewrites اختياري
│   ├── tailwind.config.ts            # RTL، خط عربي، palette ذهبي
│   └── src/
│       ├── app/
│       │   ├── (storefront)/         # المتجر العام (RTL، SSR/SSG)
│       │   │   ├── page.tsx          # الرئيسية (SSG/ISR)
│       │   │   ├── category/[slug]/  # تصفّح + فلترة (SSR)
│       │   │   ├── product/[slug]/   # صفحة منتج (SSG/ISR + Schema.org mds/07 §3)
│       │   │   ├── cart/  checkout/  # السلة والدفع
│       │   │   └── account/          # حساب العميل + تتبّع الطلب
│       │   ├── admin/                # لوحة ERP (CSR محمي، layout مستقل)
│       │   │   ├── dashboard/ products/ inventory/ orders/ users/ ...
│       │   ├── layout.tsx            # <html dir="rtl" lang="ar">
│       │   ├── sitemap.ts robots.ts  # mds/07 §3
│       │   └── api/                  # Route Handlers (BFF فقط عند الحاجة، لا منطق عمل)
│       ├── components/               # ui/ (Tailwind RTL) + features/
│       ├── lib/
│       │   ├── api-client.ts         # fetch wrapper: base /api/v1, attach token, refresh-on-401
│       │   └── auth.ts               # إدارة الجلسة على العميل
│       └── store/                    # Zustand: cart, session, ui (mds/02 §2)
├── docker-compose.yml                # إنتاج (mds/11 §6)
├── docker-compose.dev.yml            # تطوير (hot-reload, ports مكشوفة محلياً)
├── deploy.sh                         # سكربت النشر (mds/11 §7-ج)
├── .env.example                      # قالب (داخل Git — mds/11 §6)
├── .env                              # القيم الفعلية 🔒 (خارج Git)
├── .gitignore                        # .env, node_modules, .next, dist, uploads, *.bak
└── mds/                              # التوثيق المرجعي
```

> ملاحظة: لوحة ERP تُدمج داخل `frontend/` تحت `/admin` (مطابق لـ mds/11 §6 "frontend = storefront + لوحة ERP")، وليست تطبيقاً منفصلاً، لتبسيط النشر بحاويتين فقط.

---

### 3. اتفاقيات REST API

**القواعد العامة (مطبَّقة كـ global prefix في `main.ts`):**

| البند | القرار |
|-------|--------|
| البادئة والنسخة | كل المسارات تحت `/api/v1/...` (`app.setGlobalPrefix('api'); enableVersioning(URI, v1)`) — يطابق توجيه cloudflared لـ `/api/*` (mds/11 §4.3) |
| تسمية الموارد | جمع، kebab/snake في القاعدة لكن المسارات بصيغة الجمع الإنجليزية: `/products`, `/product-variants`, `/orders`, `/stock-movements` |
| الأفعال | HTTP verbs: `GET` قراءة، `POST` إنشاء، `PATCH` تعديل جزئي، `PUT` استبدال، `DELETE` (soft-delete عبر `deleted_at` — mds/05 §3) |
| التعشيش | علاقة واضحة فقط: `GET /orders/:id/items`, `POST /products/:id/images`، وإلا مورد مستقل |
| المعرّفات | UUID في مسارات الموارد الحساسة (orders) (mds/05 §3)؛ slug للموارد العامة (products/categories) للـ SEO |

**أكواد الحالة المعتمدة:**

| الكود | الاستخدام |
|------|-----------|
| 200 | نجاح قراءة/تعديل |
| 201 | إنشاء مورد |
| 204 | حذف ناجح بلا محتوى |
| 400 | فشل تحقق DTO (ValidationPipe) |
| 401 | غير مصادَق (توكن مفقود/منتهٍ) |
| 403 | مصادَق لكن بلا صلاحية (RolesGuard/PermissionsGuard — mds/10 §6) |
| 404 | مورد غير موجود |
| 409 | تعارض (مثل: مخزون غير كافٍ عند التأكيد — mds/06 §3) |
| 422 | منطق عمل مرفوض (كوبون منتهٍ، حالة طلب غير مسموحة) |
| 429 | تجاوز حد المحاولات (Rate Limiting — mds/07 §1) |
| 500 | خطأ خادم |

**شكل الاستجابة الموحّد** (يُطبَّق عبر `ResponseInterceptor` و`AllExceptionsFilter`):

```jsonc
// نجاح
{ "success": true, "data": { /* ... */ }, "meta": null }

// نجاح مع ترقيم
{ "success": true,
  "data": [ /* items */ ],
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 } }

// خطأ موحّد
{ "success": false,
  "error": { "code": "INSUFFICIENT_STOCK",      // ثابت قابل للترجمة في الواجهة
             "message": "الكمية المطلوبة غير متوفّرة",
             "details": [ { "field": "quantity", "issue": "max 3" } ] },
  "meta": { "traceId": "..." } }                 // يربط بالـ logs (mds/07 §5)
```

**الترقيم والفلترة والفرز** (عبر `PaginationDto` + query params):

```
GET /api/v1/products?page=1&limit=20&sort=-created_at
    &category=<slug>&gold_type=russian&price_min=50&price_max=300
    &is_featured=true&q=<بحث يمرّر إلى Meilisearch>
```
- ترقيم افتراضي `page=1, limit=20` بحد أقصى `limit=100` (mds/07 §2 — لا تحميل كل البيانات).
- الفرز: `sort=field` تصاعدي، `-field` تنازلي.
- البحث النصي `q` يُوجَّه إلى Meilisearch (mds/02 §2)، الفلاتر الدقيقة إلى Prisma `where`.

---

### 4. تدفق المصادقة الكامل (JWT + Refresh + 2FA)

يطبّق mds/07 §1 وmds/10 §6. الحزم: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `argon2` (لتجزئة كلمات المرور — mds/07 §1)، `otplib` + `qrcode` (للـ 2FA).

**التوكنات:**

| التوكن | المدة | التخزين | المحتوى (payload) |
|-------|------|---------|--------------------|
| Access Token | 15 دقيقة | ذاكرة الواجهة (لا cookie) + يُرسل في `Authorization: Bearer` | `sub`(userId), `role`, `permissions[]`, `tfa`(bool) |
| Refresh Token | 7 أيام | **httpOnly + Secure + SameSite=Strict cookie** | `sub`, `jti`(معرّف الجلسة) |

**تخزين الـ refresh والإبطال:**
- يُخزَّن **hash للـ refresh token** (argon2) في Redis بمفتاح `session:{userId}:{jti}` مع TTL = مدة التوكن. يسمح بـ:
  - **تسجيل خروج فوري** (mds/07 §1 "انتهاء صلاحية الجلسات"): حذف المفتاح من Redis.
  - **تدوير التوكن (rotation):** كل `refresh` يُبطل الـ jti القديم ويصدر jti جديداً (كشف إعادة الاستخدام).
  - **خروج من كل الأجهزة:** حذف `session:{userId}:*`.

**المسارات (auth.controller):**

| Endpoint | الوصف |
|----------|-------|
| `POST /api/v1/auth/register` | تسجيل عميل (role=customer تلقائياً) |
| `POST /api/v1/auth/login` | تحقق argon2 → إصدار access + refresh(cookie). إن كان الدور admin ويملك 2FA → يردّ `{ requires2fa: true, tfaToken }` بدل التوكنات |
| `POST /api/v1/auth/2fa/verify` | يستقبل `tfaToken` + `code` (otplib TOTP) → يصدر التوكنات النهائية (mds/10 §6) |
| `POST /api/v1/auth/2fa/setup` | للمدير: توليد secret + QR (إلزامي للأدمن — mds/10 §6) |
| `POST /api/v1/auth/refresh` | يقرأ refresh من الـ cookie → يتحقق من Redis → rotation → access + cookie جديدان |
| `POST /api/v1/auth/logout` | حذف `session:{userId}:{jti}` + مسح الـ cookie |
| `GET /api/v1/auth/me` | بيانات المستخدم + role + permissions |

**تدفق الدخول (pseudocode):**

```text
login(email, pwd):
  user = users.findUnique(email); assert user.is_active
  rateLimit("login:"+ip, 5/min)              // mds/07 §1 brute-force
  if not argon2.verify(user.password_hash, pwd): 401
  audit("LOGIN", user)                         // mds/10 §7
  if user.role == admin AND user.tfa_enabled:
     tfaToken = jwt(sub=user.id, scope="2fa", exp=5m)
     return { requires2fa: true, tfaToken }
  return issueTokens(user)

issueTokens(user):
  jti = uuid()
  perms = rbac.permissionsOf(user.role_id)     // mds/10 §3
  access  = jwt({sub,role,permissions:perms,tfa:true}, 15m)
  refresh = jwt({sub, jti}, 7d)
  redis.set("session:"+user.id+":"+jti, argon2.hash(refresh), EX=7d)
  setCookie("refresh_token", refresh, {httpOnly,secure,sameSite:'strict'})
  return { access }
```

> ملاحظة بيئة: الـ Secure cookie يعمل لأنّ SSL يُنهى عند حافة Cloudflare والبروتوكول العام HTTPS (mds/11 §4.5)؛ يُضبط `app.set('trust proxy')` ليقرأ NestJS الـ `X-Forwarded-Proto`.

---

### 5. تطبيق RBAC في NestJS

نموذج RBAC من mds/10: جداول `roles`, `permissions`, `role_permissions` (mds/05). الصلاحيات تُحمَّل في الـ access token وتُتحقَّق على الخادم لكل عملية (mds/10 §6).

**صيغة اسم الصلاحية:** `<resource>:<action>` مشتقة مباشرة من مصفوفة mds/10 §3، مثلاً:
`products:read`, `products:write`, `products:delete`, `inventory:read`, `inventory:write`, `inventory:adjust`, `orders:read`, `orders:confirm`, `orders:update`, `orders:return`, `purchases:read`, `purchases:create`, `accounting:read`, `accounting:export`, `crm:read`, `crm:campaigns`, `settings:store`, `users:manage`, `roles:manage`, `audit:read`.

**جدول التعيين (seed) — مطابق لمصفوفة mds/10 §3:**

| الصلاحية | admin | sales | inventory | accountant |
|----------|:-:|:-:|:-:|:-:|
| products:read | ✅ | ✅ | ✅ | ✅ |
| products:write / products:delete | ✅ | ❌ | ✅ | ❌ |
| inventory:read | ✅ | ✅ | ✅ | ✅ |
| inventory:write / inventory:adjust | ✅ | ❌ | ✅ | ❌ |
| orders:read | ✅ | ✅ | ✅ | ✅ |
| orders:confirm / orders:update / orders:return | ✅ | ✅ | ❌ | ❌ |
| purchases:read | ✅ | ❌ | ✅ | ✅ |
| purchases:create | ✅ | ❌ | ✅ | ❌ |
| accounting:read / accounting:export | ✅ | ❌ | ❌ | ✅ |
| crm:read | ✅ | ✅ | ❌ | ✅ |
| crm:campaigns | ✅ | ✅ | ❌ | ❌ |
| settings:store / users:manage / roles:manage / audit:read | ✅ | ❌ | ❌ | ❌ |

`customer` لا يملك أي صلاحية إدارية؛ وصوله محصور بموارده عبر فحص ملكية (ownership) في الـ Service (mds/10 §4).

**التطبيق عبر Decorators + Guards (مرتبة عالمياً في `app.module`):**

```ts
// decorators
@Public()                                  // يتخطّى JwtAuthGuard (مسارات المتجر العامة)
@Roles('admin','sales')                    // SetMetadata('roles', [...])
@Permissions('orders:confirm')             // SetMetadata('permissions', [...])
@RequireTwoFactor()                        // لمسارات admin الحساسة

// ترتيب الحراس: JwtAuthGuard → RolesGuard → PermissionsGuard → TwoFactorGuard
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(ctx): boolean {
    const required = reflector.getAllAndOverride('permissions', [handler, class]);
    if (!required) return true;                 // مسار بلا قيد صلاحية
    const { user } = ctx.switchToHttp().getRequest();   // من JwtAuthGuard
    const ok = required.every(p => user.permissions.includes(p));
    if (!ok) throw new ForbiddenException('PERMISSION_DENIED');   // 403
    return true;
  }
}
```

**مثال على controller (تأكيد طلب — mds/10 §3 "تأكيد/إلغاء طلب" لـ admin/sales):**
```ts
@Patch('orders/:id/confirm')
@Roles('admin','sales') @Permissions('orders:confirm') @Audit('ORDER_CONFIRM')
confirm(@Param('id', ParseUUIDPipe) id, @CurrentUser() u) { ... }
```

> فحص الملكية للعميل (لا يرى طلبات غيره — mds/10 §4) يُفرَض داخل الـ Service بشرط `where: { customer_id: user.sub }`، وليس بالـ Guard فقط.

---

### 6. إدارة الإعدادات والبيئات (.env)

عبر `@nestjs/config` مع **Joi schema** يفشل الإقلاع إذا نقص أو فسد أي متغيّر إلزامي (يمنع نشر خاطئ). الأساس من `.env.example` في mds/11 §6 موسَّعاً بمتغيرات هذا القسم:

```env
# نشر (mds/11 §5 — لا تُغيّر المنافذ المخصّصة)
COMPOSE_PROJECT_NAME=matjer
NODE_ENV=production
FRONTEND_PORT=3020
BACKEND_PORT=4002
DB_PORT=5436
REDIS_PORT=6383
PUBLIC_URL=https://matjer.grade.sbs

# قاعدة البيانات (Prisma — mds/11 §6)
DB_NAME=matjer_db
DB_PASSWORD=__strong__
DATABASE_URL=postgresql://matjer_user:__strong__@database:5432/matjer_db

# Redis
REDIS_URL=redis://redis:6379

# المصادقة (mds/07 §1)
JWT_ACCESS_SECRET=__long_random__
JWT_REFRESH_SECRET=__long_random_diff__
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
ARGON2_MEMORY=19456

# 2FA (mds/10 §6)
TFA_ISSUER=matjer

# البحث والملفات
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=__key__
UPLOADS_DIR=/app/uploads

# الأمان والأداء (mds/07)
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://matjer.grade.sbs
COOKIE_DOMAIN=matjer.grade.sbs
LOG_LEVEL=info
```

- البيئات: `docker-compose.dev.yml` (`NODE_ENV=development`, منافذ مكشوفة، logs مفصّلة) مقابل `docker-compose.yml` (إنتاج، `127.0.0.1` فقط — mds/11 §9).
- **كل الأسرار خارج Git** (`.env` في `.gitignore` — mds/11 §6, §9).
- الواجهة: فقط `NEXT_PUBLIC_*` آمنة للعميل (مثل `NEXT_PUBLIC_API_URL=/api/v1`)؛ `BACKEND_URL=http://backend:4002` داخلية للـ SSR فقط (mds/11 §6 compose).

---

### 7. التسجيل (Logging) و Audit Log

**فصل صريح:** Application logging (تشغيلي/تشخيصي) منفصل عن Audit Log (سجل أعمال قانوني — mds/10 §7).

**أ. Application Logging** — حزمة `nestjs-pino` (JSON structured):
- مستوى عبر `LOG_LEVEL`؛ كل سطر يحمل `traceId` (correlation id يُولَّد في `LoggingInterceptor` ويُعاد في `meta.traceId` بالاستجابة) لربط الطلب بالخطأ.
- **تنقية بيانات حساسة** (password, token, cookie, authorization) قبل الكتابة.
- `AllExceptionsFilter` يسجّل الأخطاء 5xx بمستوى `error` و4xx بمستوى `warn`.
- جاهزية تكامل **Sentry** للأخطاء و**logs مركزية** (mds/07 §5) — مهيّأ كـ provider اختياري.
- `docker compose logs -f backend` كقناة عرض على السيرفر (mds/11 §7-د).

**ب. Audit Log** — جدول `audit_log` (يحقق mds/10 §7) + `AuditInterceptor` مربوط بـ `@Audit('ACTION')`:

| الحقل | النوع | الوصف |
|------|------|-------|
| id | UUID PK | |
| user_id | FK→users | من قام بالعملية (mds/10 §7) |
| action | VARCHAR | مثل `PRODUCT_UPDATE`, `STOCK_ADJUST`, `ORDER_CONFIRM`, `ORDER_CANCEL`, `REFUND`, `SETTINGS_UPDATE`, `USER_CREATE`, `ROLE_CHANGE`, `LOGIN` |
| entity | VARCHAR | اسم الجدول المتأثّر |
| entity_id | VARCHAR | معرّف السجل |
| before | JSONB (nullable) | الحالة قبل (mds/10 §7) |
| after | JSONB (nullable) | الحالة بعد |
| ip | VARCHAR | عنوان IP |
| user_agent | VARCHAR | للتنبيه عند جهاز جديد (mds/10 §6) |
| created_at | TIMESTAMP | الوقت (mds/10 §7) |

العمليات الحساسة المسجَّلة إلزامياً (mds/10 §7): تعديل/حذف منتج، تعديل مخزون يدوي، تأكيد/إلغاء/تعديل طلب، استرداد مالي، تغيير إعدادات، إضافة/تعديل/حذف مستخدم، تغيير صلاحيات. القراءة عبر `GET /api/v1/audit-logs` (`@Permissions('audit:read')` — admin فقط، mds/10 §3).

---

### 8. حزم npm الأساسية

**Backend (NestJS):**

| الفئة | الحزم |
|------|-------|
| الإطار | `@nestjs/core` `@nestjs/common` `@nestjs/platform-express` `reflect-metadata` `rxjs` |
| ORM | `prisma` (dev) `@prisma/client` |
| المصادقة | `@nestjs/jwt` `@nestjs/passport` `passport` `passport-jwt` `argon2` `otplib` `qrcode` `cookie-parser` |
| التحقق | `class-validator` `class-transformer` `@nestjs/config` `joi` |
| الأمان (mds/07 §1) | `helmet` `@nestjs/throttler` (rate limiting) `csurf` (CSRF) `sanitize-html` (XSS) |
| Redis/Cache | `ioredis` `@nestjs/cache-manager` `cache-manager` `cache-manager-redis-yet` |
| البحث | `meilisearch` |
| الصور (mds/07 §2) | `sharp` (ضغط + WebP) `multer` |
| Logging/Audit | `nestjs-pino` `pino-http` `@sentry/node` (اختياري) |
| المهام المجدولة | `@nestjs/schedule` (إلغاء الحجز عند المهلة — mds/06) |

**Frontend (Next.js):**

| الفئة | الحزم |
|------|-------|
| الإطار | `next` `react` `react-dom` `typescript` |
| التنسيق (RTL) | `tailwindcss` `postcss` `autoprefixer` `tailwindcss-rtl` `clsx` |
| الحالة (mds/02 §2) | `zustand` |
| البيانات/النماذج | `@tanstack/react-query` `react-hook-form` `zod` `@hookform/resolvers` |
| لوحة ERP (mds/02 §2) | `@tanstack/react-table` (جداول) `recharts` (تقارير) |
| المراقبة | `@sentry/nextjs` (اختياري — mds/07 §5) |

---

هذا الـ blueprint جاهز للتنفيذ ومطابق لـ mds/02 (المعمارية والستاك)، mds/05 (أسماء الجداول snake_case)، mds/06 (منطق المخزون والطلبات في طبقة الـ Service)، mds/07 (الأمان/الأداء)، mds/10 (RBAC وAudit Log و2FA)، وmds/11 (هيكل المستودع، المنافذ، النشر عبر Cloudflare Tunnel).

---

## 2. طبقة البيانات وقاعدة البيانات

### تأكيد اختيار ORM: Prisma (مع التبرير مقابل TypeORM)

القرار النهائي: **Prisma** هو الـ ORM المعتمد لطبقة البيانات في `/backend` (NestJS)، حسب القرار المثبّت في سياق المشروع و mds/02 (الباكند NestJS + PostgreSQL 16).

| المعيار | Prisma | TypeORM | الحكم |
|---------|--------|---------|-------|
| Type-safety | يولّد types من `schema.prisma` تلقائياً؛ نتائج الاستعلام مكتوبة بالكامل؛ لا `any` ضمنية | الـ decorators على الكيانات؛ type-safety أضعف في query builder الخام | Prisma |
| Migrations | `prisma migrate` معلنة وحتمية مع تاريخ SQL مرقّم في `/backend/prisma/migrations/`، آمنة للإنتاج عبر `migrate deploy` | migrations مولّدة لكنها أقل حتمية وتحتاج ضبطاً يدوياً متكرراً | Prisma |
| دعم PostgreSQL 16 | كامل: enums، `@db.Uuid`, `@db.Decimal`, partial/composite indexes عبر `@@index` | كامل أيضاً | تعادل |
| الأقفال (row-lock) المطلوبة في mds/06 §3 | `SELECT ... FOR UPDATE` عبر `$queryRaw`/`$transaction` داخل المعاملة | يدعمها أصلاً في query builder (`setLock('pessimistic_write')`) | TypeORM أنظف هنا، لكن Prisma يحلّها بـ raw SQL داخل transaction (مقبول) |
| منحنى التعلّم والصيانة | schema مركزي واحد، أسهل قراءة ومراجعة | كيانات موزّعة، تعقيد metadata | Prisma |
| الأداء وحجم الحزمة | Query Engine منفصل؛ ممتاز للقراءات المفهرسة | في-process | تعادل عملي |

التبرير الحاسم: المشروع greenfield مع TypeScript صارم وحاجة لـ migrations حتمية في النشر عبر Docker Compose (mds/11)، وهذا هو نقطة قوة Prisma الأساسية. النقطة الوحيدة لصالح TypeORM (pessimistic locking المدمج لمنطق المخزون في mds/06 §3) تُعالَج في Prisma بـ `SELECT ... FOR UPDATE` خام داخل `$transaction` (pseudocode أدناه)، فلا تُرجّح الكفّة. لذا **يُعتمد Prisma نهائياً**.

التبعيات في `/backend/package.json`: `@prisma/client`, `prisma` (devDependency)، وتكامل NestJS عبر `PrismaService extends PrismaClient implements OnModuleInit` في `/backend/src/prisma/prisma.service.ts` + `PrismaModule` (global).

### استراتيجية المعرّفات: UUID مقابل serial

حسب mds/05 §3 ("UUID للمعرّفات الحساسة لتجنّب التخمين") والسياق المثبّت:

| الجدول | نوع المعرّف | التبرير |
|--------|-------------|---------|
| `orders` | **UUID** (`@db.Uuid`, `@default(uuid())`) | معرّف حسّاس قابل للتخمين في URLs/تتبّع الطلب — mds/05 §3 |
| `users` | **UUID** | بيانات شخصية حسّاسة، يُمنع enumeration للحسابات |
| `addresses` | **UUID** | PII مرتبطة بالعميل |
| `coupons` | **UUID** | منع تخمين الكوبونات النشطة |
| باقي الجداول (`products`, `product_variants`, `categories`, `roles`, `permissions`, `stock_movements`, `order_items`, `cart_items`...) | **BigInt serial** (`@id @default(autoincrement())`) | معرّفات داخلية غير حسّاسة؛ أكفأ في الفهرسة وحجم الـ index، وأسرع في joins |

ملاحظة تنفيذية: المعرّف العام للطلب المعروض للعميل هو `order_number` (نص فريد قابل للقراءة، مثل `MJ-2026-000123`) بينما `id` (UUID) هو المفتاح الداخلي. هذا يطابق mds/05 (حقلان منفصلان `id` و `order_number`).

### الـ Enums (PostgreSQL native enums عبر Prisma)

مستخرجة حرفياً من mds/05 و mds/06. تُعرَّف كـ `enum` في Prisma لتُترجَم إلى PG enum types:

| Enum | القيم | المرجع |
|------|-------|--------|
| `GoldType` | `RUSSIAN` (روسي), `CHINESE` (صيني) | mds/05 (products.gold_type) |
| `OrderStatus` | `NEW`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED` | mds/05 + mds/06 §1،§2 (جديد→مؤكد→قيد التجهيز→مشحون→مُسلّم + ملغي/مرتجع) |
| `PaymentMethod` | `ONLINE` (إلكتروني), `COD` (عند الاستلام) | mds/05 (payment_method) + mds/08 |
| `PaymentStatus` | `UNPAID` (غير مدفوع), `PAID` (مدفوع), `REFUNDED` (مسترد) | mds/05 (payment_status) |
| `StockMovementType` | `INBOUND` (إدخال), `OUTBOUND` (إخراج), `RETURN` (مرتجع), `DAMAGED` (تالف), `ADJUSTMENT` (تسوية), `TRANSFER` (تحويل) | mds/05 (stock_movements.type) |
| `PurchaseOrderStatus` | `PENDING` (معلّق), `PARTIAL` (مستلم جزئي), `RECEIVED` (مستلم) | mds/05 (purchase_orders.status) |
| `CouponType` | `PERCENTAGE` (نسبة), `FIXED` (مبلغ) | mds/05 (coupons.type) |

الواجهة العربية تتولّى الترجمة (label mapping) في `/frontend`؛ القيم في DB تبقى لاتينية ثابتة لمنع كسر البيانات.

### استراتيجية soft-delete

حسب mds/05 §3 ("Soft Delete عبر `deleted_at` بدل الحذف النهائي للمنتجات والطلبات"):
- حقل `deletedAt DateTime? @map("deleted_at")` يُضاف إلى: `products`, `product_variants`, `orders`, `users`, `categories`, `coupons`, `reviews`.
- لا يدعم Prisma soft-delete أصلاً؛ يُطبَّق عبر **Prisma Client Extension** (`prisma.$extends`) في `/backend/src/prisma/soft-delete.extension.ts` تحقن `where: { deletedAt: null }` تلقائياً على `findMany/findFirst/findUnique`، وتحوّل `delete` إلى `update { deletedAt: now() }`.
- الفهارس على الجداول ذات الـ soft-delete تستخدم **partial index** حيث `deleted_at IS NULL` (راجع جدول الفهارس) لكفاءة الاستعلامات الحيّة.

### الفهارس (Indexes)

حسب mds/05 §3 (`sku`, `order_number`, `email`, `category_id`) + الفهارس العملية لمسارات الاستعلام (slug، البحث، السلة):

| الجدول | الفهرس | النوع | الغرض |
|--------|--------|-------|-------|
| `users` | `email` | `@unique` | تسجيل الدخول، منع التكرار — mds/05 §3 |
| `product_variants` | `sku` | `@unique` | كود المتغير الفريد — mds/05 §3 |
| `orders` | `order_number` | `@unique` | تتبّع الطلب — mds/05 §3 |
| `orders` | `customer_id`, `status`, `created_at` | `@@index` | لوحة الطلبات والفلترة الزمنية |
| `products` | `category_id` | `@@index` | تصفّح/فلترة بالتصنيف — mds/05 §3 |
| `products` | `(is_active, is_featured)` | `@@index` (partial: `deleted_at IS NULL`) | الصفحة الرئيسية والمنتجات المميزة |
| `categories` | `slug` | `@unique` | روابط نظيفة SSG/SSR — mds/07 |
| `products` | `slug` | `@unique` | صفحة المنتج (URL) — mds/03/07 |
| `cart_items` | `(cart_id, variant_id)` | `@@unique` | منع تكرار نفس المتغير في السلة |
| `wishlists` | `(customer_id, product_id)` | `@@unique` | منع تكرار المفضّلة |
| `reviews` | `(product_id, customer_id)` | `@@unique` | مراجعة واحدة لكل عميل/منتج |
| `stock_movements` | `variant_id`, `created_at` | `@@index` | سجل حركة المخزون والتدقيق |
| `order_items` | `order_id`, `variant_id` | `@@index` | استرجاع عناصر الطلب |
| `coupons` | `code` | `@unique` | تطبيق الكوبون |
| `role_permissions` | `(role_id, permission_id)` | `@@id` مركّب | جدول ربط M-N |

البحث النصّي الكامل (بحث المنتجات) يُفوَّض إلى **Meilisearch** (mds/02) عبر مزامنة من جدول `products`، وليس فهرس PG GIN، حفاظاً على فصل المسؤوليات.

### قواعد السلامة (Integrity Constraints)

| القاعدة | التطبيق | المرجع |
|---------|---------|--------|
| فصل `stock_quantity` عن `reserved_quantity` | حقلان `Int` منفصلان في `product_variants` + CHECK | mds/05 §3 + mds/06 §3 |
| المتاح ≥ 0 | `CHECK (stock_quantity - reserved_quantity >= 0)` | mds/06 §3 (منع البيع المزدوج) |
| لا قيم سالبة للكميات | `CHECK (stock_quantity >= 0)`, `CHECK (reserved_quantity >= 0)`, `CHECK (quantity > 0)` في order_items/cart_items | mds/06 §3 |
| `rating` بين 1 و 5 | `CHECK (rating >= 1 AND rating <= 5)` | mds/05 (reviews) |
| الأسعار غير سالبة | `CHECK (base_price >= 0)`, `CHECK (unit_price >= 0)`, `CHECK (total >= 0)` | mds/05 |
| تجميد السعر وقت الطلب | `unit_price` يُخزَّن في `order_items` ولا يُشتق من المنتج | mds/05 §3 |
| قيود فريدة | `email`, `sku`, `order_number`, `slug`, `coupons.code` | mds/05 §3 |
| سلامة العلاقات | `onDelete: Restrict` للطلبات/المتغيرات المرجعية؛ `onDelete: Cascade` لـ `order_items`/`cart_items`/`product_images` تجاه الأب | استدلال تنفيذي |

ملاحظة: قيود `CHECK` غير مدعومة تصريحياً في `schema.prisma`؛ تُضاف عبر تعديل ملف الـ migration المولّد يدوياً (raw SQL) أو ملف `migrations/XXXX_checks/migration.sql` مخصّص. هذا نمط معتمد في Prisma.

### مقتطف schema.prisma توضيحي (أهم النماذج)

ملف `/backend/prisma/schema.prisma` — datasource + generator + أهم 5 نماذج (User, Product, ProductVariant, Order, OrderItem) مع الـ enums:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum GoldType { RUSSIAN CHINESE }
enum OrderStatus { NEW CONFIRMED PROCESSING SHIPPED DELIVERED CANCELLED RETURNED }
enum PaymentMethod { ONLINE COD }
enum PaymentStatus { UNPAID PAID REFUNDED }
enum StockMovementType { INBOUND OUTBOUND RETURN DAMAGED ADJUSTMENT TRANSFER }

model User {
  id           String    @id @default(uuid()) @db.Uuid
  name         String    @db.VarChar(150)
  email        String    @unique @db.VarChar(190)
  phone        String?   @db.VarChar(30)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  roleId       Int       @map("role_id")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  deletedAt    DateTime? @map("deleted_at")

  role       Role        @relation(fields: [roleId], references: [id], onDelete: Restrict)
  addresses  Address[]
  orders     Order[]
  reviews    Review[]
  wishlists  Wishlist[]
  cart       Cart?

  @@index([roleId])
  @@map("users")
}

model Product {
  id            BigInt    @id @default(autoincrement())
  name          String    @db.VarChar(200)
  slug          String    @unique @db.VarChar(220)
  description   String?   @db.Text
  categoryId    BigInt    @map("category_id")
  goldType      GoldType  @map("gold_type")
  basePrice     Decimal   @map("base_price") @db.Decimal(12, 2)
  discountPrice Decimal?  @map("discount_price") @db.Decimal(12, 2)
  isActive      Boolean   @default(true) @map("is_active")
  isFeatured    Boolean   @default(false) @map("is_featured")
  createdAt     DateTime  @default(now()) @map("created_at")
  deletedAt     DateTime? @map("deleted_at")

  category  Category         @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  variants  ProductVariant[]
  images    ProductImage[]
  reviews   Review[]
  wishlists Wishlist[]

  @@index([categoryId])
  @@index([isActive, isFeatured])
  @@map("products")
}

model ProductVariant {
  id              BigInt    @id @default(autoincrement())
  productId       BigInt    @map("product_id")
  sku             String    @unique @db.VarChar(64)
  size            String?   @db.VarChar(40)
  color           String?   @db.VarChar(40)
  price           Decimal   @db.Decimal(12, 2)
  stockQuantity   Int       @default(0) @map("stock_quantity")
  reservedQuantity Int      @default(0) @map("reserved_quantity")
  minStockAlert   Int       @default(0) @map("min_stock_alert")
  deletedAt       DateTime? @map("deleted_at")

  product         Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  stockMovements  StockMovement[]
  orderItems      OrderItem[]
  cartItems       CartItem[]
  poItems         PurchaseOrderItem[]

  @@index([productId])
  @@map("product_variants")
  // CHECK (stock_quantity - reserved_quantity >= 0) — يُضاف في migration SQL
}

model Order {
  id                String        @id @default(uuid()) @db.Uuid
  orderNumber       String        @unique @map("order_number") @db.VarChar(40)
  customerId        String        @map("customer_id") @db.Uuid
  status            OrderStatus   @default(NEW)
  subtotal          Decimal       @db.Decimal(12, 2)
  discount          Decimal       @default(0) @db.Decimal(12, 2)
  shippingCost      Decimal       @default(0) @map("shipping_cost") @db.Decimal(12, 2)
  total             Decimal       @db.Decimal(12, 2)
  paymentMethod     PaymentMethod @map("payment_method")
  paymentStatus     PaymentStatus @default(UNPAID) @map("payment_status")
  shippingAddressId BigInt        @map("shipping_address_id")
  couponId          String?       @map("coupon_id") @db.Uuid
  notes             String?       @db.Text
  createdAt         DateTime      @default(now()) @map("created_at")
  deletedAt         DateTime?     @map("deleted_at")

  customer        User                 @relation(fields: [customerId], references: [id], onDelete: Restrict)
  shippingAddress Address              @relation(fields: [shippingAddressId], references: [id], onDelete: Restrict)
  coupon          Coupon?              @relation(fields: [couponId], references: [id], onDelete: SetNull)
  items           OrderItem[]
  statusHistory   OrderStatusHistory[]

  @@index([customerId])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id        BigInt  @id @default(autoincrement())
  orderId   String  @map("order_id") @db.Uuid
  variantId BigInt  @map("variant_id")
  quantity  Int
  unitPrice Decimal @map("unit_price") @db.Decimal(12, 2)
  total     Decimal @db.Decimal(12, 2)

  order   Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([variantId])
  @@map("order_items")
  // CHECK (quantity > 0), CHECK (unit_price >= 0)
}
```

النماذج المتبقية (مطبّقة بنفس الأنماط، غير معروضة للإيجاز): `Role`, `Permission`, `RolePermission` (مفتاح مركّب `@@id([roleId, permissionId])`), `Category` (`parentId` self-relation للتصنيفات الفرعية)، `ProductImage`, `StockMovement`, `Warehouse`, `OrderStatusHistory`, `Address`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `Coupon`, `Review`, `Wishlist`, `Cart`, `CartItem`.

### استراتيجية الـ Migrations

| المرحلة | الأمر/الملف | الوصف |
|---------|-------------|-------|
| التطوير المحلي | `npx prisma migrate dev --name <desc>` | يولّد SQL مرقّماً في `/backend/prisma/migrations/` ويطبّقه على DB التطوير |
| تعديلات CHECK اليدوية | تحرير `migration.sql` المولّد قبل التطبيق | إضافة `ALTER TABLE ... ADD CONSTRAINT` لقيود CHECK غير المدعومة في schema |
| الإنتاج (mds/11) | `npx prisma migrate deploy` | يُشغَّل في خطوة بدء حاوية backend (entrypoint/`deploy.sh`)، حتمي وغير تفاعلي |
| توليد العميل | `npx prisma generate` | خطوة build في Dockerfile للـ backend |
| إعادة الضبط (dev فقط) | `npx prisma migrate reset` | يُمنع منعاً باتاً في الإنتاج |

ربط بـ mds/11: `DATABASE_URL` في `.env` يشير إلى `postgres:5436` (127.0.0.1)؛ خطوة `migrate deploy` تُدرَج في `deploy.sh` قبل تشغيل خدمة الـ backend في `docker-compose.yml`.

### استراتيجية الـ Seeding

ملف `/backend/prisma/seed.ts` (يُسجَّل في `package.json` تحت `prisma.seed`، يُشغَّل بـ `npx prisma db seed`). idempotent عبر `upsert`. حسب mds/10 (الأدوار/الصلاحيات) و mds/03 (التصنيفات):

| البيانات الأولية | المحتوى | المرجع |
|------------------|---------|--------|
| `roles` | `admin`, `sales`, `inventory`, `accountant`, `customer` | mds/05 + mds/10 |
| `permissions` | مجموعة الصلاحيات الذرّية (مثل `product.create`, `order.update_status`, `inventory.adjust`, `report.view`) | mds/10 |
| `role_permissions` | ربط admin بكل الصلاحيات؛ sales/inventory/accountant بمجموعاتها؛ customer بالحد الأدنى | mds/10 |
| مستخدم admin | `email` من env، `password_hash` عبر argon2/bcrypt، `role_id` = admin، `is_active = true` | mds/07 (argon2/bcrypt) + mds/10 |
| `categories` أولية | تصنيفات إكسسوارات الذهب التقليدي (سلاسل، خواتم، أساور، أطقم...) + slugs | mds/03 |

pseudocode للـ seed:
```
for role in [admin, sales, inventory, accountant, customer]:
    prisma.role.upsert({ where:{name:role}, update:{}, create:{name:role} })
for perm in PERMISSION_CATALOG:           // mds/10
    prisma.permission.upsert(...)
linkRolePermissions(admin → ALL; sales → [...]; inventory → [...]; accountant → [...])
prisma.user.upsert({
  where:{ email: env.ADMIN_EMAIL },
  create:{ email, name:'مدير النظام', passwordHash: await argon2.hash(env.ADMIN_PASSWORD),
           roleId: adminRole.id, isActive:true }
})
seedCategories(GOLD_CATEGORIES)           // mds/03
```
ملاحظة أمنية (mds/07): بيانات الـ admin تُؤخذ من متغيرات بيئة (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) ولا تُكتب صراحةً في الكود؛ التجزئة عبر argon2/bcrypt.

### pseudocode: row-lock لمنطق المخزون (mds/06 §3) داخل Prisma

نظراً لأن منطق الحجز/الخصم يتطلب قفل صف لمنع البيع المزدوج، يُنفَّذ داخل `prisma.$transaction` مع `SELECT ... FOR UPDATE` خام (الحل البديل لغياب pessimistic lock التصريحي في Prisma):

```
async confirmOrder(orderId):                                    // mds/06 §1 خطوة 3
  prisma.$transaction(async tx => {
    for item in order.items:
      // قفل الصف لمنع التزامن (mds/06 §3)
      [variant] = await tx.$queryRaw`
        SELECT id, stock_quantity, reserved_quantity
        FROM product_variants WHERE id = ${item.variantId} FOR UPDATE`
      // إعادة التحقق لحظة التأكيد (mds/06 §3)
      available = variant.stock_quantity - variant.reserved_quantity
      if item.quantity > variant.reserved_quantity: throw OutOfStock
      // خصم نهائي: stock - / reserved - (mds/06 §3)
      await tx.productVariant.update({ where:{id:item.variantId},
        data:{ stockQuantity:{decrement:item.quantity},
               reservedQuantity:{decrement:item.quantity} } })
      // تسجيل حركة إخراج (mds/05 stock_movements / mds/06 §4)
      await tx.stockMovement.create({ data:{ variantId, type:'OUTBOUND',
        quantity: -item.quantity, reference: order.orderNumber, createdById: actor } })
    await tx.order.update({ where:{id:orderId}, data:{ status:'CONFIRMED' } })
    await tx.orderStatusHistory.create({ data:{ orderId, status:'CONFIRMED', changedById: actor } })
  })
```
نفس النمط ينطبق على: الحجز عند الإنشاء (`reserved +`)، الإلغاء (`reserved -`)، الإرجاع (`stock +` بحركة `RETURN`)، وانتهاء مهلة الحجز (`reserved -` + إلغاء تلقائي) — جميعها mds/06 §2-§3.

---

الملفات المرجعية المقروءة: `c:/Projects/matjer/mds/05-database-design.md`, `c:/Projects/matjer/mds/06-order-lifecycle.md`.
الملفات المقترح إنشاؤها (مخرجات تنفيذية مستقبلية): `c:/Projects/matjer/backend/prisma/schema.prisma`, `c:/Projects/matjer/backend/prisma/seed.ts`, `c:/Projects/matjer/backend/prisma/migrations/`, `c:/Projects/matjer/backend/src/prisma/prisma.service.ts`, `c:/Projects/matjer/backend/src/prisma/prisma.module.ts`, `c:/Projects/matjer/backend/src/prisma/soft-delete.extension.ts`.

---

## 3. وحدات الباكند (NestJS) ومنطق العمل

### وحدات الباكند (NestJS) ومنطق العمل

> هذا القسم يحدّد تقسيم NestJS modules ضمن `/backend` (حسب mds/11)، مع الـ services والـ endpoints والصلاحيات لكل module، وتعمّق في محرّك المخزون والحجز وآلة حالات الطلب والترابط التلقائي بيع→مخزون→محاسبة→عميل (mds/04 §9). المعمارية متعددة الطبقات (mds/02 §1): `Controller → Service → Repository (Prisma)`. كل واجهات الإدارة محمية بالمصادقة والصلاحيات (mds/02 §6، mds/10 §6).

#### الاتفاقيات العامة (Conventions)

- البادئة العامة `api/` (يوجّهها Cloudflare Tunnel للباكند حسب mds/11)؛ كل مسارات الإدارة تحت `api/admin/*`، ومسارات المتجر تحت `api/*`.
- المصادقة عبر `JwtAuthGuard` (Access JWT) + `RefreshGuard`، والصلاحيات عبر `PermissionsGuard` مع decorator `@RequirePermissions('orders.confirm')` يقرأ من جداول `permissions` / `role_permissions` (mds/05، mds/10 §1). الصلاحيات بصيغة `resource.action`.
- التحقق من الصلاحية على مستوى الخادم لكل عملية (mds/10 §6) عبر global guard + decorator، وليس على الواجهة فقط.
- `@Public()` decorator لتجاوز الحراسة في مسارات المتجر العامة (تصفّح/بحث).
- كل العمليات الكتابية على البيانات تمر عبر `PrismaService` بمعاملات (transactions) عند المساس بأكثر من جدول، مع تسجيل في `AuditModule` للعمليات الحساسة (mds/10 §7).
- البنية الموحّدة للـ module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/` (Prisma types), `guards/`, `events/`.

#### خريطة الوحدات (Module Map)

| Module | المجلد | يغطّي (mds) | MVP |
|--------|--------|-------------|:---:|
| `AuthModule` | `auth/` | mds/03 §7، mds/10 §6، mds/07 | ✅ |
| `UsersRolesModule` | `users/`, `roles/` | mds/05، mds/10 §2-5 | ✅ |
| `CatalogModule` | `catalog/` (products/categories/variants/images) | mds/03 §2-4، mds/04 §2 | ✅ |
| `InventoryModule` | `inventory/` | mds/04 §3، mds/06 §3 | ✅ (جزئي) |
| `CartModule` | `cart/` | mds/03 §5 | ✅ |
| `CheckoutModule` | `checkout/` | mds/03 §6، mds/06 §1-2 | ✅ |
| `OrdersModule` | `orders/` | mds/04 §4، mds/06 | ✅ |
| `ProcurementModule` | `procurement/` (suppliers/purchase-orders) | mds/04 §5 | ⏸ مؤجّل (هيكل فقط) |
| `AccountingModule` | `accounting/` (invoices) | mds/04 §6، mds/06 §4 | ✅ (فاتورة) / ⏸ (متقدم) |
| `ReviewsModule` | `reviews/` | mds/03 §8، mds/04 | ✅ |
| `CouponsModule` | `coupons/` | mds/03 §9، mds/05 | ✅ (أساسي) |
| `CustomersCrmModule` | `customers/` | mds/04 §7 | ⏸ مؤجّل (ملف عميل فقط MVP) |
| `NotificationsModule` | `notifications/` | mds/06 §5، mds/09 §3 | ✅ |
| `SearchModule` | `search/` (Meilisearch) | mds/03 §3، mds/09 §5 | ✅ |
| `SettingsModule` | `settings/` | mds/04 §8، mds/09 §1-2 | ✅ (أساسي) |
| `ReportsModule` | `reports/` | mds/04 §1, §6 | ✅ (لوحة أساسية) / ⏸ (متقدم) |
| `AuditModule` | `audit/` | mds/10 §7 | ✅ |
| `PaymentsModule` | `payments/` | mds/09 §1 | ✅ (COD) / ⏸ (بوابة) |
| `ShippingModule` | `shipping/` | mds/09 §2 | ✅ (يدوي) / ⏸ (API) |

وحدات بنية تحتية مشتركة (`CoreModule`/`SharedModule`): `PrismaModule`, `RedisModule`, `ConfigModule`, `SchedulerModule` (`@nestjs/schedule`), `EventEmitterModule` (`@nestjs/event-emitter` — العصب للترابط التلقائي mds/04 §9), `BullModule` (طوابير للإشعارات/المهام المتأخرة).

---

#### AuthModule

الـ services: `AuthService`, `TokenService` (JWT + Refresh، mds/02)، `TwoFactorService` (TOTP — 2FA إلزامي للمدير mds/10 §6)، `OtpService` (mds/03 §7، mds/09 §3)، `PasswordService` (bcrypt/argon2 mds/07).

| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `api/auth/register` | Public (عميل، mds/03 §7) |
| POST | `api/auth/login` | Public |
| POST | `api/auth/refresh` | Public (refresh cookie) |
| POST | `api/auth/logout` | Authenticated |
| POST | `api/auth/otp/request` · `api/auth/otp/verify` | Public (OTP mds/09 §3) |
| POST | `api/auth/password/forgot` · `api/auth/password/reset` | Public |
| POST | `api/auth/2fa/enable` · `api/auth/2fa/verify` | Admin (mds/10 §6) |
| POST | `api/auth/google` | Public (⏸ مؤجّل اختياري mds/03 §7) |

- Refresh token مخزّن في Redis (rotation + revocation)، Access JWT قصير العمر. Rate limiting على login/otp (mds/07). تسجيل خروج تلقائي عند الخمول + تنبيه دخول من جهاز جديد (mds/10 §6).

#### UsersRolesModule

الـ services: `UsersService`, `RolesService`, `PermissionsService`. الجداول: `users`, `roles`, `permissions`, `role_permissions` (mds/05). دعم أدوار مخصصة وتعديل صلاحيات وإسناد أكثر من دور (mds/10 §5).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET/POST/PATCH/DELETE | `api/admin/users` | `users.manage` (Admin، mds/10 §3) |
| GET/POST/PATCH | `api/admin/roles` | `roles.manage` (Admin) |
| GET | `api/admin/permissions` | `roles.manage` (Admin) |
| GET/PATCH | `api/me` (ملف العميل، mds/03 §7) | Authenticated (customer) |

DELETE على users/products/orders = soft-delete (`deleted_at`، mds/05 §3). كل تعديل مستخدم/دور/صلاحية → `AuditModule` (mds/10 §7).

#### CatalogModule

الـ services: `ProductsService`, `CategoriesService`, `VariantsService`, `ProductImagesService`. الجداول: `categories`, `products` (`gold_type` روسي/صيني، `base_price`, `discount_price`, `is_active`, `is_featured`)، `product_variants` (`sku`, `size`, `color`, `price`)، `product_images` (mds/05).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/products` (فلترة/ترتيب/pagination، mds/03 §2) | Public |
| GET | `api/products/:slug` (تفاصيل + variants + images، mds/03 §4) | Public |
| GET | `api/categories` (شجرة parent_id) | Public |
| POST/PATCH/DELETE | `api/admin/products` | `products.write` / `products.delete` (Admin+Inventory، mds/10 §3) |
| POST | `api/admin/products/:id/variants` | `products.write` |
| POST | `api/admin/products/:id/images` (رفع متعدد) | `products.write` |
| POST | `api/admin/products/import` (Excel/CSV) | `products.write` (⏸ مؤجّل mds/04 §2) |
| GET | `api/admin/products/export` | `products.read` (⏸ مؤجّل) |

- بعد أي إنشاء/تعديل منتج: إطلاق `product.upserted` event → `SearchModule` يفهرس في Meilisearch.
- الصور تُخزَّن على volume محلي/MinIO خلف Cloudflare (mds/02، mds/11)، تُعالَج WebP/أحجام متعددة (mds/07). الرابط في `product_images.image_url`، تُخدَم عبر `uploads/*`.
- **MVP**: CRUD منتجات + متغيرات + صور + تصنيفات. **مؤجّل**: استيراد/تصدير بالجملة، الوسوم (Tags).

#### InventoryModule — محرّك المخزون والحجز (تعمّق)

الـ services: `InventoryService` (المحرّك)، `ReservationService`، `StockMovementService`، `LowStockAlertService`، `StockCountService` (⏸). الجداول: `product_variants` (`stock_quantity`, `reserved_quantity`, `min_stock_alert`)، `stock_movements` (`type`: إدخال/إخراج/مرتجع/تالف/تسوية/تحويل، `quantity`, `reference`, `warehouse_id`, `created_by`) (mds/05، mds/04 §3).

المعادلة الأساسية (mds/06 §3): `available = stock_quantity - reserved_quantity`.

دورة الكمية (mds/06 §3):

| الحدث | `stock_quantity` | `reserved_quantity` | حركة `stock_movements` |
|-------|:----------------:|:-------------------:|------------------------|
| إنشاء الطلب (checkout) | — | `+= qty` | — |
| تأكيد الطلب | `-= qty` | `-= qty` | إخراج (`-qty`) |
| إلغاء (جديد/مؤكد) | (إن كان مؤكداً: `+= qty`) | `-= qty` | تسوية |
| إرجاع (مُسلّم) | `+= qty` | — | مرتجع (`+qty`) |
| استلام شراء | `+= qty` | — | إدخال (`+qty`) |
| انتهاء مهلة الحجز | — | `-= qty` | — |

**القفل ومنع البيع المزدوج** — كل تعديل كمية داخل معاملة مع `SELECT ... FOR UPDATE` على صف المتغير (mds/06 §3):

```ts
// ReservationService.reserve(items): يُستدعى داخل CheckoutModule
async reserve(tx, items: { variantId, qty }[]) {
  for (const it of orderByVariantId(items)) {        // ترتيب ثابت لتفادي deadlock
    // قفل الصف: لا قارئ كاتب آخر يمر حتى تنتهي المعاملة
    const v = await tx.$queryRaw`
      SELECT id, stock_quantity, reserved_quantity
      FROM product_variants
      WHERE id = ${it.variantId} FOR UPDATE`;
    const available = v.stock_quantity - v.reserved_quantity;
    if (available < it.qty) throw new ConflictException('INSUFFICIENT_STOCK');
    await tx.$executeRaw`
      UPDATE product_variants
      SET reserved_quantity = reserved_quantity + ${it.qty}
      WHERE id = ${it.variantId}`;
  }
}
```

```ts
// InventoryService.commit(tx, order): عند التأكيد — خصم نهائي + حركة + إعادة تحقق
async commit(tx, order) {
  for (const it of orderItemsSorted(order)) {
    const v = await tx.$queryRaw`
      SELECT stock_quantity, reserved_quantity
      FROM product_variants WHERE id = ${it.variantId} FOR UPDATE`;
    if (v.stock_quantity < it.qty)                    // إعادة تحقق لحظة التأكيد (mds/06 §3)
      throw new ConflictException('STOCK_CHANGED');
    await tx.$executeRaw`
      UPDATE product_variants
      SET stock_quantity   = stock_quantity   - ${it.qty},
          reserved_quantity = GREATEST(reserved_quantity - ${it.qty}, 0)
      WHERE id = ${it.variantId}`;
    await this.movements.record(tx, {
      variantId: it.variantId, type: 'OUT', quantity: -it.qty,
      reference: order.order_number, createdBy: order.changed_by });
    if (newStock <= v.min_stock_alert)                // تنبيه حد أدنى (mds/04 §3)
      this.events.emit('inventory.low_stock', { variantId: it.variantId });
  }
}
```

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/inventory` (كميات لحظية + available) | `inventory.read` (الكل، mds/10 §3) |
| PATCH | `api/admin/inventory/:variantId` (تعديل يدوي → حركة تسوية) | `inventory.adjust` (Admin+Inventory) |
| GET | `api/admin/inventory/movements` | `inventory.read` |
| GET | `api/admin/inventory/low-stock` (شبه/نافد، mds/04 §3) | `inventory.read` |
| POST | `api/admin/inventory/stock-count` (جرد وتسوية) | `inventory.adjust` (⏸ مؤجّل) |

- التعديل اليدوي وكل تسوية → `AuditModule` (مع before/after، mds/10 §7).
- **MVP**: تتبّع لحظي، حجز/خصم/إعادة، حركات، تنبيه حد أدنى. **مؤجّل** (mds/08): الجرد الدوري، المستودعات المتعددة والتحويل بينها (`warehouse_id` يبقى عموداً، الافتراضي مستودع واحد).

#### CartModule

الـ services: `CartService` (مدعوم بـ Redis للسلة الحيّة + جداول `carts`/`cart_items` لـ Persistent Cart للعميل المسجّل، mds/03 §5). لا حجز هنا — التوفّر يُتحقق منه عرضاً فقط (mds/06 §1).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/cart` | Public (جلسة guest عبر cart token) / Authenticated |
| POST | `api/cart/items` · PATCH/DELETE `api/cart/items/:id` | كما أعلاه |
| POST | `api/cart/merge` (دمج سلة الضيف عند الدخول) | Authenticated |

#### CheckoutModule — تنسيق الطلب (Orchestrator)

الـ service: `CheckoutService` (لا يكتب المخزون مباشرة؛ ينسّق Cart→Coupon→Reservation→Order). يطبّق التدفق (mds/06 §1-2):

```ts
async checkout(dto): Promise<Order> {
  return this.prisma.$transaction(async (tx) => {
    const cart  = await this.cart.loadValidated(tx, dto);          // 1
    const disc  = await this.coupons.apply(tx, cart, dto.couponCode); // كوبون mds/03 §9
    await this.reservation.reserve(tx, cart.items);               // 2: حجز + FOR UPDATE
    const order = await this.orders.create(tx, {                  // status='NEW' (جديد)
      ...cart, ...disc, payment_method: dto.method,
      reservation_expires_at: now() + RESERVATION_TTL });
    if (dto.method === 'COD') { /* يبقى "جديد" لتأكيد يدوي (mds/06 §3) */ }
    else this.events.emit('payment.required', { orderId: order.id }); // بوابة → Webhook
    return order;
  });
}
```

| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `api/checkout` (إنشاء طلب من السلة، COD أو إلكتروني) | Authenticated / Guest Checkout (mds/03 §6) |
| POST | `api/checkout/estimate` (شحن + خصم تقديري) | Public |

#### OrdersModule — آلة حالات الطلب (تعمّق)

الـ services: `OrdersService`, `OrderStateMachine`, `ReturnsService`, `OrderQueryService`. الجداول: `orders` (UUID، `order_number`, `status` ENUM، `payment_status`, `payment_method`)، `order_items` (تخزين `unit_price` وقت الطلب، mds/05 §3)، `order_status_history`, `addresses` (mds/05).

آلة الحالات (mds/04 §4، mds/06 §1-2) — الانتقالات المسموحة فقط:

```
NEW(جديد) ──confirm──► CONFIRMED(مؤكد) ──process──► PROCESSING(قيد التجهيز)
   │                       │                              │
   │                       │                          ──ship──► SHIPPED(مشحون) ──deliver──► DELIVERED(مُسلّم)
   └──cancel──┐            └──cancel──┐                                                          │
              ▼                       ▼                                                    ──return──► RETURNED(مرتجع)
          CANCELLED(ملغي) ◄───────────┘
```

```ts
const TRANSITIONS: Record<Status, Status[]> = {
  NEW:        ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['RETURNED'],
  CANCELLED:  [], RETURNED: [],
};

async transition(orderId, to: Status, actor) {
  return this.prisma.$transaction(async (tx) => {
    const o = await tx.$queryRaw`SELECT * FROM orders WHERE id=${orderId} FOR UPDATE`;
    if (!TRANSITIONS[o.status].includes(to))
      throw new BadRequestException('INVALID_TRANSITION');

    if (to === 'CONFIRMED') await this.inventory.commit(tx, o);          // خصم نهائي + حركة إخراج
    if (to === 'CANCELLED') await this.inventory.release(tx, o);         // إعادة/تحرير الحجز
    if (to === 'RETURNED')  await this.inventory.restock(tx, o);         // إعادة الكمية (حركة مرتجع)

    await tx.order.update({ where:{id:orderId}, data:{ status: to }});
    await tx.order_status_history.create({ data:{ order_id:orderId, status:to, changed_by:actor.id }});

    // الترابط التلقائي (mds/04 §9، mds/06 §4) — events بعد commit المعاملة:
    this.events.emit(`order.${to.toLowerCase()}`, { order: o, actor });
  });
}
```

الترابط التلقائي بيع→مخزون→محاسبة→عميل (mds/04 §9، mds/06 §4) — عبر `EventEmitter` (listeners بعد نجاح المعاملة):

| Event | Listener → النتيجة |
|-------|--------------------|
| `order.confirmed` | `InventoryService` (خصم — تمّ داخل المعاملة) · `AccountingService` → إنشاء فاتورة + قيد إيراد · `CustomersCrmService` → تحديث سجل الشراء/القيمة الإجمالية · `NotificationsService` → "تم تأكيد طلبك" |
| `order.shipped` | `NotificationsService` → "تم شحن طلبك — رقم التتبّع" (mds/06 §5) |
| `order.delivered` | `PaymentsService` → تحصيل COD + `payment_status='paid'` · `NotificationsService` → "تم التسليم" + طلب تقييم |
| `order.cancelled` | `InventoryService` (إعادة — تمّ) · `AccountingService` → إلغاء/استرداد · `CustomersCrmService` · `NotificationsService` → "تم إلغاء طلبك" |
| `order.returned` | `InventoryService` (restock) · `AccountingService` → Refund · `CustomersCrmService` |

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/orders` (فلترة: status/date/customer/payment، mds/04 §4) | `orders.read` (الكل) |
| GET | `api/admin/orders/:id` | `orders.read` |
| POST | `api/admin/orders/:id/confirm` | `orders.confirm` (Admin+Sales، mds/10 §3) |
| POST | `api/admin/orders/:id/cancel` | `orders.confirm` |
| POST | `api/admin/orders/:id/process` · `/ship` · `/deliver` | `orders.confirm` |
| PATCH | `api/admin/orders/:id` (تعديل عناصر) | `orders.edit` (Admin+Sales) |
| POST | `api/admin/orders/:id/returns` · `/returns/:rid/approve` | `returns.manage` (Admin+Sales، mds/10 §3) |
| GET | `api/orders` · `api/orders/:orderNumber/track` (تتبّع، mds/03 §7) | Authenticated (customer — طلباته فقط) |

- كل انتقال حالة وتعديل/استرداد → `AuditModule` (mds/10 §7). إشعار للعميل عند كل تغيّر حالة (mds/04 §4، mds/06 §5).
- **انتهاء مهلة الحجز (Scheduled Job)** — في `OrdersModule` عبر `@nestjs/schedule` (mds/06 §2):

```ts
@Cron('*/2 * * * *')                          // كل دقيقتين
async expireReservations() {
  const stale = await this.orders.findMany({
    where: { status: 'NEW', reservation_expires_at: { lt: now() } }});
  for (const o of stale)
    await this.stateMachine.transition(o.id, 'CANCELLED', SYSTEM_ACTOR);
  // transition('CANCELLED') ينفّذ release() الذي يحرّر reserved_quantity تلقائياً
}
```

- **MVP**: كل آلة الحالات + المرتجعات الأساسية + التتبّع. **مؤجّل**: تعديل عناصر طلب مؤكد متقدم، تعدد المندوبين.

#### PaymentsModule

الـ services: `PaymentsService`, `PaymentWebhookService` (التحقق من التوقيع، mds/09 §6)، `RefundService`. التدفق (mds/09 §1): العميل → بوابة آمنة → Webhook → `order.confirm` تلقائياً عند النجاح. بيانات البطاقة لا تمر عبر الخادم (mds/09 §1).

| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `api/payments/initiate/:orderId` | Authenticated |
| POST | `api/payments/webhook/:provider` | Public (signature-verified، mds/09 §6) |
| POST | `api/admin/payments/:orderId/refund` | `payments.refund` (Admin+Accountant) |

**MVP**: COD (تحصيل عند التسليم). **مؤجّل**: بوابة بطاقة + محافظ (تصميم مرن لتبديل المزوّد، mds/09 §6).

#### ShippingModule

الـ services: `ShippingService`, `ShippingZonesService` (مناطق ورسوم، mds/09 §2). حساب الرسوم حسب المنطقة + شحن مجاني فوق مبلغ (اختياري).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/shipping/rate?city=` | Public |
| POST | `api/admin/orders/:id/shipment` (رقم تتبّع يدوي، mds/09 §2) | `orders.confirm` |
| GET/POST | `api/admin/settings/shipping-zones` | `settings.store` (Admin) |

**MVP**: مناطق/رسوم + رقم تتبّع يدوي. **مؤجّل**: تكامل API مباشر مع شركة شحن.

#### ProcurementModule

الـ services: `SuppliersService`, `PurchaseOrdersService`. الجداول: `suppliers`, `purchase_orders` (`status`: معلّق/مستلم جزئي/مستلم، `total_cost`)، `purchase_order_items` (`unit_cost`) (mds/05، mds/04 §5).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET/POST/PATCH | `api/admin/suppliers` | `procurement.write` (Admin+Inventory، mds/10 §3) |
| GET | `api/admin/purchase-orders` | `procurement.read` (Admin+Inventory+Accountant) |
| POST | `api/admin/purchase-orders` | `procurement.write` |
| POST | `api/admin/purchase-orders/:id/receive` | `procurement.write` |

- عند الاستلام: `purchase.received` event → `InventoryService.restock` (حركة إدخال `+qty`) + `AccountingService` تسجيل تكلفة + تحديث سجل المورد (mds/04 §9، mds/06 §4).
- **مؤجّل بالكامل من حيث الواجهة الكاملة** (mds/08): يُبنى الهيكل والجداول والـ endpoints الأساسية فقط؛ تحليل التكلفة وهامش الربح مؤجّل.

#### AccountingModule

الـ services: `InvoiceService` (فاتورة تلقائية لكل طلب مؤكد، mds/04 §6، mds/06 §4)، `LedgerService` (قيود إيراد/تكلفة/استرداد — مبسّط MVP). الفاتورة تُولَّد عند `order.confirmed`، PDF عبر `api/admin/orders/:id/invoice.pdf`.

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/orders/:id/invoice` (+`.pdf`) | `orders.read` |
| GET | `api/admin/accounting/reports/*` | `accounting.read` (Admin+Accountant، mds/10 §3) |

**MVP**: فاتورة تلقائية + قيد إيراد مبسّط. **مؤجّل** (mds/08): دفتر أستاذ كامل، محاسبة متقدمة.

#### ReviewsModule

الـ service: `ReviewsService`. الجدول `reviews` (`rating` 1-5, `comment`, `is_approved`). العميل يكتب مراجعة لمنتج اشتراه (يُربط بطلب مُسلّم).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/products/:id/reviews` | Public (المعتمدة فقط) |
| POST | `api/products/:id/reviews` | Authenticated (customer) |
| PATCH | `api/admin/reviews/:id/approve` | `reviews.moderate` (Admin+Sales) |

#### CouponsModule

الـ service: `CouponsService`. الجدول `coupons` (`code`, `type` نسبة/مبلغ, `value`, `min_order`, `usage_limit`, `expires_at`). التحقق ذرّياً أثناء checkout (حد الاستخدام، الانتهاء، الحد الأدنى).

| Method | Path | الصلاحية |
|--------|------|----------|
| POST | `api/coupons/validate` | Public/Authenticated |
| GET/POST/PATCH/DELETE | `api/admin/coupons` | `coupons.manage` (Admin+Sales) |

**MVP**: نسبة/مبلغ + قيود. **مؤجّل**: "اشترِ X واحصل على Y" (mds/03 §9).

#### CustomersCrmModule

الـ services: `CustomersService` (ملف العميل + سجل الطلبات + القيمة الإجمالية، mds/04 §7). يستمع لـ `order.*` لتحديث السجل تلقائياً (mds/04 §9).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/customers` · `api/admin/customers/:id` | `customers.read` (Admin+Sales+Accountant، mds/10 §3) |
| POST | `api/admin/campaigns` | `campaigns.manage` (Admin+Sales) |

**MVP**: ملف العميل + سجل المشتريات (تحديث تلقائي). **مؤجّل** (mds/08): التقسيم (Segmentation)، الحملات الموجّهة، برنامج الولاء.

#### NotificationsModule

الـ services: `NotificationsService`, `EmailChannel`, `SmsChannel`, `WebPushChannel`, `WhatsappChannel` (⏸). يعمل عبر `BullModule` (طابور + إعادة محاولة عند الفشل، mds/09 §6). يستمع لـ `order.*` و`inventory.low_stock` (mds/06 §5، mds/09 §3).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/notifications` (للعميل المسجّل) | Authenticated |
| POST | `api/admin/notifications/test` | Admin |

قوالب: تأكيد تسجيل/OTP، تأكيد طلب، تحديثات الحالة، تنبيهات إدارية (مخزون منخفض/طلب جديد). **MVP**: بريد + SMS + إشعار موقع. **مؤجّل**: واتساب، البريد التسويقي.

#### SearchModule

الـ services: `SearchService`, `SearchIndexerService` (Meilisearch، mds/02، mds/09 §5). يستمع لـ `product.upserted`/`product.deleted` للمزامنة. autocomplete + بحث بالاسم/التصنيف/SKU + تصحيح إملائي + فلترة/ترتيب (mds/03 §3).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/search?q=` (+facets) | Public |
| GET | `api/search/suggest?q=` (autocomplete) | Public |
| POST | `api/admin/search/reindex` | Admin |

#### SettingsModule

الـ service: `SettingsService` (key-value مخزّن + كاش Redis). إعدادات المتجر/الشحن/الدفع/الضرائب/الصفحات الثابتة/البانرات (mds/04 §8). تعدد اللغات/العملة مؤجّل (mds/08).

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/settings/public` (الاسم/الشعار/التواصل) | Public |
| GET/PATCH | `api/admin/settings/*` | `settings.store` (Admin، mds/10 §3) |

#### ReportsModule

الـ services: `DashboardService`, `ReportsService` (تجميعات SQL + كاش Redis). لوحة المعلومات (mds/04 §1): إجمالي المبيعات، الطلبات حسب الحالة، تنبيهات المخزون، الأكثر مبيعاً، عملاء جدد.

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/dashboard` | Authenticated admin-panel (mds/04 §1) |
| GET | `api/admin/reports/sales` · `/profit` · `/inventory` · `/products` · `/customers` | `accounting.read` (Admin+Accountant، mds/10 §3) |
| GET | `api/admin/reports/:type/export?format=xlsx\|pdf` | `accounting.export` |

**MVP**: لوحة أساسية + تقرير مبيعات/مخزون. **مؤجّل** (mds/08): تقارير الأرباح/الكوبونات/المرتجعات المتقدمة، الجدولة الدورية.

#### AuditModule

الـ service: `AuditService` + `AuditInterceptor`. يسجّل العمليات الحساسة (mds/10 §7): تعديل/حذف منتج، تعديل مخزون يدوي، تأكيد/إلغاء/تعديل طلب، استرداد مالي، تغيير إعدادات، إدارة مستخدمين/أدوار/صلاحيات. كل سجل: المستخدم، العملية، الوقت، before/after.

| Method | Path | الصلاحية |
|--------|------|----------|
| GET | `api/admin/audit-logs` (فلترة بالمستخدم/العملية/التاريخ) | `audit.read` (Admin فقط، mds/10 §3) |

---

#### ملخص ترتيب البناء (MVP أولاً، mds/08)

1. البنية التحتية: `Prisma + Redis + Config + Auth + UsersRoles + Audit + PermissionsGuard`.
2. الكتالوج: `Catalog + Search + Settings (public)`.
3. الشراء: `Cart + Coupons + Checkout + Reservation`.
4. القلب: `Orders (state machine) + Inventory engine + Accounting(invoice) + Payments(COD) + Shipping(يدوي) + Notifications`.
5. ما بعد البيع: `Reviews + CustomersCrm(ملف) + Reports(لوحة) + Dashboard`.
6. مؤجّل (هيكل فقط الآن): `Procurement`، المستودعات المتعددة، الجرد، بوابة الدفع، تكامل شحن API، الحملات/الولاء، المحاسبة المتقدمة، تعدد اللغات.

المراجع المعتمدة: mds/02 (الستاك والمعمارية)، mds/03 (المتجر)، mds/04 (ERP والترابط §9)، mds/05 (الجداول)، mds/06 (دورة الطلب والمخزون §3)، mds/09 (التكاملات)، mds/10 (الأدوار والصلاحيات §3, §6, §7).

---

## 4. واجهة المتجر (Next.js Storefront)

### واجهة المتجر (Next.js Storefront)

تُبنى واجهة المتجر بـ Next.js (App Router, TypeScript, Tailwind, RTL) كما في mds/02 §2، منفصلة عن الباكند عبر REST API (mds/02 §1)، وتستهلك endpoints الباكند تحت `/api/*` و`/uploads/*` (توجيه Cloudflare Tunnel حسب المسار). تقع تحت `/frontend` في المستودع (mds/11). الهدف: SSR/SSG لتغطية SEO والأداء (mds/07 §2،§3) مع Lighthouse>90 وFCP<1.5s.

---

### 1. شجرة المسارات (App Router) — `frontend/src/app/`

تُغلَّف كل مسارات المتجر في route group `(shop)` لمشاركة `layout` (Header/Footer/CartDrawer)، ومسارات الحساب في `(account)` خلف middleware حماية، والمصادقة في `(auth)`.

```
app/
├── layout.tsx                       # root: <html dir="rtl" lang="ar">, خطوط، Providers, ThemeColor
├── globals.css                      # Tailwind + متغيرات (ذهبي/أسود/أبيض) mds/03 §10
├── sitemap.ts                       # sitemap.xml تلقائي (mds/07 §3)
├── robots.ts                        # robots.txt (mds/07 §3)
├── manifest.ts                      # PWA-ready (مؤجّل تفعيلاً)
├── not-found.tsx  /  error.tsx  /  loading.tsx  /  global-error.tsx
│
├── (shop)/
│   ├── layout.tsx                   # Header + SearchBar + Footer + CartDrawer + WhatsApp FAB (mds/03 §8)
│   ├── page.tsx                     # الرئيسية (mds/03 §1) — ISR
│   │
│   ├── c/
│   │   └── [...slug]/page.tsx       # التصنيفات + الفرعية (catch-all) — مع الفلترة/الفرز/الترقيم (mds/03 §2)
│   │
│   ├── p/
│   │   └── [slug]/page.tsx          # صفحة المنتج (mds/03 §4) — ISR + generateStaticParams + generateMetadata
│   │
│   ├── search/page.tsx              # نتائج البحث الكاملة (mds/03 §3) — CSR/SSR هجين
│   ├── cart/page.tsx                # السلة (mds/03 §5)
│   │
│   ├── checkout/                    # الدفع متعدد الخطوات (mds/03 §6)
│   │   ├── layout.tsx               # CheckoutStepper + ملخص جانبي
│   │   ├── page.tsx                 # خطوة 1: العنوان (shipping)
│   │   ├── shipping/page.tsx        # خطوة 2: طريقة الشحن
│   │   ├── payment/page.tsx         # خطوة 3: طريقة الدفع (إلكتروني/COD)
│   │   ├── review/page.tsx          # خطوة 4: المراجعة والتأكيد
│   │   └── confirmation/[orderNo]/page.tsx   # تأكيد + رقم الطلب
│   │
│   ├── track/page.tsx               # تتبّع الطلب كضيف (رقم طلب + بريد/هاتف) (mds/03 §7)
│   ├── wishlist/page.tsx            # المفضلة (متاح كضيف عبر localStorage، مزامنة عند الدخول)
│   └── (content)/
│       ├── about/page.tsx           # SSG
│       ├── contact/page.tsx
│       └── policies/[slug]/page.tsx # سياسات: returns/exchange/warranty/shipping (mds/03 §8) — SSG
│
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx               # بريد/هاتف + Google (اختياري) (mds/03 §7)
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── verify-otp/page.tsx          # OTP عبر SMS/بريد (mds/03 §7)
│
└── (account)/account/              # محمي عبر middleware (mds/10: دور customer)
    ├── layout.tsx                  # AccountSidebar (تنقّل الأقسام)
    ├── page.tsx                    # ملخص لوحة العميل
    ├── profile/page.tsx            # الملف الشخصي + كلمة المرور (mds/03 §7)
    ├── addresses/page.tsx          # عناوين متعددة (جدول addresses)
    ├── orders/page.tsx             # طلباتي (سجل الحالات)
    ├── orders/[orderNo]/page.tsx   # تفاصيل + تتبّع لحظي (order_status_history)
    ├── wishlist/page.tsx           # المفضلة المسجّلة (جدول wishlists)
    └── reviews/page.tsx            # مراجعاتي (جدول reviews)
```

ملاحظات على المسارات: روابط نظيفة (`/p/[slug]`, `/c/[...slug]`) تطابق مطلب Clean URLs (mds/07 §3). أرقام الطلبات في URL تستخدم `order_number` (وليس UUID `orders.id` الحساس — mds/05) منعاً لتسريب المعرّفات (mds/07 §3: عدم تمرير بيانات حساسة في URL). `middleware.ts` في الجذر يحمي `(account)` بفحص وجود refresh cookie ويعيد التوجيه إلى `/login?next=`.

---

### 2. المكوّنات القابلة لإعادة الاستخدام — `frontend/src/components/`

| المجموعة | المكوّن | الوظيفة / المرجع |
|----------|---------|-------------------|
| layout | `Header`, `Footer`, `MobileNav`, `MegaMenu` | تنقّل + أقسام التصنيفات (mds/03 §1) |
| layout | `Breadcrumbs` (Server) | + BreadcrumbList schema.org |
| product | `ProductCard` (Server) | بطاقة شبكة: صورة WebP، سعر/سعر قبل الخصم، شارة توفّر |
| product | `ProductGrid`, `CategoryGrid` | عرض شبكي (mds/03 §2) |
| product | `PriceTag` | السعر + الخصم + العملة |
| product | `StockBadge` | متاح/نفد بناءً على `stock_quantity - reserved_quantity` (mds/06 §3) |
| product | `ProductGallery` (Client) | معرض + Zoom + thumbnails (mds/03 §4) |
| product | `VariantSelector` (Client) | اختيار المقاس/اللون من `product_variants` (mds/03 §4) |
| product | `QuantityStepper`, `AddToCartButton`, `WishlistButton`, `ShareMenu` | تفاعل المنتج (mds/03 §4) |
| product | `ReviewList`, `ReviewStars`, `ReviewForm` | التقييمات (جدول reviews) (mds/03 §4،§8) |
| product | `RelatedProducts`, `RecentlyViewed` | "منتجات مشابهة" / "قد يعجبك" (mds/03 §4،§9) |
| search | `SearchBar` (Client) | بحث فوري + Autocomplete (Meilisearch) (mds/03 §3) |
| search | `SearchSuggestions`, `SearchEmptyState` | اقتراحات + تصحيح إملائي |
| filter | `FilterSidebar`, `FilterMobileSheet` | النوع/التصنيف/السعر/اللون/المقاس/التوفّر (mds/03 §2) |
| filter | `PriceRangeSlider`, `SortDropdown`, `ActiveFilterChips`, `Pagination` / `InfiniteScroller` | (mds/03 §2) |
| cart | `CartDrawer` (Client), `CartLineItem`, `CartSummary`, `CouponInput`, `ShippingEstimate` | السلة (mds/03 §5) |
| checkout | `CheckoutStepper`, `AddressForm`, `AddressBook`, `ShippingMethodSelect`, `PaymentMethodSelect`, `OrderSummaryAside` | الدفع (mds/03 §6) |
| account | `AccountSidebar`, `OrderRow`, `OrderStatusTimeline`, `AddressCard` | حساب العميل (mds/03 §7) |
| order | `OrderTracker` | خط زمني للحالات: جديد→مؤكد→تجهيز→مشحون→مُسلّم (mds/06 §1) |
| home | `HeroSlider`, `CategoryTiles`, `ProductCarousel`, `BenefitsBar`, `OffersSection`, `NewsletterForm` | الرئيسية + تسويق (mds/03 §1،§9) |
| trust | `TrustBadges`, `WhatsAppFab`, `NotificationToast` | الثقة/الدعم (mds/03 §8) |
| ui (primitives) | `Button`, `Input`, `Select`, `Dialog`, `Drawer`, `Sheet`, `Tabs`, `Accordion`, `Skeleton`, `Rating`, `Badge`, `Toast`, `Spinner` | عناصر أساسية (Tailwind + Radix UI headless للوصولية WCAG mds/07 §4) |
| media | `ProductImage` | غلاف `next/image` بإعدادات WebP/sizes/blur (mds/07 §2) |
| seo | `JsonLd` | حقن schema.org (Product/Offer/AggregateRating/BreadcrumbList) |

**تقسيم Server/Client:** الافتراضي Server Components (RSC) لكل ما لا يحتاج تفاعلاً (بطاقات، شبكات، جداول، تفاصيل المنتج) لتقليل JS المُرسَل ودعم FCP<1.5s (mds/07 §2). تُحدَّد `"use client"` فقط على المكوّنات التفاعلية (Gallery، VariantSelector، CartDrawer، SearchBar، الفلاتر، النماذج).

---

### 3. استراتيجية البيانات (RSC / SSR / SSG / ISR)

المبدأ: SSG/ISR للصفحات القابلة للأرشفة (SEO + أداء mds/07 §2،§3)، SSR لما يعتمد على المستخدم/الجلسة، CSR للحالات التفاعلية اللحظية. كل الجلب من السيرفر يتم عبر RSC بـ `fetch` مع `next: { revalidate, tags }` (cache + on-demand revalidation).

| الصفحة | الأسلوب | السبب | إعادة التحقق |
|--------|---------|--------|--------------|
| الرئيسية `/` | **ISR** | محتوى شبه ثابت يتغيّر بالعروض/المميّز (mds/03 §1) | `revalidate: 300` + tag `home` |
| التصنيف `/c/[...slug]` (بلا فلاتر) | **ISR** | قابل للأرشفة؛ مفهرس | `revalidate: 600` + tag `category:{id}` |
| التصنيف مع فلاتر/فرز (searchParams) | **SSR (dynamic)** | يعتمد على searchParams؛ لا يُخزَّن statically | `cache: no-store` للنتائج المفلترة |
| المنتج `/p/[slug]` | **ISR + generateStaticParams** | أهم صفحات SEO؛ توليد مسبق لأكثر المنتجات (mds/07 §3) | `revalidate: 300` + tag `product:{id}` |
| البحث `/search` | **SSR shell + CSR** | نتائج حية من Meilisearch؛ تفاعل عالٍ (mds/03 §3) | لا تخزين |
| السلة `/cart` | **CSR** | حالة عميل (Zustand)؛ خاصة بالجلسة (mds/03 §5) | — |
| الدفع `/checkout/*` | **SSR + CSR** | بيانات الجلسة/العناوين من API؛ نماذج تفاعلية (mds/03 §6) | `no-store` |
| الحساب `/account/*` | **SSR (dynamic, no-store)** | بيانات خاصة بالمستخدم؛ JWT (mds/07 §1) | — |
| تتبّع الطلب `/track`, `/account/orders/[orderNo]` | **SSR** | حالة لحظية للطلب (mds/06 §1) | `no-store` + polling/SWR كل 30ث |
| المحتوى/السياسات `(content)/*` | **SSG** | ثابت تماماً (mds/07 §2) | build-time |

**On-demand revalidation:** الباكند (NestJS) يستدعي webhook `POST /api/revalidate` (بتوقيع سرّي) عند تعديل منتج/سعر/مخزون/تصنيف من لوحة الإدارة → يستدعي Next.js `revalidateTag('product:{id}')`، فيُحدَّث الكاش فوراً دون نشر. هذا يحقق "تخزين مؤقت لصفحات المنتجات والتصنيفات" (mds/07 §2) مع دقة المخزون.

**طبقة الوصول للبيانات:** `frontend/src/lib/api/` — وحدات `products.ts`, `categories.ts`, `cart.ts`, `orders.ts`, `auth.ts`, `search.ts`. عميل `fetcher.ts` موحّد يضيف `Authorization: Bearer`، يعالج 401 بتجديد التوكن (refresh)، ويمرّر `tags/revalidate`. يُستهلك endpoints الباكند (mds/02 §6): `GET /api/products`, `GET /api/products/:slug`, `GET /api/categories`, `POST /api/cart/items`, `POST /api/orders`, `GET /api/orders/:orderNo/track`.

---

### 4. إدارة الحالة — السلة (Zustand + مزامنة Redis)

السلة هي الحالة المعقّدة الوحيدة على العميل (mds/02 §2: Zustand لإدارة السلة). الباكند يحفظ السلة في Redis للمسجّلين (mds/02 §2،§5: Redis للجلسات/السلة؛ جداول `carts`/`cart_items` للاستمرارية mds/05).

- **Store:** `frontend/src/store/cart.ts` — Zustand مع `persist` middleware (localStorage) للضيف. الشكل: `{ items: CartItem[], couponCode, addItem, updateQty, removeItem, clear, hydrate, merge }`. `CartItem = { variantId, productSlug, name, image, unitPrice, qty }` — يُخزَّن `unitPrice` لحظة الإضافة (يتوافق مع `order_items.unit_price` mds/05) لكنه يُعاد التحقق منه عند الدفع.
- **الضيف:** السلة في localStorage فقط؛ المفضلة كذلك (`store/wishlist.ts`).
- **المسجّل:** Zustand = مصدر العرض السريع (optimistic UI)؛ المصدر الموثوق = Redis عبر API. كل تعديل (add/update/remove) يطلق mutation متفائلة ثم `POST/PATCH/DELETE /api/cart/items`؛ عند الفشل rollback.
- **الدمج عند الدخول (merge):** بعد login/OTP ناجح:

```
on(loginSuccess):
  guestCart = cartStore.items        # من localStorage
  if guestCart not empty:
     POST /api/cart/merge { items: guestCart }   # الباكند يدمج في Redis + carts/cart_items
  serverCart = GET /api/cart                       # المصدر الموثوق
  cartStore.hydrate(serverCart); cartStore.clearLocalGuest()
```

- **إعادة التحقق من التوفّر:** السلة تعرض الأسعار/التوفّر فقط للعرض؛ التحقق الفعلي يحدث في الباكند لحظة `POST /api/orders` (حجز reserved_quantity مع row-lock، mds/06 §3) — الواجهة تعرض أخطاء "نفدت الكمية"/"تغيّر السعر" وتحدّث السطر. لا منطق مخزون في الواجهة.
- **بقية الحالة:** خادمية (RSC) أو SWR/React Query لبيانات الحساب اللحظية (تتبّع الطلب). لا Redux (Zustand كافٍ — mds/02 §2). جلسة المصادقة عبر httpOnly cookies (refresh) لا تُخزَّن في Zustand (أمان mds/07 §1).

---

### 5. الفلترة / الفرز / الترقيم

تُمثَّل كل حالة القائمة في URL `searchParams` (مشاركة + رجوع المتصفح + SEO + قابلية أرشفة):

```
/c/rings?type=russian&color=gold&size=18&priceMin=100&priceMax=500&inStock=1&sort=price_asc&page=2
```

- **القراءة:** RSC يقرأ `searchParams` ويبني استعلام إلى `GET /api/products?categorySlug=&type=&color=&size=&priceMin=&priceMax=&inStock=1&sort=&page=&pageSize=`. الفلاتر تطابق mds/03 §2 (النوع روسي/صيني، التصنيف، السعر، اللون، المقاس، التوفّر). التوفّر = `stock_quantity - reserved_quantity > 0` (mds/06 §3).
- **الفرز (mds/03 §2):** `newest | price_asc | price_desc | best_selling | top_rated` → يُمرَّر للباكند الذي يفرز على `products`/`product_variants` المفهرسة (mds/07 §2: فهرسة الحقول كثيرة الاستعلام).
- **الكتابة:** `SortDropdown`/`FilterSidebar` (Client) تستخدم `useRouter().replace(pathname + '?' + params)` (بدون scroll reset) فيعيد RSC الجلب.
- **الترقيم (mds/03 §2):** خياران مدعومان: `Pagination` كلاسيكي (افتراضي، أفضل لـ SEO + روابط مفهرسة) و`InfiniteScroller` (Client، IntersectionObserver، عرض جوال). الباكند يرجّع `{ items, total, page, pageSize, facets }`؛ `facets` تُغذّي عدّادات الفلاتر.
- **الأداء:** نتائج الفلاتر `no-store` لكن الباكند يخزّنها في Redis (mds/07 §2)؛ الترقيم على الخادم (mds/07 §2: Pagination بدل تحميل كل البيانات).

---

### 6. البحث الفوري (Meilisearch)

البحث (mds/03 §3) يستهلك Meilisearch (mds/02 §2) عبر الباكند فقط (لا مفاتيح في المتصفح — أمان mds/07 §1):

- **endpoint:** `GET /api/search?q=&limit=` يكشف proxy نحيف فوق Meilisearch index `products` (الحقول: `name, sku, category, type, color, price, slug, thumbnail`). الباكند يحقن `searchableAttributes` و`typoTolerance` (تصحيح إملائي mds/03 §3) و`filterableAttributes`.
- **Autocomplete:** `SearchBar` (Client) — `useDeferredValue` + debounce 200ms + إلغاء عبر `AbortController`؛ يعرض `SearchSuggestions` (منتجات + تصنيفات + "هل تقصد؟"). كاش جانب العميل بـ SWR بمفتاح `q`.
- **صفحة `/search`:** SSR shell (لـ SEO/مشاركة الرابط) ثم CSR للنتائج المباشرة القابلة للفلترة/الفرز (mds/03 §3) بإعادة استخدام نفس مكوّنات الفلترة في §5.
- **MVP:** بحث بالاسم/التصنيف/SKU + Autocomplete + تصحيح إملائي. **مؤجّل:** البحث الدلالي/الموجَّه بالصور والاقتراحات المخصّصة المتقدمة.

---

### 7. RTL والعربية وبنية i18n-ready

- **RTL افتراضي:** `<html lang="ar" dir="rtl">` في root layout. Tailwind بإضافة `tailwindcss-rtl` أو الاعتماد على logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, `text-end`) لتفادي إعادة العمل عند إضافة الإنجليزية.
- **الخطوط:** `next/font` بخط عربي (مثل IBM Plex Sans Arabic / Tajawal) مع `display: swap` و`preload` لدعم FCP (mds/07 §2). متغيّر CSS للأرقام العربية/اللاتينية.
- **i18n-ready (m:** البنية جاهزة للترجمة لكن **تعدد اللغات مؤجّل** (mds/08). يُجهَّز ملف رسائل `frontend/src/i18n/ar.json` وغلاف `t()` بسيط (أو `next-intl` غير مفعّل لمسار locale) بحيث لا توجد نصوص ثابتة مبعثرة في JSX؛ بنية App Router تسمح لاحقاً بإضافة segment `[locale]` دون إعادة هيكلة. الألوان والهوية: ذهبي/أسود/أبيض (mds/03 §10).
- **التصميم المتجاوب + الوصولية (WCAG):** mobile-first، تباين ألوان كافٍ، تنقّل بلوحة المفاتيح، `aria-*` عبر Radix، نصوص بديلة للصور (mds/07 §3،§4؛ mds/03 §10).

---

### 8. SEO (metadata / sitemap / schema.org / OpenGraph)

تطبيق متطلبات mds/07 §3 بالكامل:

- **Metadata API:** `generateMetadata` لكل صفحة منتج/تصنيف من بيانات الباكند → `title`, `description` (وصف غني mds/07 §3)، `alternates.canonical` (روابط نظيفة)، `openGraph` (صورة المنتج، نوع `product`)، `twitter` cards. Root `metadata` يضبط `metadataBase`, `templateTitle`, الأيقونات، `theme-color` ذهبي.
- **OpenGraph ديناميكي:** `app/p/[slug]/opengraph-image.tsx` (ImageResponse) لصور مشاركة جذابة لكل منتج (mds/07 §3).
- **schema.org (JsonLd):** على صفحة المنتج `Product` + `Offer` (price, availability من المخزون mds/06 §3) + `AggregateRating` (من reviews mds/03 §8)؛ على التصنيف/المنتج `BreadcrumbList`؛ على الجذر `Organization` + `WebSite` (+ SearchAction للبحث). يُحقن عبر مكوّن `JsonLd`.
- **sitemap.ts:** يولّد `sitemap.xml` ديناميكياً بجلب slugs المنتجات/التصنيفات من الباكند (mds/07 §3) مع `lastModified` من `updated_at`. عند الحجم الكبير → sitemap index مقسّم.
- **robots.ts:** يسمح بالعام، يمنع `/account/*`, `/checkout/*`, `/cart`, `/api/*` (mds/07 §3).
- **بنية العناوين:** H1 واحد لكل صفحة (اسم المنتج/التصنيف)، H2/H3 منظّمة، Alt Text لكل صورة (mds/07 §3).

---

### 9. تحسين الصور (next/image / WebP / lazy)

تطبيق mds/07 §2:

- **`next/image`** عبر غلاف `ProductImage`: `formats: ['image/avif','image/webp']` (WebP مطلوب نصاً mds/07 §2)، `sizes` متجاوبة، `quality: 75`.
- **Lazy loading افتراضي** لكل الصور عدا الـ LCP (صورة الـ Hero وأول صورة منتج تأخذ `priority`).
- **placeholder="blur"** بـ blurDataURL لتقليل CLS.
- **مصدر الصور:** الباكند يخدم WebP بأحجام متعددة من `product_images` عبر `/uploads/*` خلف Cloudflare CDN (mds/02 §4،§5؛ mds/11)؛ ضبط `images.remotePatterns` لدومين `matjer.grade.sbs`/CDN. الضغط عند الرفع يتم في الباكند (mds/07 §2)، والواجهة تطلب المقاس المناسب فقط.

---

### 10. معايير الأداء (Lighthouse>90, FCP<1.5s)

أهداف mds/07 §2 (صفحة<3s، FCP<1.5s، Lighthouse>90) وطرق تحقيقها:

- **RSC افتراضياً** + تقليل bundle العميل: `"use client"` على أوراق الشجرة فقط؛ `next/dynamic` لمكوّنات ثقيلة (Gallery/Zoom، CheckoutStepper) (Code Splitting mds/07 §2).
- **ISR/SSG** لأهم الصفحات (الرئيسية/المنتج/التصنيف) لتقديم HTML شبه فوري + كاش حافة Cloudflare.
- **Streaming + Suspense:** `loading.tsx` و`<Suspense>` لبثّ shell الصفحة فوراً (تحسين FCP) مع `Skeleton` للأجزاء البطيئة.
- **Fonts:** `next/font` بـ `swap`/`preload` لتفادي FOIT.
- **الصور:** LCP `priority` + WebP + blur (تقليل CLS/LCP).
- **الشبكة:** كاش `fetch` مع tags؛ تجنّب N+1 على الباكند والترقيم على الخادم (mds/07 §2).
- **المراقبة:** `useReportWebVitals` يرسل CWV (LCP/CLS/INP/FCP) لتتبّع الأهداف؛ ميزانية Lighthouse في CI (هدف>90).

---

### 11. MVP مقابل المؤجّل (نطاق mds/08)

| الميزة | MVP | مؤجّل |
|--------|-----|-------|
| الرئيسية، التصنيفات، صفحة المنتج، الشبكة | ✅ | — |
| البحث الفوري + Autocomplete + تصحيح إملائي | ✅ | البحث الدلالي/بالصورة |
| الفلترة (نوع/تصنيف/سعر/لون/مقاس/توفّر) + الفرز + الترقيم | ✅ | فلاتر facet متقدمة جداً |
| السلة (ضيف + مسجّل + مزامنة Redis) + المفضلة | ✅ | حفظ سلال متعددة |
| الدفع متعدد الخطوات (إلكتروني + COD) + Guest Checkout | ✅ | محافظ/تقسيط |
| حساب العميل (ملف/عناوين/طلبات/مراجعات) + تتبّع الطلب | ✅ | — |
| التقييمات والمراجعات بصور | ✅ (أساسي) | إشراف/تحليلات مراجعات |
| الكوبونات/العروض، النشرة البريدية | ✅ (أساسي) | حملات/توصيات مخصّصة (CRM) |
| دخول Google، 360°/فيديو المنتج | اختياري | — |
| RTL عربي | ✅ | تعدد اللغات (segment `[locale]`) |
| SEO (metadata/sitemap/schema/OG)، تحسين الصور | ✅ | — |
| الدعم المباشر | زر واتساب عائم | شات مباشر مدمج |

ملفات/مسارات ذات صلة (كلها تحت `c:/Projects/matjer/frontend/src/`): `app/` (الشجرة أعلاه)، `components/`، `lib/api/`، `store/cart.ts` و`store/wishlist.ts`، `i18n/ar.json`، `app/sitemap.ts`، `app/robots.ts`، و`middleware.ts` في `c:/Projects/matjer/frontend/`. المراجع: mds/03 (الميزات)، mds/02 §2 (الستاك)، mds/07 §2-§3 (الأداء/SEO)، mds/06 §3 (المخزون)، mds/08 (MVP)، mds/05 (الجداول)، mds/11 (النشر/الصور).

---

## 5. لوحة الإدارة / ERP (واجهة)

### قرار المعمارية: مسار `/admin` داخل نفس تطبيق Next.js (مع segment معزول)

اللوحة الإدارية تُبنى كـ **route group معزول داخل نفس تطبيق `frontend/` (Next.js App Router)** وليست تطبيقاً منفصلاً. مع ذلك، تُعزل عزلاً صارماً عن المتجر عبر بنية route groups وبدون مشاركة أي layout أو state.

**التبرير (مقابل تطبيق React منفصل المذكور في mds/02 §2):**

| العامل | الحكم |
|--------|-------|
| النشر (mds/11 §4-§5) | النفق يوجّه `matjer.grade.sbs` بالكامل لـ frontend:3020 ما عدا `/api/*` و`/uploads/*`. تطبيق منفصل يتطلّب منفذاً ثالثاً + قاعدة ingress إضافية في `config.yml` (نقطة فشل مشتركة، mds/11 §4.5). مسار `/admin` يستهلك صفر منافذ إضافية وصفر قواعد توجيه. |
| الستاك المثبّت (سياق المشروع) | الستاك المعتمد Next.js. mds/02 §2 يقترح "React + Refine/Ant Design Pro" كخيار مرجعي فقط؛ التزاماً بقرار الستاك المثبّت نستخدم Next.js لكلا السطحين بدل إدخال toolchain ثانٍ (Vite/CRA) ومدير bناء ثانٍ على سيرفر محمّل (mds/11 §10). |
| RTL/Tailwind/i18n مشترك | إعداد RTL وTailwind وخطوط عربية يُعاد استخدامه مرة واحدة. |
| العزل الأمني | الحماية الفعلية على الخادم (mds/02 §6، mds/10 §6) — لا تعتمد على فصل النشر. مسار `/admin` آمن طالما كل `/api/admin/*` محمي بـ guards. |
| الأداء | اللوحة client-heavy (`'use client'`, AG Grid)؛ لا تحتاج SSR/SSG (mds/07). نعطّل prerender لمسار `/admin` ونفصل bundle عبر route group فلا يتضخّم bundle المتجر. |

> الاستثناء الوحيد المقبول للترقية إلى تطبيق منفصل: إن تجاوز bundle اللوحة حداً يضرّ بـ Lighthouse>90 وFCP<1.5s للمتجر (mds/07) — وهو محجوب أصلاً بفصل route groups وعدم استيراد أي كود admin في مسارات المتجر.

### بنية المجلدات داخل `frontend/`

```
frontend/src/app/
├── (storefront)/                 # route group المتجر (SSR/SSG، mds/03)
│   └── ...
├── (admin)/
│   └── admin/
│       ├── layout.tsx            # AdminShell: Sidebar + Topbar + RBAC gate (client)
│       ├── login/page.tsx        # دخول إداري منفصل + 2FA للمدير (mds/10 §6)
│       ├── page.tsx              # Dashboard (mds/04 §1)
│       ├── products/             # mds/04 §2
│       │   ├── page.tsx          # جدول المنتجات (AG Grid)
│       │   ├── new/page.tsx
│       │   ├── [id]/page.tsx     # تعديل + tab المتغيرات/الصور
│       │   └── import/page.tsx   # رفع Excel/CSV بالجملة
│       ├── inventory/            # mds/04 §3
│       │   ├── page.tsx          # المتاح/المحجوز لكل SKU
│       │   ├── movements/page.tsx
│       │   └── stock-count/page.tsx
│       ├── orders/               # mds/04 §4، mds/06
│       │   ├── page.tsx
│       │   ├── [id]/page.tsx     # تفاصيل + تغيير حالة + طباعة
│       │   └── returns/page.tsx
│       ├── procurement/          # مؤجّل (mds/08) — suppliers + purchase-orders
│       ├── accounting/           # مؤجّل (mds/08) — reports + invoices
│       ├── crm/                  # مؤجّل (mds/08)
│       ├── settings/             # mds/04 §8
│       ├── users/                # mds/10 §2 — users + roles
│       └── audit-log/            # mds/10 §7
├── (admin)/admin/api-client.ts   # fetch wrapper: Bearer + refresh + 401 redirect
└── lib/admin/
    ├── permissions.ts            # خريطة الصلاحيات (mds/10 §3)
    ├── usePermission.ts          # hook can(perm)
    └── nav.ts                    # شجرة القائمة + perm لكل عنصر
```

> ملاحظة نشر: `next.config` يضيف rewrite لـ `/api/*` و`/uploads/*` نحو `BACKEND_URL` (mds/11 §6) ليتطابق مع النمط (أ) للتوجيه (mds/11 §4.3)؛ اللوحة تنادي `/api/admin/*` فقط.

### شجرة الشاشات الكاملة (مع التصنيف MVP/مؤجّل والصلاحية المطلوبة)

| الوحدة | الشاشة | المسار | endpoint رئيسي | الصلاحية (mds/10 §3) | MVP؟ |
|--------|--------|--------|-----------------|----------------------|------|
| Dashboard | لوحة المعلومات | `/admin` | `GET /api/admin/dashboard/summary` | حسب الدور (بطاقات مرشّحة) | ✅ |
| المنتجات | قائمة المنتجات | `/admin/products` | `GET /api/admin/products` | `products.view` | ✅ |
| المنتجات | إضافة/تعديل منتج | `/admin/products/new`,`/[id]` | `POST/PATCH /api/admin/products` | `products.edit` | ✅ |
| المنتجات | المتغيرات (tab) | `/admin/products/[id]#variants` | `…/variants` | `products.edit` | ✅ |
| المنتجات | الصور (رفع متعدد) | `/admin/products/[id]#images` | `POST …/images` (`/uploads/*`) | `products.edit` | ✅ |
| المنتجات | استيراد Excel/CSV | `/admin/products/import` | `POST …/products/import` | `products.edit` | ✅ |
| المنتجات | التصنيفات والوسوم | `/admin/products/categories` | `…/categories` | `products.edit` | ✅ |
| المخزون | المخزون اللحظي | `/admin/inventory` | `GET …/inventory` | `inventory.view` | ✅ |
| المخزون | تعديل كميات/تنبيهات | `/admin/inventory` (inline) | `PATCH …/inventory/:variantId` | `inventory.edit` | ✅ |
| المخزون | حركات المخزون | `/admin/inventory/movements` | `GET …/stock-movements` | `inventory.view` | ✅ |
| المخزون | الجرد والتسوية | `/admin/inventory/stock-count` | `POST …/stock-count` | `inventory.adjust` | جزئي (تنبيهات MVP، جرد كامل مؤجّل) |
| الطلبات | قائمة الطلبات | `/admin/orders` | `GET …/orders` | `orders.view` | ✅ |
| الطلبات | تفاصيل الطلب | `/admin/orders/[id]` | `GET …/orders/:id` | `orders.view` | ✅ |
| الطلبات | تغيير الحالة | `/admin/orders/[id]` | `PATCH …/orders/:id/status` | `orders.confirm` | ✅ |
| الطلبات | طباعة فاتورة/بوليصة | `/admin/orders/[id]/print` | `GET …/orders/:id/invoice` | `orders.view` | ✅ |
| الطلبات | المرتجعات | `/admin/orders/returns` | `…/returns` | `orders.returns` | مؤجّل |
| المشتريات | الموردون | `/admin/procurement/suppliers` | `…/suppliers` | `purchases.view` | مؤجّل |
| المشتريات | أوامر الشراء | `/admin/procurement/purchase-orders` | `…/purchase-orders` | `purchases.create` | مؤجّل |
| المحاسبة | التقارير | `/admin/accounting/reports` | `GET …/reports/:type` | `finance.view` | مؤجّل |
| المحاسبة | تصدير PDF/Excel | (داخل التقارير) | `…/reports/:type/export` | `finance.export` | مؤجّل |
| CRM | العملاء/الشرائح/الحملات | `/admin/crm/*` | `…/customers`,`…/campaigns` | `crm.view`/`crm.campaigns` | مؤجّل |
| الإعدادات | متجر/شحن/دفع/بانرات | `/admin/settings/*` | `…/settings` | `settings.store` | جزئي (إعدادات أساسية فقط في MVP) |
| المستخدمون | المستخدمون والأدوار | `/admin/users` | `…/users`,`…/roles` | `users.manage`/`roles.manage` | ✅ (أدوار أساسية) |
| Audit Log | سجل النشاط | `/admin/audit-log` | `GET …/audit-log` | `audit.view` | جزئي (تسجيل في MVP، عارض كامل لاحقاً) |

### مكتبات الجداول والرسوم والمكوّنات

| الغرض | المكتبة | الاستخدام |
|-------|---------|-----------|
| الجداول الكثيفة | **AG Grid** (Community) (mds/02 §2) | كل القوائم (products, orders, inventory, movements): server-side pagination/sort/filter، column pinning، RTL (`enableRtl: true`)، تصدير CSV مدمج. row model = serverSide لتفادي جلب كل الصفوف. |
| الرسوم البيانية | **Recharts** (mds/02 §2) | Dashboard (mds/04 §1): LineChart للمبيعات/الأرباح، BarChart للأكثر مبيعاً، PieChart للطلبات حسب الحالة. |
| النماذج | **react-hook-form + Zod** | كل نماذج الإدخال + التحقق (schema مشترك مع الباكند). |
| UI primitives | **Tailwind + Radix UI** (headless) | Dialog، DropdownMenu، Tabs، Toast — RTL-safe، خفيف، يطابق قرار Tailwind المثبّت. |
| جلب البيانات | **TanStack Query** | caching، invalidation بعد mutations، optimistic updates لتغيير حالة الطلب. |
| الطباعة | قالب HTML مخصّص + `window.print()` / PDF من الباكند | فاتورة/بوليصة (mds/04 §4، §6). |

> لا نستخدم Refine/Ant Design Pro (مذكورة كمثال في mds/02 §2 فقط)؛ AG Grid + Recharts منصوص عليهما صراحةً ويكفيان مع طبقة مكوّنات Tailwind/Radix خفيفة تحافظ على RTL وحجم bundle.

### إخفاء/تعطيل عناصر الواجهة حسب الصلاحيات (mds/10 §3) — مع تأكيد أن الحماية الفعلية على الخادم

**مبدأ جوهري (mds/10 §6، mds/02 §6):** إخفاء عناصر الواجهة هو **تحسين تجربة فقط، ليس أماناً**. كل `/api/admin/*` محمي بـ `JwtAuthGuard` + `PermissionsGuard` على الخادم؛ نداء مباشر لـ endpoint بلا صلاحية يردّ **403** بغضّ النظر عن الواجهة.

`lib/admin/permissions.ts` يعكس مصفوفة mds/10 §3 حرفياً (مصدرها جدول `role_permissions`، مُحمّلة مرة عند الدخول من `GET /api/admin/me` → `{ roles, permissions[] }`):

```ts
// خريطة الصلاحيات مطابقة لمصفوفة mds/10 §3
export const PERMISSIONS = {
  'products.view':'products.view','products.edit':'products.edit','products.delete':'products.delete',
  'inventory.view':'inventory.view','inventory.edit':'inventory.edit','inventory.adjust':'inventory.adjust',
  'orders.view':'orders.view','orders.confirm':'orders.confirm','orders.edit':'orders.edit','orders.returns':'orders.returns',
  'purchases.view':'purchases.view','purchases.create':'purchases.create',
  'finance.view':'finance.view','finance.export':'finance.export',
  'crm.view':'crm.view','crm.campaigns':'crm.campaigns',
  'settings.store':'settings.store','users.manage':'users.manage','roles.manage':'roles.manage','audit.view':'audit.view',
} as const;
```

ثلاث طبقات في الواجهة:

```tsx
// 1) إخفاء عنصر القائمة (nav.ts: لكل عنصر perm)
{nav.filter(item => can(item.perm)).map(renderNavItem)}

// 2) تعطيل/إخفاء زر إجراء داخل الصفحة
<Can perm="orders.confirm" fallback={null}>
  <Button onClick={confirmOrder}>تأكيد الطلب</Button>
</Can>
// أو تعطيل بدل إخفاء عند الحاجة لإيضاح وجود الإجراء:
<Button disabled={!can('orders.edit')} title={!can('orders.edit') ? 'لا تملك صلاحية' : ''}>تعديل</Button>

// 3) حارس على مستوى الصفحة (route guard في layout/page)
export default function Page() {
  useRequirePermission('inventory.view'); // يعيد التوجيه لـ /admin إن غاب
  ...
}
```

تطبيق المصفوفة على القائمة الجانبية حسب الدور (mds/10 §3):

| عنصر القائمة | admin | sales | inventory | accountant |
|--------------|:-----:|:-----:|:---------:|:----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| المنتجات (تحرير) | ✅ | عرض فقط | ✅ | عرض فقط |
| المخزون (تعديل/جرد) | ✅ | عرض فقط | ✅ | عرض فقط |
| الطلبات (تأكيد/تعديل) | ✅ | ✅ | عرض فقط | عرض فقط |
| المشتريات | ✅ | ❌ | ✅ (إنشاء) | عرض فقط |
| المحاسبة/التقارير | ✅ | ❌ | ❌ | ✅ |
| CRM | ✅ | ✅ | ❌ | عرض فقط |
| الإعدادات/المستخدمون/الأدوار/Audit | ✅ | ❌ | ❌ | ❌ |

> `<Can>` يقرأ من نفس قائمة الصلاحيات المُحمّلة من الخادم؛ لا قيم صلاحية صلبة في الواجهة غير المفاتيح. أي تعديل صلاحيات دور (mds/10 §5) ينعكس فوراً عند إعادة جلب `/api/admin/me`.

### نماذج الإدخال والتحقق (react-hook-form + Zod)

التحقق يُطبَّق على الواجهة (UX) **و** الخادم (DTO/class-validator) — مصدر واحد للقواعد لتجنّب الانحراف. أمثلة مرتبطة بجداول mds/05:

| النموذج | الحقول (→ عمود mds/05) | قواعد Zod الرئيسية |
|---------|------------------------|---------------------|
| منتج (`products`) | `name`, `category_id`, `type`(روسي/صيني)، `price`, `compare_at_price`, `is_featured`, `tags[]` | `price>0`؛ `compare_at_price` (إن وُجد) `> price`؛ `category_id` UUID موجود؛ `name` 3–200 |
| متغير (`product_variants`) | `sku`(فريد)، `size`, `color`, `price`?، `stock_quantity`, `low_stock_threshold` | `sku` فريد (تحقق async مقابل الخادم)؛ `stock_quantity>=0`؛ السعر يرث من المنتج إن فُرّغ |
| صور (`product_images`) | ملفات متعددة + ترتيب + alt | امتداد صورة، حجم ≤ حد، تحويل WebP عند الرفع (mds/07) |
| تعديل مخزون يدوي (`stock_movements`) | `variant_id`, `type`, `quantity`, `reason` | `type ∈ {إدخال,إخراج,مرتجع,تالف,تسوية,تحويل}` (mds/04 §3)؛ `reason` إلزامي لـ تالف/تسوية؛ يُسجَّل في Audit Log (mds/10 §7) |
| تغيير حالة طلب (`orders.status`) | `next_status`, `note?`, `carrier?`, `tracking?` | الانتقال صالح حسب آلة الحالات (mds/06): جديد→مؤكد→قيد التجهيز→مشحون→مُسلّم (+ملغي/مرتجع)؛ منع القفز |
| مستخدم/دور (`users`,`roles`) | `email`, `name`, `role_ids[]`, `is_active` | email صالح؛ دور واحد على الأقل؛ 2FA إلزامي لـ admin (mds/10 §6) |

> منطق المخزون والحالات لا يُنفَّذ في الواجهة — الواجهة تعرض الانتقالات الصالحة فقط؛ القرار النهائي (row-lock، إعادة تحقق التوفّر، الحجز/الخصم/الإعادة) على الخادم (mds/06 §3). تغيير الحالة في الواجهة يستخدم optimistic update مع rollback عند 409/422.

### الرفع المجمّع Excel/CSV (mds/04 §2 — الاستيراد والتصدير)

تدفّق `/admin/products/import` بثلاث خطوات (wizard):

```
1) رفع الملف  → POST /api/admin/products/import/parse  (يعيد headers + معاينة أول 20 صفاً + اكتشاف الأعمدة)
2) ربط الأعمدة (mapping) → المستخدم يربط عمود الملف بحقل (name, sku, price, stock_quantity, category…)
3) تحقق + تنفيذ → POST /api/admin/products/import/commit
        الخادم: تحقق صف-صف، صفوف صالحة تُكتب، الفاشلة تُعاد مع رقم الصف وسبب الخطأ
        الواجهة: تقرير (نجح N، فشل M) + تنزيل ملف الأخطاء لتصحيحه وإعادة رفعه
```

- **القراءة:** `xlsx` (SheetJS) لـ Excel، parser CSV للـ CSV. تحديث الأسعار/الكميات بالجملة (mds/04 §2) = نفس المسار مع وضع `mode=update` (المطابقة عبر `sku`).
- **التصدير:** تصدير قائمة المنتجات والتقارير عبر AG Grid CSV مدمج + تصدير خادمي للملفات الكبيرة (`GET …/products/export?format=xlsx`).
- **حدود:** المعالجة على الخادم ضمن transaction مع batching؛ ملفات كبيرة تُعالَج بشكل غير متزامن (لاحقاً) — في MVP حدّ صفوف معقول متزامن.
- **القالب:** زر "تنزيل قالب فارغ" بالأعمدة المتوقّعة لتقليل أخطاء الربط.

### MVP مقابل المؤجّل (تجميع — mds/08 §2)

**ضمن MVP (المرحلة 6، mds/08 §3):**
- AdminShell + دخول إداري + 2FA للمدير (mds/10 §6).
- Dashboard أساسي (mds/04 §1): بطاقات + رسمان رئيسيان.
- المنتجات والمتغيرات والصور + الاستيراد/التصدير Excel/CSV (mds/04 §2).
- المخزون الأساسي: عرض المتاح/المحجوز، تعديل يدوي، حركات، تنبيهات الحد الأدنى (mds/04 §3).
- الطلبات: قائمة، تفاصيل، تغيير حالة، طباعة فاتورة/بوليصة (mds/04 §4، mds/06).
- المستخدمون والأدوار الأساسية + تطبيق RBAC على الواجهة (mds/10).
- تسجيل Audit Log للعمليات الحساسة (mds/10 §7) — العارض الكامل لاحقاً.

**مؤجّل (التوسّع، mds/08 §4):**
- المشتريات والموردون وأوامر الشراء (التوسّع 1).
- المحاسبة المتقدمة والتقارير المعمّقة وتصدير PDF المجدوَل (التوسّع 2).
- CRM والشرائح والحملات (التوسّع 3).
- المستودعات المتعددة وتحويل المخزون (التوسّع 4) — جدول `warehouses` موجود في mds/05 لكن واجهته مؤجّلة.
- الجرد الدوري الكامل، المرتجعات/الاستبدال الكامل، تعدد اللغات في اللوحة (التوسّع 5).

---

ملفات mds المرجعية المعتمدة: `c:/Projects/matjer/mds/04-erp-system.md` (وحدات اللوحة)، `c:/Projects/matjer/mds/10-roles-permissions.md` (RBAC، Audit، 2FA)، `c:/Projects/matjer/mds/02-technical-architecture.md` (الستاك، AG Grid/Recharts)، `c:/Projects/matjer/mds/08-implementation-plan.md` (MVP/مؤجّل)، `c:/Projects/matjer/mds/11-server-deployment.md` (قرار `/admin` مقابل تطبيق منفصل)، `c:/Projects/matjer/mds/05-database-design.md` و`c:/Projects/matjer/mds/06-order-lifecycle.md` (أسماء الجداول وآلة حالات الطلب والمخزون).

---

## 6. التكاملات الخارجية والخدمات

### قسم التكاملات الخارجية والخدمات (External Integrations & Services)

هذا القسم يصمّم طبقة التكامل بين matjer والخدمات الخارجية. يستند إلى `mds/09` (التكاملات)، `mds/03` (ميزات المتجر)، `mds/02` (البنية التقنية)، مع ربط بـ `mds/06` (دورة حياة الطلب)، `mds/05` (الجداول)، `mds/11` (النشر). كل التكاملات تُبنى كـ NestJS modules تحت `/backend/src/integrations/` خلف **واجهات مجرّدة (provider-agnostic interfaces)** لتحقيق مبدأ المرونة في `mds/09 §6` (تبديل المزوّد دون إعادة بناء). الأسرار في `.env` خارج Git (`mds/11 §9`).

#### بنية مشتركة لكل التكاملات (Cross-cutting foundation)

كل تكامل خارجي يلتزم بثلاثة مكوّنات إلزامية موحّدة حسب `mds/09 §6` (معالجة فشل، webhooks آمنة، سجلات، sandbox، مرونة):

| المكوّن | الوحدة | الوظيفة |
|--------|--------|---------|
| طابور المهام | `QueueModule` (BullMQ على Redis `:6383`، `mds/11 §5`) | كل نداء خارجي صادر (إشعار، فهرسة، استرداد) يُدفع كـ job غير متزامن — لا يحجب طلب HTTP للعميل |
| سجل التكاملات | جدول جديد `integration_logs` | تسجيل كل تعامل (`mds/09 §6` "السجلّات") |
| Webhook موحّد | `WebhooksModule` (`POST /api/webhooks/:provider`) | استقبال + التحقق من التوقيع + idempotency |

**جدول `integration_logs`** (إضافة لمخطّط `mds/05`، snake_case، نمط الجداول نفسه):

| الحقل | النوع | الوصف |
|-------|------|-------|
| id | UUID | معرّف |
| provider | VARCHAR | `payment_tap` / `shipping_aramex` / `notify_email` ... |
| direction | ENUM | `outbound` / `inbound_webhook` |
| reference | VARCHAR | `order_number` أو معرّف خارجي |
| request_payload | JSONB | المرسَل (بعد تنقية بيانات حسّاسة — لا بيانات بطاقة، `mds/09 §1`) |
| response_payload | JSONB | الرد |
| status_code | INT | كود الاستجابة |
| status | ENUM | `success` / `failed` / `retrying` |
| attempts | INT | عدد المحاولات |
| created_at | TIMESTAMP | |

**نمط إعادة المحاولة الموحّد (مبدأ `mds/09 §6` "إعادة المحاولة التلقائية"):** BullMQ مع backoff أسّي.

```
worker.process(job):
  log = integration_logs.insert(provider, outbound, reference, status=retrying)
  try:
    res = providerClient.call(job.data)   # timeout 10s
    log.update(success, res, status_code)
  catch (transientError):                 # 5xx / timeout / network
    if job.attemptsMade < MAX (=5): throw  # BullMQ backoff: 30s,2m,10m,1h,6h
    else: log.update(failed); alert_admin(provider, reference)  # تنبيه إداري mds/09 §3
  catch (permanentError):                  # 4xx غير قابل للإعادة
    log.update(failed); DO NOT retry
```

**جدول مفاتيح إعداد المزوّدين (`.env`، MVP فقط):**

```env
PAYMENT_PROVIDER=tap            # tap | hyperpay | moyasar  (قابل للتبديل)
PAYMENT_API_KEY=...   PAYMENT_WEBHOOK_SECRET=...   PAYMENT_MODE=sandbox
SHIPPING_PROVIDER=manual        # manual (MVP) | aramex | smsa
NOTIFY_EMAIL_PROVIDER=smtp      EMAIL_FROM=...   SMTP_HOST=... SMTP_USER=... SMTP_PASS=...
NOTIFY_SMS_PROVIDER=...         SMS_API_KEY=...   SMS_SENDER_ID=...
WEBPUSH_VAPID_PUBLIC=...  WEBPUSH_VAPID_PRIVATE=...
MEILI_HOST=http://meilisearch:7700   MEILI_MASTER_KEY=...
STORAGE_DRIVER=local            # local (MVP volume mds/11) | minio
GA_MEASUREMENT_ID=...           GA_API_SECRET=...
GOOGLE_OAUTH_CLIENT_ID=...      GOOGLE_OAUTH_CLIENT_SECRET=...
```

> ملاحظة بنية تحتية: BullMQ والـ workers و Meilisearch خدمات جديدة تُضاف لـ `docker-compose.yml` بمنافذ `127.0.0.1` فقط (تماشياً مع `mds/11 §5`). Meilisearch container باسم `meilisearch`، والـ worker إمّا process منفصل في حاوية backend أو خدمة `worker` مستقلة تشارك نفس الصورة.

---

### 1. الدفع (Payment)

**MVP:** COD + بوابة بطاقة محلية واحدة (`mds/09 §1`, `mds/08`). المحافظ الإلكترونية مؤجّلة.

**الوحدة:** `/backend/src/integrations/payment/` — `PaymentModule`, `PaymentService`, واجهة `PaymentProvider` + تطبيقات (`TapProvider`, `HyperPayProvider`...) تُحقن عبر `useFactory` حسب `PAYMENT_PROVIDER` (مرونة `mds/09 §6`).

```typescript
interface PaymentProvider {
  createCharge(input: { orderId, amount, currency, customer, returnUrl }): Promise<{ chargeId, redirectUrl }>;
  verifyWebhook(rawBody: Buffer, signatureHeader: string): boolean;   // mds/09 §6
  parseWebhook(body): { chargeId, orderRef, status, paidAmount };
  refund(input: { chargeId, amount, reason }): Promise<{ refundId, status }>;  // mds/09 §1
}
```

**تدفّق الدفع الإلكتروني (redirect)** — مطابق لمخطّط `mds/09 §1` ومراحل `mds/06`:

```
1. العميل يختار "إلكتروني" في Checkout (mds/03 §6)
   → POST /api/orders          ينشئ order: status=جديد, payment_status=غير مدفوع
                               → حجز المخزون reserved_quantity+ (mds/06 §3) داخل transaction
2. POST /api/payments/checkout {orderId}
   → PaymentService.createCharge() → يرجّع redirectUrl
   → تخزين chargeId في الطلب (حقل payment_reference)
3. الواجهة تُحوّل العميل لـ redirectUrl (صفحة البوابة الآمنة — البطاقة لا تمر بخوادمنا، mds/09 §1)
4. العميل يُتمّ الدفع → البوابة تعيده إلى /checkout/callback?order=... (عرض فقط، لا تأكيد)
5. (مصدر الحقيقة) البوابة ترسل Webhook:
   POST /api/webhooks/payment  → verifyWebhook(signature) → idempotency بـ chargeId
       نجاح:  ConfirmOrder(orderId)  → status=مؤكد, payment_status=مدفوع
              → خصم نهائي stock_quantity- / reserved_quantity- (mds/06 §3, row-lock)
              → stock_movements (إخراج) + إشعار "تم تأكيد طلبك" (mds/06 §5)
       فشل:   payment_status يبقى غير مدفوع → cron timeout يحرّر الحجز ويلغي (mds/06 §2)
```

**نقاط التكامل في الباكند:**
- `POST /api/payments/checkout` — إنشاء charge وإرجاع redirectUrl.
- `POST /api/webhooks/payment` — مصدر الحقيقة للتأكيد (لا نعتمد على عودة العميل وحده).
- `POST /api/orders/:id/refund` (admin/accountant, `mds/10`) — يستدعي `provider.refund()` عند الإلغاء/الإرجاع (`mds/06 §2`) → `payment_status=مسترد`.

**COD:** لا بوابة (`mds/09 §1`). الطلب يُنشأ `payment_method=عند الاستلام`, `payment_status=غير مدفوع`، التأكيد **يدوي** من sales (`mds/06 §3`). التحصيل عند حالة "مُسلّم" → `payment_status=مدفوع` (`mds/06`).

**التحقق من التوقيع (`mds/09 §6`):** قراءة الـ raw body (NestJS `rawBody: true`) وحساب HMAC-SHA256 بـ `PAYMENT_WEBHOOK_SECRET` ومقارنته constant-time مع الترويسة. رفض 401 عند الفشل، تسجيل في `integration_logs`.

**Idempotency:** جدول `payment_events(charge_id UNIQUE, processed_at)` — webhook مكرّر بنفس `chargeId` يُتجاهل (البوابات تعيد الإرسال).

**معالجة الفشل/إعادة المحاولة:** فشل `createCharge` ⇒ خطأ فوري للعميل + إبقاء الطلب "جديد"؛ فشل `refund` ⇒ job مع backoff + تنبيه accountant. **Sandbox:** `PAYMENT_MODE=sandbox` يبدّل base URL ومفاتيح الاختبار (`mds/09 §6`).

> ربط جداول `mds/05`: `payment_status ENUM(مدفوع/غير مدفوع/مسترد)` موجود في `orders`. نضيف حقلين: `payment_reference VARCHAR` و `payment_provider VARCHAR` لجدول `orders`.

---

### 2. الشحن (Shipping)

**MVP:** إدخال يدوي لرقم التتبّع + حساب رسوم بالمناطق محلياً (`mds/09 §2` "إدخال يدوي للبداية"). تكامل API مباشر مؤجّل لكن خلف نفس الواجهة.

**الوحدة:** `/backend/src/integrations/shipping/` — `ShippingModule`, واجهة `ShippingProvider` + `ManualProvider` (MVP), `AramexProvider`/`SmsaProvider` (لاحقاً).

```typescript
interface ShippingProvider {
  quote(input: { city, area, weight, subtotal }): Promise<{ cost, etaDays }>;
  createShipment(order): Promise<{ trackingNumber, labelUrl }>;   // API أو يدوي
  track(trackingNumber): Promise<{ status }>;                     // لاحقاً
}
```

**حساب الرسوم بالمناطق** — يُنفّذ محلياً في DB (لا تكامل خارجي مطلوب لـ MVP). جدول جديد `shipping_zones` (نمط `mds/05`):

| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| name | VARCHAR | اسم المنطقة |
| cities | JSONB | مدن/مناطق مشمولة (يطابق `addresses.city/area` في `mds/05`) |
| cost | DECIMAL | رسوم الشحن |
| free_above | DECIMAL nullable | شحن مجاني فوق مبلغ (`mds/09 §2`) |
| eta_days | INT | مدة التوصيل التقديرية (`mds/09 §2`) |

**نقاط التكامل في الباكند:**
- `GET /api/shipping/quote?city=&area=&subtotal=` — للسلة/Checkout (رسوم تقديرية، `mds/03 §5/§6`) → يكتب `orders.shipping_cost` (`mds/05`).
- `POST /api/orders/:id/ship` (sales/inventory, `mds/10`) — يدوي: إدخال `trackingNumber` + اسم الناقل ⇒ `status=مشحون` + إشعار "تم شحن طلبك — رقم التتبّع" (`mds/06 §5`). API: يستدعي `createShipment()`.
- بوليصة الشحن (`mds/06` مرحلة التجهيز): `GET /api/orders/:id/label` يُولّد PDF (يدوياً قالب داخلي، أو `labelUrl` من المزوّد).

> ربط `mds/05`: إضافة حقول لـ `orders`: `tracking_number VARCHAR`, `shipping_carrier VARCHAR`, `shipping_label_url VARCHAR`. حالة "مشحون" تُسجَّل في `order_status_history`.

**معالجة الفشل/Sandbox:** في الوضع اليدوي لا فشل خارجي. عند تفعيل API: فشل `createShipment` ⇒ يبقى الطلب "قيد التجهيز" + إعادة محاولة + بديل الإدخال اليدوي (مرونة `mds/09 §6`). Sandbox = حسابات اختبار المزوّد.

---

### 3. الإشعارات (Notifications)

**MVP:** البريد + SMS (تأكيد/تتبّع/OTP) + Web Push للمسجّلين. واتساب **اختياري/مؤجّل** (`mds/09 §3`).

**الوحدة:** `/backend/src/integrations/notifications/` — `NotificationModule`, `NotificationService`, قنوات تطبّق `NotificationChannel`: `EmailChannel` (SMTP/Resend), `SmsChannel`, `WebPushChannel`, `WhatsappChannel` (لاحقاً). كل إرسال = BullMQ job (لا يحجب، `mds/09 §6`).

```typescript
NotificationService.send(event: OrderEvent, channels: Channel[]):
  for ch in channels:
    tpl = templates[event][ch][lang='ar']        # قوالب RTL عربية
    queue.add('notify', { channel: ch, to, tpl, data })  # retry موحّد
```

**القوالب لكل حالة طلب — مطابقة حرفياً لنصوص `mds/06 §5`:**

| الحدث/الحالة (`mds/06`) | القناة (`mds/09 §3`) | القالب |
|------|------|--------|
| تأكيد التسجيل + كلمة مرور مؤقتة | بريد | `auth.welcome` |
| OTP (`mds/03 §7`) | SMS/بريد | `auth.otp` |
| مؤكد | بريد + SMS + Push | "تم تأكيد طلبك رقم #..." |
| قيد التجهيز | Push (+بريد) | "جارٍ تجهيز طلبك" |
| مشحون | بريد + SMS + Push | "تم شحن طلبك — رقم التتبّع: ..." |
| مُسلّم | بريد + Push | "تم تسليم طلبك..." + طلب تقييم (`mds/06 §6`) |
| ملغي | بريد + SMS | "تم إلغاء طلبك" |
| مخزون منخفض / طلب جديد | Push/بريد (للموظفين) | تنبيه إداري (`mds/09 §3`) — يربط `min_stock_alert` في `mds/05` |

**نقاط التكامل في الباكند:** `NotificationService.send()` يُستدعى من `OrderStatusService` عند كل انتقال حالة في `order_status_history` (`mds/06`) — مصدر واحد للإشعارات. Web Push يحتاج جدول جديد `push_subscriptions(customer_id FK, endpoint, keys JSONB)` و `POST /api/notifications/subscribe`.

**معالجة الفشل (`mds/09 §6`):** فشل قناة لا يُسقط الباقي (إرسال مستقل لكل قناة)؛ retry موحّد؛ فشل نهائي يُسجَّل في `integration_logs` دون إيقاف تدفّق الطلب. **Sandbox:** SMTP وهمي (Mailpit في dev)، حساب SMS تجريبي، VAPID اختبار.

---

### 4. البحث (Meilisearch)

**MVP:** فهرسة المنتجات + autocomplete + فلترة/ترتيب (`mds/03 §2/§3`, `mds/02 §2`).

**الوحدة:** `/backend/src/integrations/search/` — `SearchModule`, `SearchService` (Meilisearch JS client). فهرس واحد `products`.

**تصميم الفهرس** (مشتق من `products`/`product_variants`/`categories` في `mds/05`):
```
index "products":
  primaryKey: id
  searchableAttributes: [name, description, sku, category_name]   # بحث بالاسم/التصنيف/SKU (mds/03 §3)
  filterableAttributes: [gold_type, category_id, color, size, price, in_stock]  # فلاتر mds/03 §2
  sortableAttributes:   [base_price, created_at, sales_count, rating]  # ترتيب mds/03 §2
  typoTolerance: enabled              # تصحيح إملائي (mds/03 §3)
```

**المزامنة (الفهرسة):** خطّان حسب `mds/09 §6`:
- **حدثي (live):** عند create/update/delete لمنتج أو variant أو تغيّر مخزون ⇒ BullMQ job `search.sync` يحدّث الوثيقة (يحسب `in_stock = stock_quantity - reserved_quantity > 0` من `mds/06 §3`).
- **إعادة فهرسة كاملة:** أمر `npm run search:reindex` (idempotent) للتعافي/التهيئة.

**نقاط التكامل:** خطّافات (hooks) في `ProductsService`/`InventoryService` تدفع jobs المزامنة. `GET /api/search?q=&filters=` للواجهة (autocomplete). البحث الإداري يبقى عبر Postgres مباشرة.

**معالجة الفشل (`mds/09 §6`):** Meilisearch مصدر مشتق وليس مصدر الحقيقة — تعطّله لا يكسر الطلبات. فشل المزامنة ⇒ retry؛ fallback اختياري لبحث Postgres `ILIKE`. **Sandbox:** حاوية Meilisearch منفصلة في `docker-compose.dev.yml`.

---

### 5. تخزين الصور والـ CDN (Storage & CDN)

**MVP:** volume محلي خلف Cloudflare (`mds/11`: مسار `/uploads/*` ⇐ backend `:4002`؛ CDN = Cloudflare edge، `mds/02 §4`). MinIO خلف نفس الواجهة لاحقاً (`mds/09`/`mds/02 §2`).

**الوحدة:** `/backend/src/integrations/storage/` — `StorageModule`, واجهة `StorageDriver` + `LocalDriver` (MVP, يكتب إلى volume `uploads_data` من `mds/11 §6`) و `MinioDriver`.

```typescript
interface StorageDriver {
  put(file, key): Promise<{ url }>;   // url عام عبر /uploads/...
  delete(key): Promise<void>;
}
```

**نقاط التكامل:** `POST /api/products/:id/images` (admin/inventory, `mds/10`) — يستقبل الرفع، يولّد مشتقّات **WebP** بأحجام متعددة (`mds/07`: تحسين صور/lazy)، يكتب `product_images.image_url` و `sort_order` (`mds/05`). الواجهة تخدمها عبر Cloudflare CDN مع `Cache-Control` طويل + `next/image`.

**معالجة الفشل:** فشل الكتابة ⇒ خطأ 500 فوري (عملية إدارية متزامنة). فشل معالجة WebP ⇒ تخزين الأصل + job لإعادة المعالجة. **Sandbox:** نفس الـ local driver في dev (لا حاجة لخدمة خارجية).

---

### 6. التحليلات والسلات المتروكة (Analytics)

**MVP:** Google Analytics (GA4) عبر الواجهة + تتبّع السلات المتروكة عبر الباكند (`mds/09 §4`).

- **GA4:** يُضاف في الواجهة (`/frontend`) عبر `@next/third-parties` ومتغيّر `GA_MEASUREMENT_ID`. أحداث e-commerce: `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (لقياس Conversion Rate، `mds/09 §4`).
- **السلات المتروكة (`mds/09 §4`):** cron job يفحص `carts`/`cart_items` (`mds/05`) لعميل مسجّل دون طلب خلال N ساعة ⇒ إشعار تذكير عبر `NotificationService` (بريد). يستفيد من Persistent Cart (`mds/03 §5`).

**الوحدة:** `AnalyticsModule` خفيف + cron `abandoned-cart.cron.ts`. **معالجة الفشل:** GA من جانب العميل (لا يؤثّر على الباكند)؛ فشل GA4 Measurement Protocol (server-side `purchase`) ⇒ retry job. Conversion Rate يُحسب أيضاً داخلياً من `orders` كاحتياطي.

---

### 7. تسجيل الدخول الاجتماعي — Google (Social Login)

**MVP:** Google فقط (اختياري في `mds/03 §7` و `mds/09 §4`). Facebook مؤجّل.

**الوحدة:** ضمن `AuthModule` — `GoogleStrategy` (passport-google-oauth20).

**التدفّق:** `GET /api/auth/google` → موافقة Google → `GET /api/auth/google/callback` → التحقق من الـ profile → upsert في `users` (`mds/05`: `email`, `name`, `role_id=customer`) → إصدار JWT + Refresh Token (`mds/02 §2`, `mds/07`). ربط الحساب إن وُجد `email` مسبقاً.

> ربط `mds/05`: إضافة حقول لـ `users`: `provider VARCHAR nullable` (`google`/`local`) و `provider_id VARCHAR nullable`. `password_hash` يصبح nullable لحسابات Google.

**معالجة الفشل/Sandbox:** فشل callback ⇒ redirect لصفحة الدخول برسالة خطأ. Sandbox = OAuth credentials اختبار + `redirect_uri` محلي (`http://localhost:3020`).

---

### 8. ملخّص نطاق MVP (Integration Scope)

| التكامل | MVP | مؤجّل (Post-MVP) |
|---------|-----|------------------|
| الدفع | COD + بوابة بطاقة واحدة (redirect + webhook + توقيع + refund) | محافظ إلكترونية، مزوّد ثانٍ |
| الشحن | إدخال يدوي + رسوم بالمناطق (`shipping_zones`) + بوليصة داخلية | تكامل API مباشر، تتبّع تلقائي، مستودعات متعددة (`mds/08`) |
| الإشعارات | بريد + SMS + Web Push + قوالب `mds/06 §5` | واتساب، بريد تسويقي/حملات (`mds/08`) |
| البحث | Meilisearch (فهرس + autocomplete + مزامنة حدثية) | اقتراحات شخصية |
| التخزين/CDN | volume محلي + WebP خلف Cloudflare | MinIO، 360°/فيديو (`mds/03 §4`) |
| التحليلات | GA4 + السلات المتروكة | تحليلات متقدمة، CRM/حملات (`mds/08`) |
| الدخول الاجتماعي | Google | Facebook |
| Live Chat/واتساب عائم | — | كامل (`mds/09 §4`) |

**التزامات شاملة لكل التكاملات (`mds/09 §6`):** واجهات مجرّدة للتبديل · BullMQ + backoff لإعادة المحاولة · `integration_logs` لكل تعامل · توقيع webhooks + idempotency · أعلام `*_MODE=sandbox` لكل مزوّد · تنبيه إداري عند الفشل النهائي. كل الأسرار في `.env` خارج Git، والخدمات الجديدة (Meilisearch/worker) بمنافذ `127.0.0.1` فقط حسب `mds/11`.

**ملفات مرجعية ذات صلة (مسارات كاملة):** `c:/Projects/matjer/mds/09-integrations.md`، `c:/Projects/matjer/mds/03-storefront-features.md`، `c:/Projects/matjer/mds/02-technical-architecture.md`، `c:/Projects/matjer/mds/06-order-lifecycle.md`، `c:/Projects/matjer/mds/05-database-design.md`، `c:/Projects/matjer/mds/11-server-deployment.md`، `c:/Projects/matjer/mds/10-roles-permissions.md`، `c:/Projects/matjer/mds/08-implementation-plan.md`، `c:/Projects/matjer/mds/07-security-performance.md`.

---

## 7. البنية التحتية والنشر (DevOps)

### البنية التحتية والنشر (DevOps)

> هذا القسم يحوّل قرارات `mds/11` (السيرفر، النفق، المنافذ) و`mds/02 §4` (Docker، النسخ، المراقبة) و`mds/07 §1,§5` (الأمان، النسخ، المراقبة) إلى blueprint تنفيذي ملموس. كل المنافذ والأسماء مثبّتة كما في `mds/11 §5,§6`. السيرفر هو `mafia-prod` (Ubuntu 24.04، Docker 29.4، Node 20.20، **npm فقط**) خلف Cloudflare Tunnel واحد مشترك (`cloudpanel-tunnel`)، بلا IP عام.

---

### 1. تهيئة المستودع (Repository Setup)

الهيكل النهائي مطابق لـ `mds/11 §6`، مع إضافة ملفات DevOps الناقصة (CI، النسخ، healthchecks):

```
matjer/                                  # github.com/abd0175149-droid/matjer (فرع main)
├── backend/                             # NestJS API (mds/02 §2)
│   ├── Dockerfile                       # multi-stage (§4 أدناه)
│   ├── .dockerignore
│   ├── prisma/                          # schema + migrations (ORM: Prisma — mds سياق)
│   │   ├── schema.prisma                # الجداول snake_case حسب mds/05
│   │   └── migrations/
│   ├── src/
│   ├── package.json                     # scripts: build, start:prod, migration:run, lint, test
│   └── tsconfig.json
├── frontend/                            # Next.js App Router + RTL (mds/02 §2)
│   ├── Dockerfile                       # multi-stage standalone (§4 أدناه)
│   ├── .dockerignore
│   ├── next.config.mjs                  # output: 'standalone'
│   ├── src/
│   └── package.json
├── docker-compose.yml                   # الإنتاج (mds/11 §6)
├── docker-compose.dev.yml               # التطوير (override)
├── deploy.sh                            # سكربت النشر (mds/11 §7.ج)
├── scripts/
│   ├── backup.sh                        # pg_dump يومي (mds/11 §9)
│   └── healthcheck.sh                   # فحص خارجي (mds/07 §5)
├── .github/workflows/ci.yml             # GitHub Actions (mds/08)
├── .env                                 # القيم الفعلية 🔒 (خارج Git)
├── .env.example                         # القالب (داخل Git — mds/11 §6)
├── .gitignore
├── .editorconfig
└── mds/                                 # التوثيق المرجعي
```

أوامر التهيئة (مرة واحدة على جهاز التطوير):

```bash
git init -b main
git remote add origin https://github.com/abd0175149-droid/matjer.git
# .gitignore — يجب أن يستثني الأسرار قبل أي commit
```

محتوى `.gitignore` (يطبّق مبدأ "الأسرار خارج Git" — `mds/11 §4.5, §9`):

```gitignore
# secrets
.env
.env.*.local
*.pem
*.key
# deps & build
node_modules/
backend/dist/
frontend/.next/
frontend/out/
# prisma local
backend/prisma/*.db
# os & logs
.DS_Store
*.log
npm-debug.log*
# backups (لا تُرفع نسخ القاعدة)
*.sql
*.sql.gz
```

> ملاحظة على `*.sql.gz` في `.gitignore`: ملفات migration الخاصة بـ Prisma هي `.sql` داخل `prisma/migrations/` ويجب **عدم** تجاهلها — لذلك القاعدة أعلاه نخصّصها: نضع `*.sql.gz` فقط (نسخ pg_dump) ونستثني ملفات الترحيل صراحةً بـ `!backend/prisma/migrations/**/*.sql`.

---

### 2. بنية `.env` و `.env.example` (المنافذ المثبّتة)

المنافذ مثبّتة من `mds/11 §5`: frontend 3020، backend 4002، postgres 5436، redis 6383 — كلها `127.0.0.1`. أوسّع القالب الأساسي (`mds/11 §6`) بالمتغيّرات التي يفرضها الستاك (`mds/02`) والأمان (`mds/07`):

`.env.example` (داخل Git — قيم وهمية):

```env
# ── Compose / Ports (مثبّت — mds/11 §5) ─────────────
COMPOSE_PROJECT_NAME=matjer
FRONTEND_PORT=3020
BACKEND_PORT=4002
DB_PORT=5436
REDIS_PORT=6383

# ── Database (Postgres 16 — mds/05) ─────────────────
DB_NAME=matjer_db
DB_USER=matjer_user
DB_PASSWORD=change_me_strong_password
# يُستهلك من الباكند مباشرة (Prisma):
DATABASE_URL=postgresql://matjer_user:change_me_strong_password@database:5432/matjer_db

# ── Redis (cache/session/cart — mds/02, mds/07 §2) ──
REDIS_URL=redis://redis:6379

# ── Auth (JWT + Refresh — mds/07 §1) ────────────────
JWT_SECRET=change_me_long_random_secret
JWT_REFRESH_SECRET=change_me_another_long_random_secret
JWT_ACCESS_TTL=900            # 15 دقيقة (access)
JWT_REFRESH_TTL=2592000       # 30 يوم (refresh)
BCRYPT_ROUNDS=12              # bcrypt/argon2 — mds/07 §1

# ── Public URLs (Cloudflare edge — mds/11 §4) ───────
PUBLIC_DOMAIN=matjer.grade.sbs
FRONTEND_URL=https://matjer.grade.sbs
# الواجهة تنادي الباكند داخل شبكة Docker (لا عبر النفق):
BACKEND_INTERNAL_URL=http://backend:4002
# المسار العام الذي يراه المتصفح (path-split — mds/11 §4.3 النمط أ):
NEXT_PUBLIC_API_URL=https://matjer.grade.sbs/api

# ── Search (Meilisearch — mds/02) ───────────────────
MEILI_URL=http://meilisearch:7700
MEILI_MASTER_KEY=change_me_meili_key

# ── Uploads (volume محلي خلف Cloudflare — mds/02) ───
UPLOADS_DIR=/app/uploads
MAX_UPLOAD_MB=8               # تحقّق حجم الملفات — mds/07 §1

# ── Observability (Sentry — mds/07 §5, mds/02 §4) ───
SENTRY_DSN=
HEALTHCHECK_PING_URL=         # healthchecks.io ping (cron النسخ)

# ── Backups (mds/11 §9) ─────────────────────────────
BACKUP_DIR=/home/sysadmin/backups/matjer
BACKUP_RETENTION_DAYS=7
BACKUP_REMOTE=                # مثال: r2:matjer-backups (rclone) — نقل خارجي
```

`.env` الفعلي يُنشأ على السيرفر بـ `cp .env.example .env` ثم تُولَّد الأسرار:

```bash
# توليد أسرار قوية على السيرفر
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|"          .env
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 48)|" .env
DB_PW=$(openssl rand -base64 24 | tr -d '/+=')
sed -i "s|change_me_strong_password|$DB_PW|g"                          .env  # يحدّث DB_PASSWORD وDATABASE_URL معاً
```

---

### 3. `docker-compose.yml` (الإنتاج)

مبني على قالب `mds/11 §6` مع إضافات إلزامية يفرضها الستاك (`mds/02`): خدمة **Meilisearch**، **healthchecks** لكل خدمة (شرط `depends_on: condition: service_healthy` لمنع سباق الإقلاع)، **حدود موارد** (السيرفر محمّل — `mds/11 §10`)، وربط كل المنافذ بـ `127.0.0.1` (`mds/11 §4.5, §9`).

```yaml
name: matjer                              # = COMPOSE_PROJECT_NAME

services:
  database:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
      TZ: Asia/Amman                       # mds/11 §1
    ports:
      - "127.0.0.1:${DB_PORT}:5432"        # 🔒 محلي فقط
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits: { memory: 1g }             # حد ذاكرة — mds/11 §10
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }   # حد حجم السجلات (القرص 84% — mds/11 §10)

  redis:
    image: redis:7-alpine
    restart: always
    command: ["redis-server", "--save", "60", "1", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
    ports:
      - "127.0.0.1:${REDIS_PORT}:6379"     # 🔒 محلي فقط
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

  meilisearch:
    image: getmeili/meilisearch:v1.10
    restart: always
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
      MEILI_NO_ANALYTICS: "true"
    volumes:
      - meili_data:/meili_data
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:7700/health"]
      interval: 15s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits: { memory: 512m }
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

  backend:
    build: { context: ./backend, dockerfile: Dockerfile }
    restart: always
    env_file: .env
    environment:
      - NODE_ENV=production
      - PORT=${BACKEND_PORT}
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@database:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
      - MEILI_URL=http://meilisearch:7700
    ports:
      - "127.0.0.1:${BACKEND_PORT}:${BACKEND_PORT}"   # 🔒 يصله cloudflared لمسار /api و/uploads
    depends_on:
      database:     { condition: service_healthy }
      redis:        { condition: service_healthy }
      meilisearch:  { condition: service_healthy }
    volumes:
      - uploads_data:/app/uploads          # الصور المرفوعة (mds/02، تُخدَم على /uploads)
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits: { memory: 1g }
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}   # يُحقن وقت البناء (Next public env)
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=${FRONTEND_PORT}
      - HOSTNAME=0.0.0.0                   # ضروري لـ Next standalone داخل الحاوية
      - BACKEND_INTERNAL_URL=http://backend:${BACKEND_PORT}   # لطلبات SSR/server actions
    ports:
      - "127.0.0.1:${FRONTEND_PORT}:${FRONTEND_PORT}"  # 🔒 يصله cloudflared (كل ما عدا /api,/uploads)
    depends_on:
      backend: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    deploy:
      resources:
        limits: { memory: 768m }
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }

volumes:
  db_data:
  redis_data:
  meili_data:
  uploads_data:
```

> ملاحظات دقيقة:
> - `frontend` healthcheck يستهدف `/api/healthz` (Next route handler خفيف داخل تطبيق Next نفسه)، بينما `backend` يستهدف `/api/health` (NestJS). المساران مختلفان لتجنّب التضارب مع path-split عند النفق.
> - لا توجد خدمة nginx في compose — التوجيه يتم بالكامل عند Cloudflare/النفق (path-split، `mds/11 §4`).
> - `command` لـ Redis يضيف persistence (`save`) وLRU eviction ضمن سقف 256MB لاحترام ضغط الذاكرة (`mds/11 §10`).

---

### 4. ملفات Dockerfile (multi-stage)

#### 4.1 `backend/Dockerfile` (NestJS + Prisma)

```dockerfile
# ===== Stage 1: build =====
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci                                   # npm فقط (mds/11 §2)
RUN npx prisma generate                      # توليد Prisma Client قبل البناء
COPY . .
RUN npm run build                            # ينتج dist/

# ===== Stage 2: prod deps فقط =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl tini \
 && addgroup -S app && adduser -S app -G app
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist          ./dist
COPY --from=build /app/prisma        ./prisma
COPY package*.json ./
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app
EXPOSE 4002
ENTRYPOINT ["/sbin/tini","--"]
# الترحيلات تُشغَّل من deploy.sh (migrate deploy)، لا من ENTRYPOINT لتفادي السباق
CMD ["node","dist/main.js"]
```

> `package.json` (backend) السكربتات المطلوبة:
> ```json
> "scripts": {
>   "build": "nest build",
>   "start:prod": "node dist/main.js",
>   "migration:run": "prisma migrate deploy",     // يُستدعى من deploy.sh — mds/11 §7.ج
>   "migration:dev": "prisma migrate dev",
>   "lint": "eslint \"src/**/*.ts\"",
>   "test": "jest"
> }
> ```

#### 4.2 `frontend/Dockerfile` (Next.js standalone)

يتطلّب `output: 'standalone'` في `next.config.mjs` لتقليل حجم الصورة (مهم للقرص 84% — `mds/11 §10`):

```dockerfile
# ===== Stage 1: deps =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ===== Stage 2: build =====
FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL                       # public env يُخبز وقت البناء
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build                              # ينتج .next/standalone

# ===== Stage 3: runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
# standalone يجمع node_modules الضرورية + server.js
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static     ./.next/static
COPY --from=build /app/public           ./public
USER app
EXPOSE 3020
# server.js يحترم PORT و HOSTNAME من البيئة
CMD ["node","server.js"]
```

`.dockerignore` (لكلا المشروعين — يقلّص سياق البناء ويسرّع `--no-cache` على سيرفر محمّل):

```
node_modules
.next
dist
.git
.env
.env.*
*.log
mds
```

---

### 5. `docker-compose.dev.yml` (التطوير)

ملف override يُشغَّل بـ `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`. يكشف المنافذ للمضيف، يُفعّل hot-reload عبر bind mounts، ويستبدل أمر التشغيل:

```yaml
name: matjer

services:
  database:
    ports: ["127.0.0.1:5436:5432"]

  redis:
    ports: ["127.0.0.1:6383:6379"]

  backend:
    build:
      context: ./backend
      target: build                          # نتوقّف عند مرحلة build (فيها devDeps)
    command: npm run start:dev               # nest watch
    environment:
      - NODE_ENV=development
    volumes:
      - ./backend/src:/app/src               # hot reload
      - ./backend/prisma:/app/prisma
      - /app/node_modules                    # حماية node_modules الحاوية
    healthcheck: { disable: true }

  frontend:
    build:
      context: ./frontend
      target: deps                           # نشغّل next dev من مرحلة deps
    command: npm run dev
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:4002/api
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - /app/node_modules
      - /app/.next
    healthcheck: { disable: true }
```

---

### 6. سكربت `deploy.sh`

توسيع نمط `mds/11 §7.ج` ليكون idempotent وآمناً: نسخة قاعدة احتياطية قبل الترحيل، `migrate deploy` (لا `dev`)، فحص صحة بعد الإقلاع، تنظيف موارد (القرص 84% — `mds/11 §10`)، وping للمراقبة.

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ matjer deploy — $(date '+%F %T')"

# 0) تحقق من .env (mds/11 §7.ج)
if [ ! -f .env ]; then
  echo "⚠️  لا يوجد .env — انسخ من .env.example واضبط القيم."
  cp .env.example .env
  exit 1
fi
set -a; source .env; set +a

# 1) سحب آخر main (mds/11 §8)
echo "1️⃣  git pull origin main"
git fetch --prune origin
git reset --hard origin/main          # ضمان مطابقة الإنتاج للمستودع (لا تعديلات يدوية)

# 2) نسخة احتياطية قبل أي ترحيل (mds/11 §9) — أمان قبل البناء
if docker compose ps database --status running | grep -q database; then
  echo "🛟 backup قبل الترحيل"
  bash scripts/backup.sh || echo "⚠️ فشل النسخ — متابعة بحذر"
fi

# 3) بناء الصور (mds/11 §7.ج) — بدون cache لاحترام ضغط الذاكرة/تفادي حالات قديمة
echo "2️⃣  docker compose build"
docker compose build --pull

# 4) إقلاع (توقف أدنى)
echo "3️⃣  docker compose up -d"
docker compose up -d --remove-orphans

# 5) ترحيلات Prisma (mds/05) — بعد جاهزية القاعدة
echo "4️⃣  prisma migrate deploy"
docker compose exec -T backend npm run migration:run

# 6) تنظيف (القرص 84% — mds/11 §10)
echo "5️⃣  prune"
docker image prune -f
docker builder prune -f --filter "until=168h"

# 7) تحقق صحة + ps (mds/11 §7.ج)
echo "6️⃣  health + ps"
docker compose ps
for svc in backend frontend; do
  state=$(docker compose ps "$svc" --format '{{.Health}}' 2>/dev/null || echo "n/a")
  echo "   $svc → $state"
done

# 8) ping للمراقبة (mds/07 §5) — يخبر healthchecks.io أن النشر تمّ
[ -n "${HEALTHCHECK_PING_URL:-}" ] && curl -fsS "${HEALTHCHECK_PING_URL}/deploy" || true

echo "✅ تم النشر — ${FRONTEND_URL}"
```

> الفرق الجوهري عن نمط `mds/11`: استبدلنا `migration:run || true` (الذي يبتلع الأخطاء) بـ `migrate deploy` صارم بعد أخذ نسخة احتياطية — لأن فشل الترحيل الصامت يفسد سلامة البيانات (يتعارض مع منطق المخزون الحرج في `mds/06`). الاستخدام: `cd /home/sysadmin/matjer && ./deploy.sh`، أو عن بُعد `ssh mafia-prod 'cd /home/sysadmin/matjer && ./deploy.sh'` (`mds/11 §8`).

---

### 7. ربط Cloudflare Tunnel (path-split)

يتبع `mds/11 §4.3 النمط (أ)` و`§4.4` حرفياً — نفق مشترك `cloudpanel-tunnel`، تعديل ingress قبل قاعدة 404، نسخة احتياطية قبل التعديل (نقطة فشل مشتركة — `mds/11 §4.5, §10`).

**خطوة 1 — DNS route (مرة واحدة):**
```bash
cloudflared tunnel route dns cloudpanel-tunnel matjer.grade.sbs
# ينشئ CNAME مُوكّل: matjer.grade.sbs → b8f315ec-...cfargotunnel.com
```

**خطوة 2 — قواعد ingress** (تُضاف في `/etc/cloudflared/config.yml` **قبل** `- service: http_status:404`، تحتاج sudo):
```bash
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.$(date +%F)
sudo nano /etc/cloudflared/config.yml
```
الكتلة المضافة (الترتيب حرج — الأخصّ أولاً):
```yaml
  - hostname: matjer.grade.sbs
    path: /api/.*
    service: http://127.0.0.1:4002        # backend (NestJS)
  - hostname: matjer.grade.sbs
    path: /uploads/.*
    service: http://127.0.0.1:4002        # backend — الملفات المرفوعة
  - hostname: matjer.grade.sbs
    service: http://127.0.0.1:3020        # frontend — كل ما عدا ذلك
```

**خطوة 3 — إعادة التشغيل والتحقق:**
```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager      # تأكد active
journalctl -u cloudflared -f                       # متابعة التوجيه
curl -I https://matjer.grade.sbs/api/health        # 200 من الباكند
curl -I https://matjer.grade.sbs/                  # 200 من الواجهة
```

> SSL يُنهى عند حافة Cloudflare — لا شهادات على السيرفر (`mds/11 §4.5.1, §9`). WebSocket مدعوم عبر النفق إن لزم لاحقاً (`mds/11 §4.5.3`). أي خطأ في `config.yml` يعطّل كل المشاريع — لذا النسخة الاحتياطية والتحقق بـ `journalctl` إلزاميان (`mds/11 §10`).

---

### 8. CI عبر GitHub Actions

`.github/workflows/ci.yml` — يحقّق lint/test/build للمشروعين على كل push/PR إلى `main` (يطبّق "العمل محلياً ثم يُرفع" — `mds/11 §7.أ`). بناء الصورة اختياري (job منفصل، مشروط) لتجنّب رفع صور ثقيلة بلا داعٍ على مستودع greenfield. **النشر يدوي عبر `deploy.sh`** (السيرفر بلا IP عام، لا runner عليه) — CI للجودة فقط.

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: ci_test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U ci" --health-interval 10s
          --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: backend/package-lock.json }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy        # يتحقّق أن الترحيلات سليمة مقابل Postgres حقيقي
      - run: npm run lint
      - run: npm test
      - run: npm run build

  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm test --if-present
      - run: npm run build
        env: { NEXT_PUBLIC_API_URL: https://matjer.grade.sbs/api }

  # اختياري: التحقق أن الصور تُبنى (لا push) — يُشغّل فقط على main
  docker-build:
    if: github.ref == 'refs/heads/main'
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with: { context: ./backend, push: false, tags: matjer-backend:ci, build-args: "" }
      - uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: false
          tags: matjer-frontend:ci
          build-args: NEXT_PUBLIC_API_URL=https://matjer.grade.sbs/api
```

> npm حصراً (`cache: 'npm'`, `npm ci`) — مطابقة `mds/11 §2`. Node 20 = إصدار السيرفر. خدمة Postgres في CI تضمن أن ترحيلات Prisma (الجداول snake_case في `mds/05`) تُطبَّق فعلاً قبل الدمج.

---

### 9. النسخ الاحتياطي اليومي + النقل الخارجي

يطبّق `mds/11 §9` و`mds/07 §1.النسخ الاحتياطي` (نسخ يومي تلقائي + نقل خارجي لأن السيرفر منزلي والقرص 84%).

`scripts/backup.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

TS=$(date +%Y%m%d_%H%M%S)
DEST="${BACKUP_DIR:-/home/sysadmin/backups/matjer}"
mkdir -p "$DEST"
FILE="$DEST/matjer_${TS}.sql.gz"

# 1) dump مضغوط (نمط mds/11 §9)
docker compose exec -T database pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "$FILE"
echo "✅ backup: $FILE ($(du -h "$FILE" | cut -f1))"

# 2) نسخ الصور المرفوعة (mds/07 §1 — نسخ الملفات)
docker run --rm -v matjer_uploads_data:/data -v "$DEST":/out alpine \
  tar czf "/out/uploads_${TS}.tar.gz" -C /data .

# 3) نقل خارجي (السيرفر ليس سحابياً — mds/11 §10) عبر rclone إن مُعرّف
if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$FILE"                         "${BACKUP_REMOTE}/db/"      --quiet
  rclone copy "$DEST/uploads_${TS}.tar.gz"    "${BACKUP_REMOTE}/uploads/" --quiet
fi

# 4) تنظيف المحلي بعد الاحتفاظ N يوم (القرص 84%)
find "$DEST" -name 'matjer_*.sql.gz'  -mtime +"${BACKUP_RETENTION_DAYS:-7}" -delete
find "$DEST" -name 'uploads_*.tar.gz' -mtime +"${BACKUP_RETENTION_DAYS:-7}" -delete

# 5) ping للمراقبة (mds/07 §5) — فشل الـ cron يُكتشف بغياب الـ ping
[ -n "${HEALTHCHECK_PING_URL:-}" ] && curl -fsS "${HEALTHCHECK_PING_URL}/backup" || true
```

جدولة cron (يومياً 03:00 بتوقيت Asia/Amman — `mds/11 §1`):
```bash
crontab -e
# m h dom mon dow  command
0 3 * * *  /home/sysadmin/matjer/scripts/backup.sh >> /home/sysadmin/backups/matjer/backup.log 2>&1
```

| البند | القيمة | المرجع |
|------|--------|--------|
| التكرار | يومي 03:00 (cron) | mds/07 §1، mds/11 §9 |
| المحتوى | `pg_dump` مضغوط + tar للـ uploads volume | mds/11 §9 |
| الاحتفاظ المحلي | 7 أيام (`BACKUP_RETENTION_DAYS`) ثم حذف | mds/11 §10 (قرص) |
| النقل الخارجي | rclone → R2/سحابة (السيرفر منزلي) | mds/11 §10 |
| المراقبة | ping بعد النجاح → تنبيه عند الغياب | mds/07 §5 |

---

### 10. المراقبة (Sentry + Healthchecks)

يطبّق `mds/07 §5` و`mds/02 §4` (Sentry للأخطاء، تنبيهات downtime، سجلات مركزية).

| الطبقة | الأداة | التنفيذ |
|--------|--------|---------|
| أخطاء التطبيق | **Sentry** | `@sentry/nestjs` في `main.ts` (backend) + `@sentry/nextjs` (frontend)؛ يُفعّل فقط إن `SENTRY_DSN` مضبوط — `mds/07 §5` |
| Health endpoints | `@nestjs/terminus` | `GET /api/health` (backend) يفحص Postgres+Redis+Meili؛ `GET /api/healthz` (Next route handler) للواجهة — يستهلكهما compose healthcheck |
| توفّر خارجي | **healthchecks.io** | جدول cron يـ-ping خدمة خارجية كل 5 دقائق؛ غياب الـ ping → تنبيه downtime (`mds/07 §5`) |
| سلامة النسخ والنشر | healthchecks.io | ping من `backup.sh` و`deploy.sh` (أعلاه) |
| السجلات المركزية | json-file driver محدود | `max-size: 10m, max-file: 3` لكل خدمة (يمنع امتلاء القرص — `mds/11 §10`)؛ تُقرأ بـ `docker compose logs -f` (`mds/11 §7.د`) |
| الموارد | `docker stats` / تنبيه قرص | سكربت cron يراقب `df` ويـ-ping عند تجاوز 90% |

فحص خارجي دوري (`scripts/healthcheck.sh`، cron كل 5 دقائق):
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."; set -a; source .env; set +a

# 1) فحص الواجهة عبر النفق (end-to-end عبر Cloudflare)
code=$(curl -s -o /dev/null -w '%{http_code}' "https://${PUBLIC_DOMAIN}/api/health")
[ "$code" = "200" ] || { echo "❌ health=$code"; exit 1; }

# 2) فحص امتلاء القرص (القيد الحرج — mds/11 §10)
use=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "$use" -lt 90 ] || echo "⚠️ disk ${use}% — شغّل: docker system prune -af"

# 3) ping نجاح
[ -n "${HEALTHCHECK_PING_URL:-}" ] && curl -fsS "$HEALTHCHECK_PING_URL" || true
```

---

### 11. قيود السيرفر (مصفوفة التخفيف)

تلخيص تنفيذي لـ `mds/11 §10` بربطها بقرارات DevOps أعلاه:

| القيد (mds/11 §10) | التخفيف المطبَّق في هذا البلوبرنت |
|---------------------|----------------------------------|
| القرص 84% (~74GB) | صور alpine multi-stage + Next `standalone`؛ `docker image/builder prune` في deploy.sh؛ `logging max-size`؛ احتفاظ نسخ 7 أيام + نقل خارجي؛ تنبيه df>90% |
| الذاكرة محمّلة (8.3/15GB) | `deploy.resources.limits.memory` لكل خدمة؛ Redis `maxmemory 256mb + LRU`؛ بناء `--pull` (لا `--no-cache` افتراضياً لتقليل ضغط الذاكرة، إلا عند الحاجة) |
| سيرفر منزلي LAN (لا توفّر سحابي) | نسخ خارجي يومي (rclone)؛ كل المنافذ `127.0.0.1`؛ `restart: always` |
| النفق مشترك (نقطة فشل) | نسخة `config.yml.bak.$(date)` قبل كل تعديل؛ تحقّق `journalctl`؛ path-split معزول بـ hostname |
| sudo بكلمة مرور | النشر (`deploy.sh`) وDocker بلا sudo؛ تعديل النفق فقط يحتاج تدخّل يدوي |
| تعارض منافذ | التزام 3020/4002/5436/6383 (`mds/11 §5`)؛ تحقّق `ss -tlnH` و`docker ps` قبل أول نشر |

---

ملخّص المخرجات (مسارات مطلقة على جهاز التطوير ضمن `c:/Projects/matjer/`): الملفات المُصمَّمة للإنشاء هي `backend/Dockerfile`، `frontend/Dockerfile`، `docker-compose.yml`، `docker-compose.dev.yml`، `deploy.sh`، `scripts/backup.sh`، `scripts/healthcheck.sh`، `.github/workflows/ci.yml`، `.env.example`، `.gitignore`. كل القيم (المنافذ 3020/4002/5436/6383، الدومين `matjer.grade.sbs`، النفق `cloudpanel-tunnel`، المسار `/home/sysadmin/matjer`) مثبّتة حرفياً من `mds/11`؛ خدمة Meilisearch ومتغيّرات JWT/Redis/Uploads مشتقّة من `mds/02` و`mds/07`؛ Prisma migrations تُطابق أسماء الجداول snake_case في `mds/05`. هذا blueprint توثيقي فقط (greenfield) — لم يُكتب أي كود فعلي على القرص.

---

## 8. الاختبار والأمان والجودة

### القسم: الاختبار والأمان والجودة (Testing, Security & Quality)

هذا القسم يحوّل متطلبات `mds/07` و`mds/08 §5` و`mds/10 §6-7` و`mds/06 §3` إلى blueprint تنفيذي قابل للقياس. كل بند مربوط بنوع الاختبار المناسب ومكانه في المستودع (`/backend`، `/frontend` حسب `mds/11`).

---

### 1. هرم الاختبار (Test Pyramid)

التوزيع المستهدف لمشروع NestJS + Next.js (يطابق `mds/08 §5`): قاعدة عريضة من Unit، طبقة متوسطة من Integration، قمة رفيعة من E2E.

| الطبقة | النسبة | الأداة | النطاق | الموقع | عتبة التغطية |
|--------|:------:|--------|--------|--------|:----:|
| **Unit** | ~70% | Jest (`ts-jest`) | منطق العمل الحرج بمعزل (services, domain logic) — المخزون/الحجز/التسعير | `backend/src/**/*.spec.ts` | ≥ 90% للوحدات الحرجة، ≥ 80% عام |
| **Integration** | ~20% | Jest + Supertest + Testcontainers (Postgres 16 + Redis حقيقيين) | تفاعل الوحدات عبر الـ DB والـ transactions: طلب ↔ مخزون ↔ محاسبة | `backend/test/integration/*.int-spec.ts` | تغطية المسارات الحرجة 100% |
| **E2E (API)** | جزء من Integration | Supertest على تطبيق Nest مُهيّأ (`Test.createTestingModule` + `app.init()`) | عقود REST كاملة مع Guards/Pipes/Interceptors فعلية | `backend/test/e2e/*.e2e-spec.ts` | كل endpoint في `mds/02 §6` |
| **E2E (UI)** | ~10% | Playwright (متعدد المتصفحات + RTL/عربي) | رحلة الشراء الكاملة عبر المتصفح | `frontend/e2e/*.spec.ts` | المسارات الذهبية فقط |
| **Frontend Unit/Component** | ضمن Unit | Jest + React Testing Library | مكوّنات السلة/المفضلة/الفلترة وحالاتها | `frontend/src/**/*.test.tsx` | ≥ 75% للمكوّنات ذات المنطق |

**أدوات داعمة:** `@faker-js/faker` (بيانات)، `nock`/MSW (محاكاة بوابة الدفع والشحن في الاختبار)، `supertest` (HTTP)، `k6` (الحمل، §6)، `@axe-core/playwright` (إمكانية الوصول WCAG حسب `mds/07 §4`).

#### 1.1 Unit — المنطق الحرج (المخزون / الحجز / التسعير)

ثلاث وحدات يجب اختبارها بمعزل تام (mock للـ repository):

**`InventoryService`** (`backend/src/inventory/inventory.service.ts`) — يطبّق معادلات `mds/06 §3`:

| دالة | الحالة المختبَرة | التوقّع |
|------|------------------|---------|
| `getAvailable(variant)` | `stock_quantity - reserved_quantity` | `available = stock - reserved`، لا قيم سالبة |
| `reserve(variantId, qty)` | `available >= qty` | `reserved_quantity += qty` |
| `reserve(variantId, qty)` | `available < qty` | يرمي `InsufficientStockException` |
| `confirm(variantId, qty)` | بعد الحجز | `stock_quantity -= qty` و `reserved_quantity -= qty` + سجل في `stock_movements` (type=إخراج) |
| `release(variantId, qty)` | إلغاء | `reserved_quantity -= qty` فقط (لا يلمس stock) |
| `restock(variantId, qty)` | إرجاع | `stock_quantity += qty` + `stock_movements` (type=مرتجع) |
| `checkLowStock(variant)` | `available <= min_stock_alert` | يُطلق حدث `low-stock.alert` |

**`PricingService`** (`backend/src/pricing/pricing.service.ts`):

| الحالة | التوقّع |
|--------|---------|
| سعر المتغير `product_variants.price` يطغى على `products.base_price` | يُستخدم سعر المتغير |
| `discount_price` موجود وأقل من السعر | `unit_price = discount_price` |
| كوبون نوع `نسبة` | `discount = round(subtotal * value/100)` |
| كوبون نوع `مبلغ` | `discount = min(value, subtotal)` (لا سالب) |
| `subtotal < coupon.min_order` | يرمي `CouponNotApplicableException` |
| كوبون منتهٍ (`expires_at < now`) أو تجاوز `usage_limit` | رفض |
| `total = subtotal - discount + shipping_cost` | تطابق دقيق، لا أخطاء تقريب (استخدم integer minor units أو `decimal.js`) |
| تجميد `unit_price` وقت الطلب | `order_items.unit_price` ثابت حتى لو تغيّر سعر المنتج لاحقاً (`mds/05 §3`) |

**`OrderStateMachine`** (`backend/src/orders/order-state-machine.ts`) — يطبّق `mds/06 §1-2`:

| من → إلى | مسموح؟ |
|----------|:------:|
| جديد → مؤكد | ✅ |
| مؤكد → قيد التجهيز → مشحون → مُسلّم | ✅ (بالتسلسل) |
| جديد/مؤكد → ملغي | ✅ |
| مُسلّم → مرتجع | ✅ |
| مشحون → جديد | ❌ (`InvalidTransitionException`) |
| مُسلّم → ملغي | ❌ |
| أي → نفس الحالة | ❌ |

كل انتقال يجب أن يكتب سطراً في `order_status_history` (`order_id`, `status`, `changed_by`, `created_at`).

#### 1.2 Integration — طلب ↔ مخزون ↔ محاسبة

تُشغَّل على Postgres 16 + Redis حقيقيين (Testcontainers) لاختبار الـ transaction والـ row-lock فعلياً، لا بـ mock.

السيناريوهات الإلزامية (`mds/06 §4`):

1. **تأكيد طلب**: `POST /api/orders` → `reserved += qty` (حالة "جديد") → `POST /api/orders/:id/confirm` → في transaction واحدة: `stock -= qty`, `reserved -= qty`, إدراج `stock_movements`, إنشاء فاتورة/قيد محاسبي، `status=مؤكد`, إدراج `order_status_history`. التحقق: الجداول الأربعة متّسقة بعد commit.
2. **إلغاء طلب مؤكد**: `reserved`/`stock` يعودان للحالة الصحيحة + `payment_status=مسترد` إن كان مدفوعاً.
3. **إرجاع طلب مُسلّم**: `stock += qty` + حركة `مرتجع` + refund.
4. **فشل وسط transaction** (مثلاً فشل إنشاء الفاتورة): rollback كامل — لا حجز ولا خصم ولا حركة مخزون متبقية (atomicity).
5. **انتهاء مهلة الحجز** (`mds/06 §2`): job يحرّر `reserved` ويضع `status=ملغي` للطلبات "جديد" المنتهية.

---

### 2. حالات اختبار حرجة: منع البيع المزدوج والتزامن (Concurrency)

هذا أعلى مخاطر المشروع (`mds/08 §8`). الحماية حسب `mds/06 §3`: **row-lock + إعادة تحقق التوفّر لحظة التأكيد**. التنفيذ: `SELECT ... FOR UPDATE` داخل transaction، أو في Prisma عبر `$transaction` مع `SELECT ... FOR UPDATE` خام مع `Serializable`/`ReadCommitted` + قفل صريح.

pseudocode للمنطق المحمي (`InventoryService.reserveWithLock`):

```
async reserveWithLock(variantId, qty):
  return prisma.$transaction(async (tx) => {
    // قفل الصف لمنع القراءات/الكتابات المتزامنة على نفس المتغير
    const [v] = await tx.$queryRaw`
      SELECT stock_quantity, reserved_quantity
      FROM product_variants
      WHERE id = ${variantId}
      FOR UPDATE`            // ← يسلسل المعاملات المتنافسة على نفس الصف

    const available = v.stock_quantity - v.reserved_quantity
    if (available < qty) throw new InsufficientStockException()

    await tx.product_variants.update({
      where: { id: variantId },
      data: { reserved_quantity: { increment: qty } }
    })
  }, { isolationLevel: 'ReadCommitted', timeout: 5000 })
```

**حماية إضافية على مستوى القاعدة (دفاع متعدد الطبقات):** قيد `CHECK (reserved_quantity <= stock_quantity)` و`CHECK (stock_quantity >= 0)` على `product_variants` — يضمن استحالة البيع المزدوج حتى لو فشل المنطق.

#### حالات الاختبار (Integration، Testcontainers)

| # | السيناريو | الإعداد | التوقّع |
|---|-----------|---------|---------|
| C1 | **بيع مزدوج**: عميلان يطلبان آخر قطعة معاً | `stock=1, reserved=0`، استدعاء `reserve` متوازٍ (`Promise.all`) | واحد ينجح، الآخر `InsufficientStockException`؛ النتيجة النهائية `reserved=1` فقط |
| C2 | **سباق على آخر N قطع** | `stock=10`، 20 طلباً متزامناً كل منها 1 | بالضبط 10 ينجحون، 10 يفشلون؛ لا overselling |
| C3 | **إعادة التحقق لحظة التأكيد** | حجز ناجح ثم تخفيض `stock` يدوياً (جرد) ثم `confirm` | يرفض التأكيد إذا أصبح المتاح غير كافٍ (`mds/06 §3` "التحقق مرة أخرى لحظة التأكيد") |
| C4 | **تأكيد + إلغاء متزامنان لنفس الطلب** (idempotency) | استدعاءان متوازيان على `/confirm` و`/cancel` | حالة نهائية واحدة متّسقة؛ لا خصم مزدوج؛ المخزون صحيح |
| C5 | **deadlock على متغيرين** | طلبان يحجزان variant A و B بترتيب معكوس | لا deadlock دائم (ترتيب القفل ثابت حسب `variant_id` تصاعدياً)، أو إعادة محاولة آمنة |
| C6 | **انتهاء المهلة أثناء التأكيد** | الـ cron يلغي طلباً بينما العميل يؤكّد | الفائز يحدّد الحالة النهائية ذرّياً؛ المخزون متّسق |

**أداة الإثبات:** تشغيل C1/C2 ضمن حلقة 50 مرة في CI لاكتشاف اللاحتمية (flakiness). إضافةً اختبار حمل تزامني عبر `k6` (`scenarios.spike`) على endpoint الحجز.

---

### 3. قائمة التدقيق الأمنية الكاملة (Security Checklist) — من `mds/07`

كل بند مربوط بآلية التنفيذ في الستاك (NestJS) ونوع الاختبار الذي يحرسه.

| # | الضابط (mds/07) | التنفيذ | نوع الاختبار |
|---|------------------|---------|--------------|
| S1 | **تشفير كلمات المرور** (bcrypt/Argon2) | `argon2` (افتراضي) في `AuthService.hashPassword`؛ تكلفة ≥ معايير OWASP؛ `password_hash` فقط في `users` | Unit: hash≠plain، verify يطابق، لا تخزين نص صريح |
| S2 | **JWT + Refresh** + انتهاء الجلسة | access قصير (15د) + refresh دوّار (rotation) مخزّن مهشّماً في Redis؛ `@nestjs/jwt` + Passport؛ logout يبطل refresh | Integration: انتهاء access، تجديد، إبطال بعد logout، رفض refresh معاد استخدامه |
| S3 | **2FA إلزامي للمدير** (`mds/10 §6`) | TOTP (`otplib`) لدور admin؛ Guard يفرض تحقق 2FA قبل أي endpoint إداري | Integration: admin بلا 2FA → 403؛ TOTP صحيح → نجاح؛ منع إعادة استخدام الرمز |
| S4 | **RBAC على الخادم** (`mds/10 §6`) | `RolesGuard` + `PermissionsGuard` يقرآن `roles`/`permissions`/`role_permissions`؛ ديكوريتر `@RequirePermission('orders.confirm')` | Integration: مصفوفة `mds/10 §3` كاملة — لكل (دور × endpoint) تحقق سماح/منع |
| S5 | **عزل العميل** (`mds/10 §4`) | العميل لا يصل لأي بيانات إدارية أو طلبات عملاء آخرين؛ تصفية إلزامية بـ `customer_id` | Integration: عميل A يطلب طلب عميل B → 403/404؛ IDOR على `/api/orders/:uuid` |
| S6 | **SQL Injection** | Prisma (parameterized بالكامل)؛ منع `$queryRawUnsafe` (ESLint rule)؛ raw queries بـ tagged templates فقط | Integration: payloads حقن في البحث/الفلترة/الفرز → لا تسريب؛ مراجعة كود |
| S7 | **XSS** | تنظيف المدخلات (`class-validator` + `class-transformer`)؛ ترميز المخرجات تلقائي عبر React؛ `sanitize-html` لحقول HTML (وصف المنتج/المراجعات)؛ CSP header | E2E (Playwright): إدخال `<script>` في مراجعة/بحث لا يُنفَّذ؛ Unit للمنظّف |
| S8 | **CSRF** | tokens للنماذج (mds/07)؛ للـ API: SameSite=Strict على الكوكيز + `csurf` للمسارات المعتمدة على الكوكي؛ أو Bearer-only للـ API | Integration: طلب بلا CSRF token على مسار محمي → 403 |
| S9 | **Rate Limiting + CAPTCHA** (Brute Force) | `@nestjs/throttler` (Redis store)؛ حدود مشددة على `/auth/login`, `/auth/refresh`, `/auth/2fa`؛ CAPTCHA بعد N محاولات فاشلة | Integration: تجاوز الحد → 429؛ عداد لكل IP+حساب |
| S10 | **رفع ملفات خبيثة** (صور المنتج) | تحقق MIME الحقيقي (magic bytes لا الامتداد) + حد الحجم + إعادة ترميز عبر `sharp` (يجرّد payload) + أسماء عشوائية + تخزين خارج web-root (MinIO/volume خلف Cloudflare، `mds/11`) | Unit: رفض غير-صورة، ملف ضخم، SVG بسكربت؛ Integration على `POST /api/products/:id/images` |
| S11 | **PCI-DSS عبر البوابة** (`mds/07`) | عدم تخزين بيانات البطاقة إطلاقاً؛ tokenization عبر البوابة؛ لا CVV/PAN في DB أو logs أو URLs | مراجعة كود + Integration: لا حقول بطاقة في `orders`؛ التحقق من عدم تسريب البطاقة في السجلات |
| S12 | **Security Headers** | `helmet`: HSTS، `X-Content-Type-Options`, `X-Frame-Options=DENY`, CSP، `Referrer-Policy`؛ SSL عند حافة Cloudflare (`mds/11`) | E2E: فحص الـ headers على الاستجابات (Playwright/integration) |
| S13 | **Secrets Management** | كل الأسرار في `.env` (غير مُتعقّب) مع `.env.example` (`mds/11`)؛ تحقق المخطط عبر `@nestjs/config` + Joi؛ منع الأسرار في الكود/السجلات | CI: secret scanning (gitleaks)؛ اختبار إقلاع يفشل إن غاب سر مطلوب |
| S14 | **عدم تمرير حساس في URL** (`mds/07`) | معرّفات الطلبات UUID في المسار (لا تخمين، `mds/05 §3`)؛ tokens في headers لا query | مراجعة + Integration: لا token/PII في query strings |
| S15 | **HTTPS/SSL** (`mds/07`) | SSL عند Cloudflare edge؛ الخدمات الداخلية على 127.0.0.1 (`mds/11`)؛ redirect HTTP→HTTPS | فحص نشر/دخان (smoke) |
| S16 | **Audit Trail مالي** (`mds/07`) | كل عملية مالية (تأكيد/إلغاء/استرداد) تُسجَّل (انظر §4) | Integration: تأكيد طلب يولّد سجل مالي |
| S17 | **النسخ الاحتياطي اليومي** + DR (`mds/07`) | `pg_dump` يومي مجدول + نسخ الصور؛ خطة استرجاع موثّقة | اختبار استرجاع دوري (runbook)؛ تحقق وجود النسخة في المراقبة |
| S18 | **مراقبة الأخطاء** (`mds/07 §5`) | Sentry للـ backend والfrontend؛ تنبيهات downtime؛ logs مركزية | smoke: حدث خطأ مُتعمّد يصل Sentry |

**أداة شاملة:** تشغيل OWASP ZAP (baseline scan) ضد بيئة staging في CI كبوابة أمنية قبل الإطلاق، و`npm audit`/Dependabot لثغرات المكتبات (`mds/07 §5` تحديثات دورية).

---

### 4. تطبيق سجل النشاط (Audit Log) — `mds/10 §7`

يسجّل العمليات الحساسة المذكورة في `mds/10 §7`، وكل سجل يحوي: المستخدم، العملية، الوقت، البيانات قبل وبعد.

#### 4.1 الجدول

```sql
CREATE TABLE audit_logs (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     UUID NOT NULL REFERENCES users(id),   -- من
  action       VARCHAR NOT NULL,    -- product.update, stock.adjust, order.confirm,
                                    -- order.cancel, refund.issue, settings.update,
                                    -- user.create/update/delete, role.permissions.update
  entity_type  VARCHAR NOT NULL,    -- products | product_variants | orders | users | ...
  entity_id    VARCHAR NOT NULL,
  before_data  JSONB,               -- اللقطة قبل
  after_data   JSONB,               -- اللقطة بعد
  ip_address   INET,
  user_agent   VARCHAR,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

#### 4.2 آلية الالتقاط

`AuditInterceptor` (`backend/src/audit/audit.interceptor.ts`) + ديكوريتر `@Audited({ action, entity })`. يلتقط `before` (يقرأ الكيان قبل) و`after` (نتيجة العملية)، ويكتب السجل **داخل نفس transaction** للعملية لضمان الذرّية (سجل ↔ تغيير). العرض محصور على المدير فقط (`mds/10 §3`: "عرض سجل النشاط — مدير ✅ فقط")، endpoint للقراءة فقط `GET /api/admin/audit-logs` (مفلتر، مرقّم، غير قابل للتعديل/الحذف — append-only).

العمليات المغطّاة (مطابقة `mds/10 §7`): تعديل/حذف منتج، تعديل مخزون يدوي (جرد/تسوية)، تأكيد/إلغاء/تعديل طلب، استرداد مالي، تغيير إعدادات، إضافة/تعديل/حذف مستخدم، تغيير صلاحيات.

#### 4.3 الاختبار

- **Unit**: `AuditInterceptor` يبني `before/after` بشكل صحيح ويحجب الحقول الحساسة (password_hash, tokens) من اللقطة.
- **Integration**: كل عملية في القائمة تُنتج سجلاً واحداً صحيحاً ضمن transaction؛ rollback العملية يلغي السجل (atomicity)؛ غير-admin لا يقرأ `/audit-logs` (403).

---

### 5. ميزانية الأداء وكيفية قياسها (Performance Budget) — `mds/07 §2`

#### 5.1 الميزانية (Frontend — أهداف `mds/07 §2`)

| المقياس | الهدف (mds/07) | أداة القياس | البوابة |
|---------|:--------------:|-------------|---------|
| Lighthouse Performance | > 90 | Lighthouse CI (`@lhci/cli`) | يفشل البناء إن < 90 |
| First Contentful Paint | < 1.5s | Lighthouse CI / Web Vitals | عتبة CI |
| زمن تحميل الصفحة (LCP/TTI تقريبي) | < 3s | Lighthouse CI | عتبة CI |
| حجم JS bundle | ميزانية لكل route (مثلاً < 200KB gzip للصفحة الرئيسية) | `next build` + `bundlesize`/`size-limit` | يفشل عند التجاوز |
| CLS | < 0.1 | Web Vitals | تنبيه |

تُقاس على الصفحات الحرجة: الرئيسية، التصنيف، صفحة المنتج، السلة/الدفع. تُستغل تقنيات `mds/07 §2`: SSG للصفحات الثابتة، SSR للديناميكية، WebP + lazy + responsive images، code splitting، minification، كاش Redis للصفحات/الاستعلامات، CDN عبر Cloudflare.

#### 5.2 ميزانية الـ Backend والحمل (Load Testing — `mds/08 §5`, `mds/07 §2`)

| المقياس | الهدف | الأداة |
|---------|-------|--------|
| p95 latency للقراءات (منتجات/تصنيفات) | < 200ms | k6 |
| p95 latency للكتابات (إنشاء/تأكيد طلب) | < 500ms | k6 |
| نسبة الأخطاء تحت الحمل المستهدف | < 1% | k6 thresholds |
| استعلامات N+1 | صفر | فحص Prisma query logs في الاختبار |
| استجابة بحث Meilisearch | < 100ms | k6 |

سيناريوهات k6 (`backend/test/load/`): `browse` (تصفّح/بحث/فلترة)، `checkout-spike` (ذروة على الحجز — يربط §2)، `soak` (ثبات طويل). البوابة: `thresholds` تفشل الـ CI عند تجاوز p95 أو معدل الأخطاء. فحص الفهرسة (`mds/05 §3`: `sku`, `order_number`, `email`, `category_id`) عبر `EXPLAIN ANALYZE` على الاستعلامات الساخنة.

---

### 6. معايير القبول (UAT) قبل الإطلاق — `mds/08 §5,§9`

بوابة الإطلاق: لا إطلاق ما لم تُستوفَ **كل** المعايير (Definition of Done للإصدار). مرتبطة بنطاق MVP في `mds/08 §2`.

#### 6.1 معايير وظيفية (UAT — مسارات MVP)

| المسار (mds/08 §2) | معيار القبول | نوع الاختبار |
|---------------------|---------------|--------------|
| تصفّح/بحث/فلترة | النتائج صحيحة وذات صلة، الفلاتر تعمل، ترقيم صفحات سليم | E2E |
| صفحة المنتج | الصور والمتغيرات والسعر والتوفّر صحيحة | E2E |
| السلة + المفضلة | إضافة/تعديل/حذف، الإجماليات صحيحة، البقاء عبر الجلسات (Redis) | E2E + Component |
| الدفع (إلكتروني + COD) | كلا المسارين ينجزان طلباً؛ تأكيد تلقائي للإلكتروني، يدوي لـ COD (`mds/06 §1`) | E2E + Integration |
| حساب العميل + تتبّع | تسجيل/دخول، عرض الطلبات، تتبّع الحالة | E2E |
| إدارة المنتجات والمتغيرات | CRUD كامل عبر الأدوار المخوّلة (`mds/10 §3`) | E2E + Integration |
| المخزون + التنبيهات | تعديل الكميات، تنبيه عند `available <= min_stock_alert` | Integration |
| إدارة الطلبات والحالات | الانتقالات حسب `mds/06`، سجل الحالات يُحدّث | Integration + E2E |
| لوحة معلومات أساسية | المؤشرات تُحمَّل وصحيحة | E2E |
| أدوار وصلاحيات | المصفوفة (`mds/10 §3`) مطبّقة على الخادم | Integration |

#### 6.2 معايير غير وظيفية (بوابات الإطلاق)

- ✅ كل اختبارات Unit/Integration/E2E خضراء في CI؛ تغطية الوحدات الحرجة ≥ 90%.
- ✅ حالات التزامن C1–C6 (§2) تمر 50/50 (لا flakiness)؛ صفر overselling.
- ✅ قائمة الأمان S1–S18 (§3) كلها مُحقّقة؛ ZAP baseline بلا ثغرات High/Critical؛ `npm audit` بلا High/Critical.
- ✅ ميزانية الأداء (§5): Lighthouse > 90، FCP < 1.5s، الصفحة < 3s؛ k6 thresholds خضراء.
- ✅ Audit Log (§4) يلتقط كل العمليات الحساسة لـ `mds/10 §7`.
- ✅ 2FA المدير و RBAC مُفعّلان ومُختبران (`mds/10 §6`).
- ✅ النسخ الاحتياطي اليومي يعمل واستُرجِع بنجاح مرة واحدة (drill).
- ✅ المراقبة (Sentry + downtime alerts، `mds/07 §5`) مُفعّلة في الإنتاج.
- ✅ إمكانية الوصول: axe-core بلا انتهاكات حرجة، RTL سليم (`mds/07 §4`).
- ✅ مراجعة العميل النهائية (sign-off) على بيئة staging مطابقة للإنتاج (`mds/08 §5` UAT).

#### 6.3 CI/CD Gates (الترتيب)

```
lint + typecheck → unit → integration (Testcontainers) → build →
e2e (Playwright) → concurrency-suite (C1–C6 ×50) → lighthouse-ci →
k6 load (staging) → ZAP baseline + gitleaks + npm audit → UAT sign-off → deploy (deploy.sh)
```

أي بوابة حمراء توقف الإطلاق. هذا يطابق المرحلة 8 "الاختبار الشامل" والمرحلة 9 "الإطلاق" في `mds/08 §3`، ويعالج مخاطر `mds/08 §8` (البيع المزدوج، الدفع، الأداء تحت الضغط، الثغرات الأمنية).

---

**الملفات المرجعية المستخدمة:** `c:/Projects/matjer/mds/06-order-lifecycle.md`، `c:/Projects/matjer/mds/07-security-performance.md`، `c:/Projects/matjer/mds/08-implementation-plan.md`، `c:/Projects/matjer/mds/10-roles-permissions.md`، `c:/Projects/matjer/mds/05-database-design.md`، `c:/Projects/matjer/mds/02-technical-architecture.md`، `c:/Projects/matjer/mds/11-server-deployment.md`.

---

## 9. خارطة الطريق والتنفيذ المرحلي

### خارطة الطريق المرحلية وخطة التنفيذ (Phased Roadmap & Execution Plan)

تبني هذه الخطة على أقسام التصميم السبعة أعلاه وعلى منهجية `mds/08 §1` (تدريجية تبدأ بـ MVP). الإجمالي المستهدف للـ MVP **~4-5 أشهر لفريق صغير (2-4)** مطابقاً لـ `mds/08 §3`. الترقيم: **P0** تهيئة، **P1-P6** نطاق MVP (`mds/08 §2`)، **PX1-PX6** ما بعد MVP (`mds/08 §4`). كل تقدير زمني افتراضه فريق من 2-3 مطوّرين بالتوازي. الرموز: ⚡ مسار متوازٍ ممكن، 🔒 تبعية حاجزة (blocking).

---

#### الجدول الزمني المجمّع (Master Timeline)

| المرحلة | الاسم | المدة | يتداخل مع | يرتكز على mds |
|---------|------|------|-----------|----------------|
| **P0** | التهيئة والبنية التحتية | 1-1.5 أسبوع | — | 11, 02, 07 |
| **P1** | نواة الباكند (Auth + RBAC + Prisma + Audit) | 2-2.5 أسبوع | — | 05, 10, 07, 02 |
| **P2** | الكتالوج + البحث + الإعدادات (Backend) | 2 أسبوع | ⚡ P3 | 03, 04, 05, 09 |
| **P3** | المتجر — أساس الواجهة + RTL + SEO | 2-3 أسابيع | ⚡ P2 (بعد عقود API) | 03, 02, 07 |
| **P4** | القلب: الطلبات + المخزون + السلة + الدفع/الشحن | 3-4 أسابيع | — (يستهلك P1-P2) | 06, 05, 09, 10 |
| **P5** | لوحة الإدارة (ERP أساسي) | 4-5 أسابيع | ⚡ مع نهاية P4 | 04, 10, 02 |
| **P6** | التكامل + الاختبار الشامل + الإطلاق | 2-3 أسابيع | — | 07, 08, 10, 11 |
| **PX1-6** | ما بعد MVP (التوسّعات) | متدرّج | — | 04, 09, 03 |

> **المسار الحرج (Critical Path):** P0 → P1 → P4 → P6. المراحل P2/P3 و(P5 جزئياً) تتوازى مع المسار الحرج (مطابق لـ `mds/08 §3`: "المراحل 4-5-6 يمكن أن تتداخل").

---

#### P0 — التهيئة والبنية التحتية (1-1.5 أسبوع)

**الأهداف:** بيئة تطوير ونشر تعمل end-to-end (هيكل فارغ يُقلع عبر النفق) قبل كتابة منطق العمل، لتثبيت المنافذ والأسرار والـ CI مبكراً (`mds/11`, القسم 7 DevOps أعلاه).

**Epics والمهام:**

| Epic | المهام الملموسة | المرجع |
|------|------------------|--------|
| E0.1 المستودع | `git init -b main`، ربط remote، `.gitignore` (استثناء `.env`، إبقاء `prisma/migrations/**/*.sql`)، `.editorconfig`، هيكل `backend/ frontend/ scripts/ .github/` | DevOps §1, mds/11 §6 |
| E0.2 البيئة | `.env.example` كامل (المنافذ المثبّتة 3020/4002/5436/6383)، توليد أسرار JWT/DB بـ `openssl` على السيرفر | DevOps §2, mds/11 §5 |
| E0.3 Compose | `docker-compose.yml` (postgres16/redis/meilisearch/backend/frontend) + healthchecks + حدود موارد + 127.0.0.1؛ `docker-compose.dev.yml` (hot-reload) | DevOps §3, mds/11 §6 |
| E0.4 الحاويات | `backend/Dockerfile` (multi-stage + Prisma generate)، `frontend/Dockerfile` (Next standalone) | DevOps §4 |
| E0.5 الهياكل | scaffold NestJS (`backend/`) + Next.js App Router RTL (`frontend/`)، `/api/health` و`/api/healthz` | معماري §2, RTL §7 |
| E0.6 النفق | `cloudflared route dns`، قواعد ingress (path-split `/api/*`,`/uploads/*` → 4002، الباقي → 3020)، نسخة `config.yml.bak` | DevOps §7, mds/11 §4 |
| E0.7 CI/CD | `.github/workflows/ci.yml` (lint+test+build للمشروعين، Postgres service)، `deploy.sh`، `scripts/backup.sh`, `scripts/healthcheck.sh`، cron النسخ | DevOps §6,§8,§9,§10 |
| E0.8 الجودة | إعداد Jest + Supertest + Testcontainers (backend)، Jest+RTL + Playwright (frontend)، ESLint/Prettier، Joi env validation | الاختبار §1 |

**التبعيات:** E0.3 🔒 يسبق E0.4-E0.5؛ E0.6 🔒 بعد إقلاع الحاويات. **متوازٍ:** E0.7 و E0.8 ⚡ بالتوازي مع E0.5.

**المخرجات:** مستودع مُهيّأ، `https://matjer.grade.sbs` يردّ 200 من frontend و`/api/health` من backend عبر Cloudflare، CI أخضر، نسخة احتياطية أولى ناجحة.

**معايير القبول:**
- ✅ `./deploy.sh` ينشر الهيكل الفارغ دون أخطاء؛ كل الخدمات `healthy` في `docker compose ps`.
- ✅ `curl -I https://matjer.grade.sbs/api/health` = 200 و`curl -I https://matjer.grade.sbs/` = 200.
- ✅ كل المنافذ على `127.0.0.1` فقط (تحقق `ss -tlnH`)؛ لا أسرار في Git (gitleaks نظيف).
- ✅ `scripts/backup.sh` ينتج `.sql.gz` + ping للمراقبة.

---

#### P1 — نواة الباكند: المصادقة + RBAC + طبقة البيانات + Audit (2-2.5 أسبوع)

**الأهداف:** أساس آمن ومُختبَر لكل ما يليه: schema القاعدة، المصادقة الكاملة، الصلاحيات على الخادم، سجل النشاط. لا ميزة عمل تُبنى قبل هذا (`mds/10 §6` تحقق على الخادم حصراً).

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E1.1 Prisma schema | `schema.prisma` كامل بكل جداول `mds/05` (snake_case عبر `@@map`)، الـ enums، UUID للحساس، soft-delete، الفهارس؛ أول migration؛ قيود `CHECK` (المخزون/الأسعار/rating) في SQL يدوي | بيانات §schema, mds/05 |
| E1.2 PrismaModule | `PrismaService` (global) + soft-delete extension + `migrate deploy` في `deploy.sh` | بيانات §migrations |
| E1.3 Seeding | `seed.ts` idempotent: الأدوار الخمسة، كتالوج الصلاحيات `resource.action`، `role_permissions` (مصفوفة `mds/10 §3`)، admin من env، تصنيفات أولية | بيانات §seeding, mds/10 |
| E1.4 AuthModule | register/login/refresh/logout، argon2، JWT access(15د)+refresh(دوّار في Redis)، `auth/me` | معماري §4, mds/07 |
| E1.5 2FA | TOTP (`otplib`) إلزامي للمدير: setup/verify، `tfaToken` وسيط | معماري §4, mds/10 §6 |
| E1.6 RBAC Guards | `JwtAuthGuard`→`RolesGuard`→`PermissionsGuard`→`TwoFactorGuard`، decorators `@Roles/@Permissions/@Public/@RequireTwoFactor`، فحص ملكية العميل | معماري §5, mds/10 |
| E1.7 Cross-cutting | `ResponseInterceptor` (شكل موحّد)، `AllExceptionsFilter`، `PaginationDto`، أكواد الحالة، `nestjs-pino` + traceId، rate limiting (`@nestjs/throttler`+Redis)، helmet, CSRF, sanitize | معماري §3,§7, mds/07 |
| E1.8 UsersRoles | CRUD `users`/`roles`/`permissions`، endpoints `/admin/users`، `/me` | باكند §UsersRoles |
| E1.9 Audit | جدول `audit_logs`، `AuditInterceptor` + `@Audited`، `GET /admin/audit-logs` (admin فقط) | الاختبار §4, mds/10 §7 |

**التبعيات:** E1.1 🔒 يسبق الكل. E1.4 🔒 يسبق E1.5/E1.6. E1.6 🔒 يسبق E1.8/E1.9. **متوازٍ:** E1.7 ⚡ مع E1.4-E1.6.

**المخرجات:** قاعدة بيانات مُرحَّلة ومزروعة، مصادقة + 2FA + RBAC + Audit عاملة ومُختبَرة وحدوياً وتكاملياً.

**معايير القبول:**
- ✅ `prisma migrate deploy` + `db seed` ينجحان؛ كل جداول `mds/05` موجودة بالأسماء snake_case والفهارس والقيود.
- ✅ login يصدر access+refresh؛ refresh rotation يبطل القديم؛ logout يبطل الجلسة (Integration S2).
- ✅ admin بلا 2FA verified → 403 على أي مسار إداري (Integration S3).
- ✅ مصفوفة `mds/10 §3` كاملة مُختبَرة: لكل (دور × endpoint) سماح/منع صحيح (Integration S4)؛ عميل لا يرى بيانات عميل آخر (S5).
- ✅ كل عملية حساسة تُنتج سجل `audit_logs` ضمن transaction (الاختبار §4).
- ✅ تغطية الوحدات الحرجة (Auth/RBAC) ≥ 90%.

---

#### P2 — الكتالوج + البحث + الإعدادات (Backend) (2 أسبوع) ⚡ يتوازى مع P3

**الأهداف:** توفير عقود REST للكتالوج (المصدر الذي تستهلكه الواجهة)، الفهرسة في Meilisearch، الإعدادات العامة.

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E2.1 CatalogModule | CRUD `products`/`product_variants`/`product_images`/`categories`؛ `GET /products` (فلترة/فرز/pagination/facets)، `GET /products/:slug`، `GET /categories` (شجرة) | باكند §Catalog, mds/03 §2-4 |
| E2.2 UploadsModule | رفع صور متعدد، تحقق MIME الحقيقي + حجم، إعادة ترميز WebP (`sharp`) بأحجام، تخزين على volume `/uploads` خلف Cloudflare | معماري §2, mds/07, الاختبار §S10 |
| E2.3 SearchModule | تكامل Meilisearch، فهرس `products` (searchable/filterable/sortable + typoTolerance)، مزامنة حدثية عبر events، `search:reindex`، `GET /search` + `/search/suggest` | تكاملات §4, mds/03 §3 |
| E2.4 SettingsModule | key-value + كاش Redis، `GET /settings/public`، `/admin/settings/*` (`settings.store`) | باكند §Settings, mds/04 §8 |
| E2.5 EventEmitter | `EventEmitterModule` + حدث `product.upserted/deleted` → SearchIndexer | باكند §Conventions |

**التبعيات:** 🔒 P1 (Prisma + RBAC). **متوازٍ:** E2.3 ⚡ مع E2.1؛ كامل P2 ⚡ مع P3 بعد تثبيت عقود API (E2.1).

**المخرجات:** API كتالوج كامل، بحث فوري عامل، رفع صور WebP، إعدادات عامة.

**معايير القبول:**
- ✅ `GET /products?category=&gold_type=&price_min=&sort=&page=` يرجّع نتائج مفلترة مرقّمة + meta صحيحة؛ `limit` بحد أقصى 100.
- ✅ تعديل منتج يُحدّث Meilisearch خلال ثوانٍ؛ `search/suggest` يردّ autocomplete < 100ms (k6).
- ✅ رفع غير-صورة/ملف ضخم/SVG بسكربت → مرفوض؛ المخرج WebP (S10).
- ✅ صورة تُخدَم عبر `/uploads/*` من خلف Cloudflare.

---

#### P3 — المتجر: أساس الواجهة + RTL + SEO (2-3 أسابيع) ⚡ يتوازى مع P2

**الأهداف:** هيكل واجهة المتجر RTL، الصفحات القابلة للأرشفة (الرئيسية/التصنيف/المنتج)، طبقة API client، SEO والأداء — كل ذلك يستهلك عقود P2 (mock أولاً ثم ربط فعلي).

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E3.1 الأساس | root layout `<html dir=rtl lang=ar>`، `next/font` عربي، Tailwind+logical props، palette ذهبي، route groups `(shop)/(auth)/(account)` | متجر §1,§7 |
| E3.2 API client | `lib/api/` (products/categories/...)، `fetcher.ts` (Bearer + refresh-on-401 + tags/revalidate)، `middleware.ts` لحماية `(account)` | متجر §3 |
| E3.3 مكوّنات | ui primitives (Radix+Tailwind)، `ProductCard/Grid`، `ProductGallery`، `VariantSelector`، `Breadcrumbs`، `JsonLd`، `ProductImage` (next/image WebP/lazy) | متجر §2,§9 |
| E3.4 الصفحات | الرئيسية (ISR)، `/c/[...slug]` (ISR + SSR للفلاتر)، `/p/[slug]` (ISR+`generateStaticParams`+`generateMetadata`)، `/search`، صفحات المحتوى (SSG) | متجر §3,§5 |
| E3.5 SEO | `sitemap.ts`/`robots.ts`، schema.org (Product/Offer/AggregateRating/Breadcrumb)، OpenGraph ديناميكي، canonical | متجر §8, mds/07 §3 |
| E3.6 الفلترة | searchParams ↔ URL، `FilterSidebar`/`SortDropdown`/`Pagination`/`InfiniteScroller`، البحث الفوري (debounce+AbortController) | متجر §5,§6 |
| E3.7 الأداء | RSC افتراضي، `next/dynamic` للثقيل، Suspense/Skeleton، `revalidateTag` webhook (`POST /api/revalidate`)، `useReportWebVitals` | متجر §10 |

**التبعيات:** 🔒 P0 (scaffold). يستهلك عقود E2.1 (يبدأ بـ mock ثم يربط). **متوازٍ:** E3.1-E3.3 ⚡ مبكراً مع P2.

**المخرجات:** متجر يتصفّح ويبحث ويفلتر، صفحات منتج/تصنيف مفهرسة SEO، أداء ضمن الميزانية.

**معايير القبول:**
- ✅ Lighthouse > 90، FCP < 1.5s، الصفحة < 3s على الرئيسية/التصنيف/المنتج (LHCI gate).
- ✅ `sitemap.xml` يولّد slugs المنتجات/التصنيفات؛ `robots.txt` يمنع `/account /checkout /cart /api`.
- ✅ schema.org صالح (Rich Results)؛ canonical وOG لكل منتج.
- ✅ الفلترة/الفرز/الترقيم تعكس URL وقابلة للمشاركة والرجوع؛ RTL سليم؛ axe-core بلا انتهاكات حرجة.

---

#### P4 — القلب: الطلبات + المخزون + السلة + الدفع/الشحن (3-4 أسابيع)

**الأهداف:** المنطق الحرج للمشروع (`mds/06`، `mds/08 §8`): محرّك المخزون والحجز مع منع البيع المزدوج، آلة حالات الطلب، السلة، checkout، الدفع (COD + بوابة) والشحن، والترابط التلقائي بيع→مخزون→محاسبة→عميل.

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E4.1 CartModule | السلة في Redis (guest) + `carts`/`cart_items` (مسجّل)، `/cart` CRUD، `cart/merge` عند الدخول | باكند §Cart, متجر §4 |
| E4.2 InventoryEngine | `reserve/commit/release/restock` ضمن `$transaction`+`SELECT…FOR UPDATE`، `stock_movements`، إعادة تحقق لحظة التأكيد، تنبيه `min_stock_alert` | باكند §Inventory, mds/06 §3 |
| E4.3 OrderStateMachine | جدول `TRANSITIONS`، `transition()` مع row-lock، `order_status_history`، endpoints confirm/cancel/process/ship/deliver/return | باكند §Orders, mds/06 |
| E4.4 CheckoutModule | orchestrator: Cart→Coupon→Reserve→Order (status=جديد)، COD يدوي / إلكتروني → `payment.required` | باكند §Checkout, mds/03 §6 |
| E4.5 CouponsModule | `coupons` CRUD + تحقق ذرّي (انتهاء/حد استخدام/min_order) في checkout | باكند §Coupons |
| E4.6 PaymentsModule | واجهة `PaymentProvider` + مزوّد واحد (sandbox)، `checkout`، `webhook` (توقيع HMAC + idempotency)، `refund`، COD | تكاملات §1, mds/09 |
| E4.7 ShippingModule | `shipping_zones`، `quote`، إدخال يدوي لرقم التتبّع، بوليصة PDF | تكاملات §2, mds/09 §2 |
| E4.8 الترابط التلقائي | `order.*` events → Inventory/Accounting(invoice)/CustomersCrm/Notifications؛ cron انتهاء مهلة الحجز | باكند §Orders, mds/04 §9, mds/06 §4 |
| E4.9 NotificationsModule | BullMQ + قنوات email/SMS/WebPush، قوالب حالات `mds/06 §5` | تكاملات §3 |
| E4.10 Accounting(MVP) | فاتورة تلقائية عند `order.confirmed` + قيد إيراد مبسّط، `invoice.pdf` | باكند §Accounting |
| E4.11 واجهة الشراء | `cart/`, `checkout/*` (stepper)، `confirmation`، `OrderTracker`، حساب العميل (طلبات/تتبّع/عناوين/مراجعات) | متجر §1,§4 |
| E4.12 ReviewsModule | `reviews` (عميل اشترى)، عرض المعتمد، اعتماد إداري | باكند §Reviews |

**التبعيات:** 🔒 P1 (auth/rbac) + P2 (catalog). E4.2 🔒 يسبق E4.3/E4.4. E4.6/E4.7 🔒 قبل E4.4 النهائي. **متوازٍ:** E4.9/E4.10/E4.12 ⚡ مع E4.6-E4.7؛ E4.11 ⚡ بعد عقود E4.4.

**المخرجات:** دورة شراء كاملة (تصفّح→سلة→دفع→طلب→تتبّع)، محرّك مخزون آمن ضد التزامن، ترابط تلقائي عامل.

**معايير القبول:**
- ✅ **منع البيع المزدوج (الأهم):** حالات C1-C6 (الاختبار §2) تمر 50/50 بلا flakiness؛ صفر overselling؛ قيد `CHECK(reserved ≤ stock)` يحرس القاعدة.
- ✅ دورة الكمية صحيحة لكل حدث (حجز/خصم/إعادة/مرتجع/مهلة) مطابقة `mds/06 §3`؛ كل تغيير يُنتج `stock_movements`.
- ✅ الانتقالات غير المسموحة تُرفض (`InvalidTransition`)؛ كل انتقال يكتب `order_status_history`.
- ✅ دفع إلكتروني: webhook (توقيع صحيح + idempotent) → تأكيد تلقائي؛ COD → تأكيد يدوي؛ refund عند الإلغاء/الإرجاع.
- ✅ `order.confirmed` يولّد فاتورة + يحدّث سجل العميل + يرسل إشعار، كلها ذرّياً (Integration طلب↔مخزون↔محاسبة)؛ rollback عند فشل وسط transaction.
- ✅ E2E: رحلة الشراء كاملة بالعربية عبر Playwright (COD + إلكتروني).

---

#### P5 — لوحة الإدارة (ERP أساسي) (4-5 أسابيع) ⚡ تبدأ مع نهاية P4

**الأهداف:** سطح إداري كامل لإدارة الكتالوج/المخزون/الطلبات/المستخدمين، تحت `/admin` داخل نفس تطبيق Next.js مع RBAC على الواجهة (تحسين UX) فوق الحماية الخادمية الفعلية.

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E5.1 AdminShell | route group `(admin)/admin`، Sidebar+Topbar، دخول إداري + 2FA، `usePermission`/`<Can>`/route guards، تحميل `/admin/me` | لوحة §قرار,§إخفاء |
| E5.2 المنتجات | جدول AG Grid (server-side)، نماذج RHF+Zod، tab المتغيرات/الصور (رفع متعدد)، التصنيفات | لوحة §شجرة,§نماذج, mds/04 §2 |
| E5.3 الاستيراد/التصدير | wizard Excel/CSV (parse→mapping→commit) عبر `xlsx`، تقرير أخطاء صف-صف، قالب فارغ، تصدير | لوحة §رفع مجمّع, mds/04 §2 |
| E5.4 المخزون | عرض المتاح/المحجوز، تعديل يدوي inline (→ حركة تسوية + Audit)، حركات، تنبيهات low-stock | لوحة §شجرة, mds/04 §3 |
| E5.5 الطلبات | قائمة+فلترة، تفاصيل، تغيير حالة (optimistic + rollback على 409/422)، طباعة فاتورة/بوليصة | لوحة §شجرة, mds/06 |
| E5.6 المستخدمون والأدوار | إدارة `users`/`roles`، تعيين الصلاحيات، انعكاس فوري على `<Can>` | لوحة §إخفاء, mds/10 |
| E5.7 لوحة المعلومات | `DashboardService` (تجميعات + كاش Redis)، Recharts (مبيعات/طلبات حسب الحالة/أكثر مبيعاً)، تقرير مبيعات/مخزون أساسي | باكند §Reports, mds/04 §1 |
| E5.8 Audit Viewer | `GET /admin/audit-logs` عارض مفلتر (admin) | الاختبار §4 |

**التبعيات:** 🔒 P1 (RBAC) + P4 (orders/inventory APIs). **متوازٍ:** E5.2-E5.7 ⚡ بين عدة مطوّرين بعد E5.1.

**المخرجات:** لوحة ERP أساسية كاملة الوظائف بحسب الأدوار، تطبق مصفوفة `mds/10 §3` بصرياً + خادمياً.

**معايير القبول:**
- ✅ كل وحدة من `mds/08 §2` (منتجات/متغيرات، مخزون+تنبيهات، طلبات+حالات، لوحة، أدوار) تعمل عبر الأدوار المخوّلة.
- ✅ عناصر القائمة/الأزرار تُخفى/تُعطّل حسب صلاحيات المستخدم؛ نداء API مباشر بلا صلاحية → 403 (الحماية الفعلية خادمية).
- ✅ استيراد Excel: صفوف صالحة تُكتب، الفاشلة تُعاد مع رقم/سبب؛ المطابقة عبر `sku`.
- ✅ تعديل مخزون يدوي وتغيير حالة طلب يُسجَّلان في `audit_logs` (before/after).
- ✅ AG Grid بترقيم/فرز/فلترة خادمية + RTL؛ Dashboard يحمّل المؤشرات الصحيحة.

---

#### P6 — التكامل + الاختبار الشامل + الإطلاق (2-3 أسابيع)

**الأهداف:** تصليب الجودة والأمان والأداء، اجتياز بوابات الإطلاق، النشر للإنتاج مع المراقبة (`mds/08 §3` المراحل 8-9).

**Epics والمهام:**

| Epic | المهام | المرجع |
|------|--------|--------|
| E6.1 E2E شامل | رحلات Playmright لكل مسارات MVP (شراء/حساب/إدارة)، RTL + axe-core | الاختبار §6 |
| E6.2 التزامن | تشغيل C1-C6 ×50 في CI، k6 spike على الحجز | الاختبار §2 |
| E6.3 الأمان | قائمة S1-S18، OWASP ZAP baseline، gitleaks، `npm audit`، مراجعة PCI (لا بطاقة في DB/logs) | الاختبار §3 |
| E6.4 الأداء | LHCI gate (>90, FCP<1.5s)، k6 (p95 قراءات<200ms/كتابات<500ms، أخطاء<1%)، فحص N+1 وفهارس `EXPLAIN ANALYZE` | الاختبار §5 |
| E6.5 المراقبة | Sentry (back+front)، healthchecks.io downtime، `@nestjs/terminus`، logging محدود | DevOps §10 |
| E6.6 DR | اختبار استرجاع نسخة احتياطية (drill)، runbook | DevOps §9 |
| E6.7 UAT والإطلاق | sign-off العميل على staging مطابق، نشر إنتاج عبر `deploy.sh`، تهيئة، تدريب الموظفين | mds/08 §6 |

**CI/CD Gates (الترتيب، الاختبار §6.3):** lint+typecheck → unit → integration(Testcontainers) → build → e2e → concurrency(C1-C6 ×50) → LHCI → k6 → ZAP+gitleaks+npm audit → UAT sign-off → deploy.

**التبعيات:** 🔒 P3+P4+P5 مكتملة. **متوازٍ:** E6.3/E6.4/E6.5 ⚡.

**المخرجات:** نظام مُختبَر ومؤمّن ومراقَب في الإنتاج، MVP مُطلَق.

**معايير القبول (بوابة الإطلاق — لا إطلاق دون استيفاء الكل):**
- ✅ كل اختبارات Unit/Integration/E2E خضراء؛ تغطية الحرج ≥ 90%؛ C1-C6 تمر 50/50.
- ✅ S1-S18 محقّقة؛ ZAP بلا High/Critical؛ `npm audit` بلا High/Critical.
- ✅ Lighthouse>90، FCP<1.5s، الصفحة<3s؛ k6 thresholds خضراء.
- ✅ Audit Log يغطّي كل عمليات `mds/10 §7`؛ 2FA المدير + RBAC مفعّلان ومُختبَران.
- ✅ نسخة احتياطية يومية تعمل واستُرجِعت بنجاح مرة؛ Sentry + downtime alerts مفعّلة.
- ✅ UAT sign-off من العميل على staging مطابق للإنتاج.

---

#### ما بعد MVP — التوسّعات (PX، متدرّجة حسب `mds/08 §4`)

| المرحلة | المحتوى | الأولوية | يبني على | Epics رئيسية |
|---------|---------|:--------:|----------|---------------|
| **PX1** | المشتريات والموردون | عالية | P4 (Inventory) | تفعيل `ProcurementModule` (suppliers/purchase-orders)، استلام → حركة إدخال + تكلفة، تحليل تكلفة/هامش، واجهة `/admin/procurement` |
| **PX2** | المحاسبة والتقارير المتقدمة | عالية | E4.10, E5.7 | دفتر أستاذ كامل، تقارير أرباح/كوبونات/مرتجعات، تصدير PDF/Excel مجدوَل، `accounting.export` |
| **PX3** | CRM والتسويق | متوسطة | E4.8 (events) | شرائح العملاء، الحملات الموجّهة، السلات المتروكة المتقدمة، بريد تسويقي، واتساب |
| **PX4** | المستودعات المتعددة | متوسطة | E4.2 | تفعيل `warehouses` + `warehouse_id`، تحويل المخزون بين المستودعات، الجرد الدوري الكامل |
| **PX5** | الولاء + تعدد اللغات | منخفضة | E3.1 (i18n-ready) | برنامج نقاط/ولاء، إضافة segment `[locale]` + ملفات الترجمة، RTL/LTR ديناميكي |
| **PX6** | تطبيق جوال | حسب الحاجة | REST API الموجود | تطبيق native/PWA يستهلك نفس `/api/v1` |

> البنية مهيّأة مسبقاً لهذه التوسّعات: جداول `suppliers/purchase_orders/warehouses` موجودة في schema (`mds/05`)، modules `Procurement/CustomersCrm` تُبنى كهيكل في MVP وتُفعّل لاحقاً، والواجهة i18n-ready (متجر §7).

---

#### جدول تتبّع التغطية (Coverage Traceability) — ربط ملفات mds (00-11) بالمراحل

| ملف mds | الموضوع | المراحل المنفّذة | كيف يُغطّى |
|---------|---------|------------------|-----------|
| **mds/00** | مقدمة/نظرة عامة | P0 | إطار الرؤية يوجّه نطاق MVP وترتيب المراحل |
| **mds/01** | المتطلبات/الأهداف | P0, P6(UAT) | تُترجم لمعايير القبول وبوابة الإطلاق |
| **mds/02** | المعمارية والستاك | P0, P1, P3, P5 | Next.js/NestJS/PG16/Redis/Meili (P0)؛ طبقات Controller→Service→Prisma (P1)؛ AG Grid/Recharts (P5) |
| **mds/03** | ميزات المتجر | P2, P3, P4 | كتالوج/بحث (P2)؛ صفحات/RTL/SEO/فلترة (P3)؛ سلة/مفضلة/دفع/حساب/مراجعات (P4) |
| **mds/04** | نظام ERP | P5, P2(settings), PX1-PX3 | لوحة الإدارة الأساسية (P5)؛ الترابط §9 (P4)؛ المشتريات/المحاسبة/CRM (PX1-3) |
| **mds/05** | تصميم القاعدة | P1, P4 | schema كامل snake_case + enums + UUID + soft-delete + فهارس + CHECK (P1)؛ `order_items.unit_price`/`stock_movements` (P4) |
| **mds/06** | دورة حياة الطلب | P4 | محرّك المخزون/الحجز §3، آلة الحالات، انتهاء المهلة، الترابط §4، إشعارات §5 |
| **mds/07** | الأمان والأداء | P0, P1, P3, P6 | SSL/النسخ/المراقبة (P0)؛ argon2/JWT/throttle/helmet/CSRF (P1)؛ WebP/SSG/Lighthouse/SEO (P3)؛ S1-S18/الأداء (P6) |
| **mds/08** | خطة التنفيذ | P0-P6, PX1-6 | هذه الخارطة نفسها: ترقيم المراحل، تداخل 4-5-6، تقدير 4-5 أشهر، المخاطر §8 |
| **mds/09** | التكاملات | P2, P4 | Meilisearch (P2)؛ الدفع/الشحن/الإشعارات/التحليلات/Google (P4)؛ المتقدّم في PX3 |
| **mds/10** | الأدوار والصلاحيات | P1, P5, P6 | جداول+seed+Guards+2FA+Audit (P1)؛ RBAC على الواجهة (P5)؛ اختبار المصفوفة §3+§4 (P6) |
| **mds/11** | النشر على السيرفر | P0, P6 | Compose/Dockerfile/النفق/المنافذ/deploy.sh/النسخ (P0)؛ النشر الإنتاجي النهائي (P6) |

> ملاحظة: ملفات mds/00 و mds/01 وثائق رؤية/متطلبات عالية المستوى تُستهلك عرضياً عبر كل المراحل (تحدّد "ماذا نبني")، بينما mds/02-11 وثائق تصميم تنفيذية مربوطة بمراحل ملموسة كما أعلاه. كل المراحل تستشهد بأقسام التصميم السبعة (معماري/بيانات/باكند/متجر/لوحة/تكاملات/DevOps/اختبار) المثبّتة في سياق هذا المستند.

---

## 10. ملحق أ — مراجعة نقدية: ثغرات وتناقضات وتصحيحات

> أُنتجت هذه المراجعة آلياً بفحص الخطة مقابل كل وثائق mds (00–11)، وعُولجت بنودها الحرجة في كتلة «قرارات توحيدية ملزِمة» أعلى الملف.

### مراجعة نقدية للجودة والاكتمال — خطة تنفيذ matjer

التغطية إجمالاً **ممتازة جداً وكثيفة**: الأقسام السبعة وخارطة الطريق تغطّي الأغلبية الساحقة من mds/02–11 بدقة، وتستشهد بالوثائق، وتثبّت المنافذ والأسماء والتدفقات بأمانة. منطق المخزون/التزامن (أخطر بند) مُعالَج بعمق حقيقي (row-lock + إعادة تحقق + CHECK + حالات C1–C6). ومع ذلك، يوجد عدد من الثغرات والتناقضات والمخاطر المحدّدة التي يجب معالجتها قبل اعتبار الخطة جاهزة للتنفيذ. أدناه القائمة المرتّبة حسب الأولوية.

---

#### 1) ثغرات: متطلبات mds غير مُغطّاة (أو مُغطّاة جزئياً دون تنفيذ واضح)

| # | الملف/المتطلب | الثغرة | التصحيح المقترح |
|---|----------------|--------|------------------|
| G1 | **mds/05 §3 + mds/08 §2 + mds/06 §2** — soft-delete على `orders` | قسم البيانات يضيف `deletedAt` لـ orders، لكن mds/05 §3 ينص حرفياً على "Soft Delete... للمنتجات **والطلبات**". المشكلة الأخطر: **soft-delete على orders يتعارض مع منطق المخزون** — حذف طلب (soft) لا يحرّر `reserved_quantity`. لا توجد معالجة لهذا. | وثّق صراحةً أن الطلبات **لا تُحذف** بل تُلغى (status=ملغي عبر آلة الحالات التي تحرّر المخزون)؛ `deleted_at` على orders للأرشفة الإدارية فقط بعد الإلغاء، ولا يُستخدم كبديل عن الإلغاء. |
| G2 | **mds/04 §2** — "منتجات مميزة / **جديدة** / الأكثر مبيعاً" + mds/03 §1 "وصل حديثاً" | الخطة تغطّي `is_featured` و"الأكثر مبيعاً" (sales_count)، لكن **لا تعرّف آلية "وصل حديثاً/جديد"** بوضوح (هل هو `created_at` ضمن نافذة زمنية أم علم `is_new`؟). كذلك `sales_count` و`rating` مذكوران في فهرس Meilisearch وكحقول فرز لكن **غير موجودين كأعمدة في schema المعروض** (mds/05 لا يذكرهما). | عرّف "وصل حديثاً" = فرز `created_at` desc ضمن نافذة (مثلاً 30 يوماً) دون عمود إضافي. أضف عمودين محسوبين/مخزّنين `sales_count` و`avg_rating` (أو computed view) إلى `products` مع تحديثهما عبر events (order.confirmed / review.approved)، وإلا فالفرز "الأكثر مبيعاً/الأعلى تقييماً" (mds/03 §2) غير قابل للتنفيذ. |
| G3 | **mds/04 §2** — "الوسوم (Tags)" | جدول/علاقة الوسوم غير موجودة في schema (mds/05 لا يذكرها صراحةً، والخطة تذكر `tags[]` في نموذج المنتج وفلتر AG Grid دون جدول). | أضف جدولي `tags` و`product_tags` (M-N) إلى schema، أو وثّق أن الوسوم مؤجّلة (mds/08 لم تذكرها صراحةً في MVP). الحالي: غموض بين "موجود في نموذج الإدخال" و"غير موجود في القاعدة". |
| G4 | **mds/04 §8** — "إدارة **الضرائب** (إن وُجدت)" | غير مذكورة إطلاقاً في أي قسم (لا حقل `tax` في orders، لا في SettingsModule، لا في PricingService). | أضف `tax_amount` إلى `orders` و`tax_rate` إلى SettingsModule، واحسبها في PricingService، أو وثّق أنها خارج النطاق (الضرائب اختيارية حسب النص). على الأقل أقرّ بالقرار صراحةً. |
| G5 | **mds/04 §8** — "إدارة **اللغات والعملة**" | تعدد اللغات مؤجّل (موثّق جيداً). لكن **العملة** غير معالجة إطلاقاً: لا حقل عملة، لا إعداد، والأسعار `Decimal(12,2)` بلا سياق عملة. | أضف إعداد عملة واحدة (single-currency MVP) في SettingsModule + رمز العملة في الواجهة. تعدد العملات مؤجّل لكن العملة الافتراضية يجب أن تكون معرّفة. |
| G6 | **mds/04 §4** — "إضافة **ملاحظات داخلية**" على الطلب + "تعيين شركة الشحن **والمندوب**" | حقل `notes` موجود في orders، لكن الخطة لا تفرّق بين ملاحظات العميل وملاحظات الموظف الداخلية. "المندوب" (rep/courier) غير مُمثّل. | إمّا حقل `internal_notes` منفصل عن `notes` (ملاحظات العميل)، وحقل `shipping_rep`/`courier` على orders، أو وثّق دمجهما. |
| G7 | **mds/03 §4** — "عدد القطع للأطقم" ضمن المواصفات | المواصفات (اللون/الخامة/القياسات/عدد القطع) — `product_variants` يغطّي size/color فقط؛ لا حقل عام للمواصفات (specs/attributes) ولا "عدد القطع". | أضف حقل `attributes JSONB` أو `specifications` إلى `products` لاستيعاب المواصفات المتنوّعة (خامة، عدد قطع، قياسات) بدل أعمدة صلبة. |
| G8 | **mds/03 §8 + mds/09 §4** — "الدعم المباشر: **شات** أو زر واتساب" | الخطة تثبّت "زر واتساب عائم" في MVP وتؤجّل الشات. مقبول، لكن mds يذكر الشات كخيار. | لا إجراء (قرار سليم)، فقط تأكيد أن الاختيار موثّق (مذكور كمؤجّل في متجر §11). ✅ |
| G9 | **mds/07 §1** — "**تشفير البيانات الحساسة في قاعدة البيانات**" (encryption at rest للحقول) | الخطة تغطّي password hashing وSSL وعدم تخزين البطاقات، لكن **لا تعالج تشفير الحقول الحساسة** (هاتف العميل، العناوين/PII) داخل القاعدة كما ينص mds/07 §1 صراحةً. | أقرّ بالقرار: إمّا تشفير عمود-مستوى للحقول الحساسة (pgcrypto/تشفير تطبيقي)، أو الاكتفاء بـ encryption-at-rest على مستوى volume/disk مع تبرير. الحالي: المتطلب مُغفَل. |
| G10 | **mds/03 §9** — "منتجات مقترحة بناءً على **التصفّح**" | الخطة تذكر RelatedProducts/RecentlyViewed، لكن "المقترحة بناءً على التصفّح" (سلوكية) مؤجّلة دون ذكر صريح. | وثّق أن التوصيات السلوكية مؤجّلة (PX3)، والـ MVP يكتفي بـ "منتجات مشابهة" (نفس التصنيف). مذكور جزئياً لكن يُحسَّن بالوضوح. |
| G11 | **mds/09 §3** — "تأكيد التسجيل **وكلمة المرور المؤقتة**" | قالب `auth.welcome` مذكور، لكن تدفّق "كلمة المرور المؤقتة" يتعارض مع تسجيل العميل العادي (العميل يختار كلمته). هذا التدفّق يخص المستخدمين الإداريين (admin/sales...) الذين يُنشأون من اللوحة. | وضّح أن "كلمة المرور المؤقتة" تخص **المستخدمين الإداريين** المُنشَئين عبر `/admin/users` (إجبار تغييرها أول دخول)، لا عملاء المتجر. |

---

#### 2) تناقضات (بين الأقسام أو مع القرارات المثبّتة أو الوثائق)

| # | التناقض | التفصيل | التصحيح المقترح |
|---|---------|---------|------------------|
| C-1 | **بادئة API: `api/v1` مقابل `api`** ❗ تناقض حرج | القسم المعماري (1) يثبّت `/api/v1/...` (`enableVersioning(URI, v1)`) ويوجّه كل المسارات تحت v1. لكن **قسم الباكند (3)** و**قسم التكاملات** و**DevOps** يستخدمون `/api/auth/...`, `/api/admin/...`, `/api/webhooks/...` **بدون v1**. والأخطر: **mds/11 §4.3** يوجّه `path: /api/.*` فقط — وهذا يعمل مع كليهما، لكن الواجهة (متجر §3) تستهلك `/api/v1` بينما الباكند يعرّف `/api`. **عدم تطابق فعلي سيكسر كل النداءات.** | وحّد فوراً على **`/api/v1`** في كل الأقسام (الأنظف للمستقبل)، أو احذف v1 كلياً. تحديث `NEXT_PUBLIC_API_URL` و`api-client` و`fetcher` و`setGlobalPrefix` ليتطابقوا. توصية: `/api` بلا نسخة لـ MVP (أبسط، يطابق mds/11 و95% من الأقسام)، وتأجيل versioning. |
| C-2 | **`payment_status` enum: قيم لاتينية مقابل عربية** | قسم البيانات (2) يعرّف `PaymentStatus { UNPAID PAID REFUNDED }` (لاتيني). قسم التكاملات (6) يكتب `payment_status=مدفوع/غير مدفوع/مسترد` (عربي) ويقول "موجود في orders". تناقض في تمثيل القيمة. | ثبّت enums **لاتينية في DB** (كما قرّر قسم البيانات والقرار المثبّت: "القيم في DB تبقى لاتينية")، والعربية للعرض فقط. صحّح نص قسم التكاملات. ينطبق نفس الأمر على `OrderStatus`, `StockMovementType`, `PaymentMethod`. |
| C-3 | **`docker-compose.yml`: `database` host مقابل اسم الخدمة + DB_USER** | DevOps يعرّف `DATABASE_URL=...@database:5432/...` (اسم الخدمة `database`) — صحيح. لكن قسم البيانات/المعماري يستخدم أحياناً `@database` وأحياناً `postgres:5436`/`redis:6383` (المنافذ المضيفة لا الداخلية). **داخل شبكة Docker المنفذ 5432/6379 لا 5436/6383.** قسم المعماري (6) يكتب `DATABASE_URL=...@database:5432` ✅ لكن نصاً آخر يقول "يشير إلى postgres:5436". | تأكيد قاطع: داخل compose يُستخدم اسم الخدمة + المنفذ **الداخلي** (`database:5432`, `redis:6379`). المنافذ 5436/6383 للوصول من المضيف فقط (127.0.0.1). صحّح أي ذكر لـ `postgres:5436` في DATABASE_URL. |
| C-4 | **اسم خدمة Redis + Postgres** | mds/11 §6 يسمّي الخدمات `database` و`redis`. DevOps يستخدم `database`/`redis` ✅. لكن المعماري يكتب أحياناً `REDIS_URL=redis://redis:6379` ✅ ومرة `postgres:5436`. وقسم البيانات يذكر `provider=postgresql` + `@database`. تطابق جزئي مع التباس بسيط. | لا تناقض جوهري بعد C-3، فقط توحيد: خدمة القاعدة اسمها `database` (ليس `postgres`) في كل المراجع. |
| C-5 | **`deploy.sh`: `build --no-cache` مقابل `build --pull`** | mds/11 §7.ج (القالب المعتمد) و§10 يوصيان `--no-cache` صراحةً ("تخفيف بناء `--no-cache`"). قسم DevOps يستبدله بـ `--pull` ويقول في مصفوفة القيود "`--pull` (لا `--no-cache` افتراضياً)". **هذا يخالف نص mds/11 §10 الذي يجعل `--no-cache` تخفيفاً لضغط الذاكرة.** | تناقض في الفهم: `--no-cache` يزيد زمن/ذاكرة البناء لا يخفّضهما. نص mds/11 §10 نفسه قد يكون غير دقيق، لكن الخطة تخالفه دون إقرار. الحل: استخدم build cache افتراضياً (`--pull` فقط) **مع تبرير صريح أنه أخف على الذاكرة من `--no-cache`**، وأقرّ بالانحراف عن قالب mds/11 §7.ج. |
| C-6 | **`migration:run` معنى السكربت** | mds/11 §7.ج: `npm run migration:run`. قسم البيانات يربط `migration:run` بـ `prisma migrate deploy` ✅، لكن DevOps يكتب أيضاً `migrate deploy` مباشرة في خطوات أخرى. متّسق عملياً. لكن **mds/11 القالب يستخدم `|| true`** (يبتلع الفشل) بينما DevOps يزيله عمداً. | الانحراف هنا **صحيح ومبرّر** (فشل ترحيل صامت خطر على mds/06). فقط تأكيد الإقرار به (مذكور في DevOps §6). ✅ |
| C-7 | **عدد الحاويات: "حاويتان فقط" مقابل الواقع** | القسم المعماري يقول "لتبسيط النشر بحاويتين فقط" (frontend+backend). لكن النظام فعلياً = **5+ حاويات** (frontend, backend, database, redis, meilisearch, worker/BullMQ). تصريح مضلّل. | صحّح العبارة إلى "تطبيقَين (frontend+backend) + خدمات بنية تحتية (db/redis/meili)" — اللوحة ضمن frontend هو المقصود، لكن الصياغة توهم بحاويتين كليّاً. |
| C-8 | **Worker/BullMQ: خدمة منفصلة أم لا** | قسم التكاملات يقول "worker إمّا process في حاوية backend أو خدمة مستقلة". لكن `docker-compose.yml` في DevOps **لا يحتوي خدمة worker**، وBullMQ يحتاج معالِجاً يعمل. إن كان داخل backend process نفسه، يجب توضيح أنه يعمل في نفس عملية NestJS (لا يحتاج خدمة). | احسم: BullMQ workers تعمل **داخل عملية backend نفسها** عبر `@nestjs/bullmq` processors (لا خدمة منفصلة في MVP) — وعدّل compose ليعكس ذلك صراحةً، أو أضف خدمة `worker`. الحالي: compose وقسم التكاملات غير متطابقين. |
| C-9 | **Meilisearch: خدمة جديدة غير موجودة في قالب mds/11 §6** | قالب mds/11 §6 يحتوي 4 خدمات فقط (db/redis/backend/frontend). DevOps والتكاملات يضيفان Meilisearch بحق (mds/02 يذكره). هذا **توسيع مبرّر** لا تناقض، لكن يجب الإقرار بأنه إضافة على قالب mds/11. | لا إجراء جوهري — فقط تأكيد الإقرار (مذكور في DevOps). تنبيه: Meilisearch يستهلك ذاكرة على سيرفر محمّل (8.3/15GB) — راجع G-risk أدناه. ✅ مع تحفّظ موارد. |
| C-10 | **صيغة أسماء الصلاحيات: `resource.action` مقابل `resource:action`** | القسم المعماري (5) يثبّت `products:write` (نقطتان). قسم الباكند وقسم اللوحة يستخدمان `products.write` (نقطة). **تناقض مباشر في صيغة المفتاح** سيكسر مطابقة Guard ↔ seed ↔ واجهة. | وحّد على صيغة واحدة (`resource.action` بالنقطة هي الأكثر شيوعاً في الأقسام). صحّح القسم المعماري §5. هذا مفتاح يُخزَّن في `permissions.name` ويُقارَن في `PermissionsGuard` و`<Can>` — أي اختلاف = فشل صامت. |
| C-11 | **OTP/2FA: `requires2fa` للأدمن مقابل OTP للعميل** | المعماري يجعل 2FA (TOTP) للأدمن. الباكند يضيف `auth/otp/request|verify` للعميل (mds/03 §7) + `auth/2fa` للأدمن. متّسق، لكن **خلط محتمل**: OTP العميل (SMS عند التسجيل) ≠ 2FA المدير (TOTP). | تأكيد الفصل (موجود ضمنياً): OTP = تحقق هاتف/بريد للعميل (mds/03 §7)؛ 2FA TOTP = إلزامي للمدير (mds/10 §6). لا تناقض جوهري، فقط توضيح. ✅ |
| C-12 | **منفذ DB في `.env.example`: تناقض القالب** | mds/11 §6 قالب `.env.example` لا يحوي `DB_USER` ولا `DATABASE_URL` (يبنيها compose). DevOps يضيف `DATABASE_URL` و`DB_USER` للـ `.env` ويستهلكها Prisma مباشرة. **هذا انحراف عن قالب mds/11** (الذي يبني DATABASE_URL داخل compose من المتغيرات). | احسم مصدراً واحداً لـ `DATABASE_URL`: إمّا في `.env` صراحةً (لـ Prisma CLI محلياً + الحاوية)، أو يُبنى في compose فقط. التوصية: عرّفه في `.env` (Prisma CLI يحتاجه للـ migrations خارج الحاوية أيضاً)، وأقرّ بالانحراف عن قالب mds/11. |

---

#### 3) مخاطر / إغفالات تقنية حرجة

| # | المخاطرة | التفصيل | التصحيح المقترح |
|---|----------|---------|------------------|
| R-1 | **Prisma + `SELECT … FOR UPDATE`: مستوى العزل وصحة القفل** ❗ | المخزون (mds/06 §3) يعتمد قفل صف داخل `$transaction`. الكود المعروض يستخدم `isolationLevel: 'ReadCommitted'` مع `FOR UPDATE`. هذا صحيح **بشرط** أن يكون الـ raw `SELECT FOR UPDATE` والـ `UPDATE` على **نفس عميل `tx`**. لكن خطر دقيق: Prisma `$queryRaw` يعيد صفوفاً لكن **لا يضمن أن القفل في نفس الاتصال** إن أُسيء الاستخدام. كذلك `confirm()` في قسم الباكند يقارن `item.quantity > variant.reserved_quantity` بينما يجب مقارنة المتاح/المخزون. | (أ) أكّد أن كل الاستعلامات داخل callback الـ `$transaction` تستخدم نفس `tx`. (ب) صحّح منطق `confirm`: التحقق الصحيح هو `stock_quantity >= quantity` (إعادة تحقق التوفّر الفعلي، mds/06 §3) وليس مقارنة بـ reserved فقط. (ج) أضف اختبار C تثبت أن اتصالين متزامنين فعلاً يتسلسلان (Testcontainers، موجود في الاختبار §2 — جيد). |
| R-2 | **ترتيب القفل لمنع deadlock: مذكور لكن غير مثبّت في كل المسارات** | قسم الباكند يرتّب `orderByVariantId` في `reserve`، لكن `confirm`/`release`/`restock` و`OrderStateMachine.transition` (التي تقفل `orders` ثم تقفل variants) **لا تضمن نفس ترتيب القفل عبر كل المسارات**. تأكيد + إلغاء متزامنان (C4) قد يقفلان `orders` و`variants` بترتيب مختلف. | افرض ترتيب قفل عام ثابت في **كل** المسارات: اقفل `orders` أولاً (بـ order id) ثم `product_variants` بترتيب `variant_id` تصاعدي دائماً. وثّق هذا كقاعدة معمارية ملزمة، وأضفه لاختبار C5 صراحةً. |
| R-3 | **إعادة التحقق من المخزون عند الانتقال من السلة (Redis) لا تعكس الحجز** | السلة في Redis تعرض التوفّر "عرضاً فقط". لكن لا يوجد منع لـ checkout متزامن لعدة عملاء على نفس الكمية قبل الوصول لـ `reserve()`. الحماية موجودة في reserve (جيد)، لكن **رسالة الخطأ للمستخدم بعد ملء كل خطوات الدفع تجربة سيئة**. | أضف فحص توفّر استباقي عند الدخول لـ `/checkout` (غير ملزم، فقط UX) + الفحص الملزم في reserve. هذا تحسين تجربة لا أمان. موثّق جزئياً (متجر §4) — يكفي. تحذير صغير. |
| R-4 | **النسخ الاحتياطي: اسم الـ volume في `backup.sh`** | `scripts/backup.sh` يستخدم `-v matjer_uploads_data:/data`. اسم الـ volume الفعلي = `${COMPOSE_PROJECT_NAME}_uploads_data` = `matjer_uploads_data` ✅ بشرط `name: matjer` في compose. لكن إن غاب `COMPOSE_PROJECT_NAME` أو اختلف، يفشل صامتاً. | اشتقّ اسم الـ volume من `docker compose` بدل التثبيت اليدوي: `docker compose run --rm` على حاوية مؤقتة، أو تحقّق من وجود الـ volume أولاً. خطر تشغيلي متوسط. |
| R-5 | **القرص 84% + Meilisearch + BullMQ + صور WebP متعددة الأحجام** ❗ | السيرفر متبقٍّ ~74GB وذاكرة محمّلة. الخطة تضيف: Meilisearch (فهرس + ذاكرة)، صور WebP بأحجام متعددة (تضخّم uploads volume)، BullMQ في Redis، سجلات. **mds/11 §10 يحذّر صراحةً.** لا توجد حدود حجم على uploads volume ولا تنبيه عند تضخّمه. | (أ) حدّد عدد أحجام WebP (مثلاً 3: thumb/card/full) لا أكثر. (ب) راقب حجم `uploads_data` في healthcheck (موجود فحص df عام — جيد). (ج) ضع سقف ذاكرة Meilisearch (موجود 512m — جيد). (د) فكّر في تأجيل Meilisearch لـ Postgres FTS إن ضاقت الموارد (بديل موثّق في التكاملات §4 — ممتاز). |
| R-6 | **Webhook الدفع: قراءة raw body مع global ValidationPipe/body-parser** | webhook التوقيع يحتاج raw body (`rawBody:true`)، لكن NestJS الافتراضي يحلّل JSON عالمياً. إن لم يُستثنَ مسار webhook من الـ body parser، **سيفشل التحقق من HMAC**. الخطة تذكر `rawBody:true` لكن لا تذكر استثناء المسار من ValidationPipe/parser العام. | أضف صراحةً: تكوين `bodyParser` لاستبقاء raw buffer على مسار `/api/webhooks/*` فقط (`rawBody` + `NestFactory.create(app, { rawBody: true })` + `express.raw()` للمسار)، وتخطّي ValidationPipe له. خطر صامت يكسر الدفع. |
| R-7 | **Idempotency للدفع: جدول `payment_events` غير مذكور في schema الرئيسي** | التكاملات تعرّف `payment_events(charge_id UNIQUE)` و`integration_logs` و`shipping_zones` و`push_subscriptions` كجداول جديدة، لكنها **غير مدرجة في قسم البيانات (2)** ولا في خارطة P1 (Prisma schema). خطر إغفالها عند بناء schema. | أدرج هذه الجداول الأربعة صراحةً في Prisma schema (P1/P4): `payment_events`, `integration_logs`, `shipping_zones`, `push_subscriptions`, إضافةً لحقول orders الجديدة (`payment_reference`, `payment_provider`, `tracking_number`, `shipping_carrier`, `shipping_label_url`). |
| R-8 | **حقول orders/users الإضافية موزّعة عبر الأقسام دون تجميع** | حقول مضافة على `orders` (payment_reference, payment_provider, tracking_number, shipping_carrier, shipping_label_url, tax_amount?, internal_notes?) و`users` (provider, provider_id, password_hash nullable, tfa_secret, tfa_enabled) — **مبعثرة عبر 4 أقسام**، وschema الرئيسي (mds/05) لا يحويها. خطر schema ناقص. | اجمع كل امتدادات schema (ما يتجاوز mds/05) في جدول واحد موحّد ضمن P1، مع وسم كل حقل بمصدره (mds أو مشتق تنفيذي). يمنع فوات حقول حرجة (مثل `tfa_secret` بدونه لا يعمل 2FA المثبّت في mds/10 §6). |
| R-9 | **تسجيل خروج عند الخمول + تنبيه جهاز جديد (mds/10 §6)** | mds/10 §6 ينص على "تسجيل خروج تلقائي عند الخمول" و"تنبيه عند دخول من جهاز/موقع جديد". المعماري يذكرهما عرضاً (`user_agent` في audit، rotation)، لكن **لا تنفيذ ملموس**: ما هي مدة الخمول؟ كيف يُكتشف الجهاز الجديد؟ | حدّد: idle timeout = انتهاء refresh أو inactivity TTL في Redis (مثلاً 30 دقيقة خمول للوحة الإدارة)؛ كشف الجهاز الجديد = مقارنة بصمة (user_agent+ip) مع جلسات سابقة في Redis/جدول → إشعار. مطلوب صراحةً في mds/10 §6 وغير مُنفّذ. |
| R-10 | **DDoS/WAF (mds/07) — الاعتماد الكامل على Cloudflare** | mds/07 يذكر "DDoS: جدار حماية + CDN". الخطة تعتمد Cloudflare edge (صحيح). لكن **النفق outbound فقط** — Cloudflare WAF يحمي الحافة، لكن لا حماية على مستوى التطبيق ضد طلبات تمر عبر النفق. rate limiting موجود (throttler) — جيد. | تأكيد تفعيل قواعد Cloudflare WAF/rate-limiting على مستوى الدومين (إعداد لوحة Cloudflare، خارج الكود) كطبقة أولى، مع throttler كطبقة ثانية. وثّق أنه إعداد تشغيلي مطلوب قبل الإطلاق. |
| R-11 | **`order_number` توليد فريد تحت تزامن** | الصيغة `MJ-2026-000123` تسلسلية. توليدها تحت طلبات متزامنة قد يُنتج تكراراً (race) إن اعتُمد `COUNT(*)+1`. | استخدم Postgres sequence مخصّص (`CREATE SEQUENCE`) أو `nextval` ذرّي لتوليد الجزء الرقمي، لا عدّ صفوف. خطر تكرار `order_number` (فريد) يفشل الإدراج. |
| R-12 | **استرجاع النسخة الاحتياطية: drill مذكور كمعيار لكن بلا runbook** | بوابة الإطلاق تتطلب "استُرجِعت بنجاح مرة" لكن لا runbook استرجاع فعلي (الأمر العكسي لـ pg_dump + استعادة uploads). | أضف `scripts/restore.sh` موثّق (gunzip + psql restore + untar uploads) واختبره مرة في staging. مذكور كمعيار قبول دون أداة. |
| R-13 | **Cloudflare caching يخدم صفحات ديناميكية بالخطأ** | path-split: كل ما عدا `/api`,`/uploads` → frontend. صفحات الحساب/السلة/الدفع ديناميكية (`no-store`) لكن Cloudflare قد يخزّنها افتراضياً على الحافة. | تأكّد من headers `Cache-Control: private, no-store` على مسارات `(account)/checkout/cart` + قاعدة Cloudflare Page Rule لاستثنائها من الكاش. خطر تسريب جلسة عبر كاش مشترك. حرج أمنياً. |
| R-14 | **`revalidate` webhook (frontend) أمنه** | `POST /api/revalidate` من الباكند للواجهة لتحديث ISR. إن لم يُحمَ بسرّ، يمكن لأي طرف إبطال الكاش (DoS). الخطة تذكر "بتوقيع سرّي" — جيد، لكن لا تفصيل. | ثبّت سرّ مشترك (`REVALIDATE_SECRET`) في `.env` يُتحقق منه في route handler، وتقييد المصدر (داخلي عبر شبكة Docker). موثّق اسمياً، يحتاج إدراج المتغير في `.env.example`. |

---

#### 4) ملاحظات أصغر (تحسينات سريعة)

- **mds/02** يذكر "Redux Toolkit / Zustand" — الخطة تختار Zustand وترفض Redux. قرار سليم وموثّق ✅.
- **mds/02** يذكر S3/Cloudinary للصور — الخطة تختار local volume/MinIO خلف Cloudflare (mds/11). انحراف مبرّر بقيود السيرفر ✅، لكن أقرّ صراحةً بالانحراف عن mds/02 §4.
- **CHECK constraints في Prisma**: قسم البيانات يقرّ بعدم دعمها تصريحياً ويضيفها بـ raw SQL في migration. صحيح ✅ — لكن تذكّر أن `prisma migrate dev` قد يولّد drift detection؛ استخدم `--create-only` ثم حرّر يدوياً.
- **`@@map` لكل النماذج**: قسم البيانات يطبّق snake_case عبر `@@map`/`@map` ✅ مطابق للقرار المثبّت.
- **اختبار RTL/a11y**: axe-core مذكور ✅. أضف اختبار snapshot للاتجاه `dir=rtl` فعلياً.
- **i18n-ready**: بنية `[locale]` مؤجّلة موثّقة ✅. تأكّد أن مسارات `(account)`/`(admin)` لن تحتاج إعادة هيكلة عند إضافتها لاحقاً.

---

#### الخلاصة

الخطة **عالية الجودة واكتمالها ~90%** وتصلح كـ blueprint تنفيذي بعد معالجة البنود الحرجة. الأولويات القصوى قبل بدء الكود:

1. **C-1** (توحيد بادئة API — يكسر كل النداءات إن أُهمل).
2. **C-10** (توحيد صيغة الصلاحيات `resource.action` — يكسر RBAC).
3. **R-1 + R-2** (صحة قفل المخزون وترتيب القفل — جوهر منع البيع المزدوج، أخطر بند في mds/08 §8).
4. **R-6 + R-7 + R-8** (raw body للـ webhook + الجداول/الحقول الناقصة في schema — تكسر الدفع و2FA و التكاملات صامتاً).
5. **R-13** (كاش Cloudflare للصفحات الخاصة — تسريب جلسة).
6. **C-2/C-3** (توحيد enums لاتينية + host القاعدة الداخلي).
7. الثغرات G2/G4/G5/G9 (sales_count/rating, الضرائب, العملة, تشفير الحقول الحساسة) — أقرّها صراحةً ولو بقرار "خارج النطاق".

البنود المتبقية تحسينات توثيقية. منطق المخزون/التزامن والأمان والنشر **مُغطّى بعمق يفوق المتوسط**، والتناقضات الموجودة كلها قابلة للإصلاح بتعديلات نصية محدودة دون إعادة تصميم.
