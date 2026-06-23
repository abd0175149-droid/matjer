# 11 — السيرفر وآلية النشر (Server & Deployment)

> هذا الملف يوثّق بيئة السيرفر الفعلية التي سيُنشَر عليها المشروع، والبرمجيات المتوفّرة، وآلية الرفع والنشر المتّبعة عملياً على هذا السيرفر. تمّ جمع هذه المعلومات بالاتصال المباشر بالسيرفر عبر SSH.

> **آخر تحديث:** 2026-06-24 — جُمعت المعلومات من السيرفر مباشرة (snapshot وقت الإعداد، قابل للتغيّر).

---

## 1. معلومات السيرفر (Server Overview)

| البند | القيمة |
|-------|--------|
| **اسم الاتصال (SSH alias)** | `mafia-prod` |
| **العنوان (Host)** | `192.168.100.147` (شبكة محلية LAN) |
| **المستخدم** | `sysadmin` |
| **منفذ SSH** | 22 (الافتراضي) |
| **المصادقة** | مفتاح SSH: `~/.ssh/id_ed25519_mafia` (بدون كلمة مرور) |
| **اسم المضيف (Hostname)** | `sysadmin-Inspiron-3593` |
| **نظام التشغيل** | Ubuntu 24.04.4 LTS (Noble Numbat) |
| **النواة (Kernel)** | 6.17.0-20-generic |
| **المعالج** | Intel Core i7-1065G7 — 8 أنوية |
| **الذاكرة (RAM)** | 15 GiB (+ 6 GiB Swap) |
| **القرص** | 468 GB NVMe — **مستخدم 84% (متبقٍّ ~74 GB)** ⚠️ |
| **المنطقة الزمنية** | Asia/Amman (+03) |
| **اللغة** | en_US.UTF-8 |

> **ملاحظة مهمة:** السيرفر هو جهاز Dell Inspiron 3593 يعمل كخادم منزلي/مكتبي على الشبكة المحلية، وليس خادماً سحابياً. الوصول عبر SSH يتم من داخل الشبكة المحلية (`192.168.100.0/24`). الدومينات العامة تُوجَّه عبر Cloudflare ثم CloudPanel إلى الحاويات (انظر القسم 4).

### الاتصال
```bash
ssh mafia-prod          # يستخدم الإعداد المعرّف في ~/.ssh/config
# أو صراحةً:
ssh -i ~/.ssh/id_ed25519_mafia sysadmin@192.168.100.147
```

### صلاحيات المستخدم
- `sysadmin` عضو في مجموعة `sudo` — لكن **sudo يتطلّب كلمة مرور** (ليس passwordless).
- `sysadmin` عضو في مجموعة `docker` — لذا أوامر `docker` و`docker compose` تعمل **بدون sudo**.

---

## 2. البرمجيات المتوفّرة على السيرفر (Installed Stack)

| الأداة | الإصدار | الاستخدام لمشروعنا |
|--------|---------|---------------------|
| **Docker** | 29.4.0 | تشغيل كل خدمات المشروع في حاويات ✅ |
| **Docker Compose** | v5.1.2 (plugin: `docker compose`) | تنسيق الحاويات ✅ |
| **Node.js** | v20.20.2 | بناء/تشغيل الباكند والواجهة ✅ |
| **npm** | 10.8.2 | إدارة الحزم ✅ |
| **PostgreSQL (client)** | 16.13 | عميل psql (القاعدة نفسها تعمل كحاوية) ✅ |
| **Redis (client)** | 7.0.15 | عميل redis-cli (Redis يعمل كحاوية) ✅ |
| **nginx (نظامي)** | 1.28.0 | غير مستخدم مباشرة (CloudPanel يدير الـ proxy) |
| **CloudPanel** | 6.0.8 (`clpctl`) | إدارة الدومينات + reverse proxy + شهادات SSL ✅ |
| PHP | 8.4 (+ fpm متعددة) | غير مطلوب لمشروعنا |
| Python | 3.12.3 | متاح عند الحاجة لسكربتات |
| Java | openjdk 21 | غير مطلوب |
| MySQL/Percona | 8.4 (نظامي) | غير مطلوب (نستخدم PostgreSQL) |

> غير مثبّت: `pnpm`، `yarn`، `bun`، `certbot` (الشهادات تُدار عبر CloudPanel/Cloudflare). نعتمد **npm** كمدير حزم.

---

## 3. ما يعمل حالياً على السيرفر (Context — مشاريع أخرى)

السيرفر مشترك ويشغّل عدة مشاريع عبر Docker. أبرزها للسياق وتجنّب تعارض المنافذ:

- **`mafia-prod`** و **`mafia-staging`** — Next.js + NestJS + Postgres + Redis (قالبنا المرجعي).
- **`howplatform`** (عدة حاويات PHP)، **`nuskJO`/`nusuk`**، **`bgame`**، **`SchoolOS`**، **`ofoq`**، **`shalmoneh`**، **`AlSeddeeqScout`** (scout).
- خدمات مساعدة: **n8n** (أتمتة)، **ClickHouse + Kafka** (تحليلات)، **Jellyfin**، **Seafile**، **phpMyAdmin**.

> **خلاصة:** السيرفر ممتلئ نسبياً (84% قرص، 8.3GB RAM مستخدمة). يجب اختيار منافذ غير مستخدمة لمشروعنا (انظر القسم 5)، ومراقبة استهلاك الموارد بعد النشر.

---

## 4. معمارية النشر المعتمدة (Deployment Architecture)

النمط المتّبع على هذا السيرفر (والمطبّق في `mafia-prod` المطابق لستاكنا) هو:

```
                الإنترنت
                   │
            ┌──────▼──────┐
            │  Cloudflare │  (DNS + Proxy + WAF + SSL طرفي)
            └──────┬──────┘
                   │  *.grade.sbs
            ┌──────▼───────────────┐
            │  CloudPanel (nginx)   │  reverse proxy + Let's Encrypt
            │  domain → :FRONTEND   │
            └──────┬───────────────┘
                   │ http://127.0.0.1:<FRONTEND_PORT>
        ┌──────────▼───────────────────────────────┐
        │      Docker Compose (مشروع matjer)         │
        │                                            │
        │  frontend (Next.js)  ──►  backend (NestJS) │
        │     :FRONTEND_PORT          :BACKEND_PORT  │
        │                              │      │      │
        │                       ┌──────▼─┐ ┌──▼────┐ │
        │                       │postgres│ │ redis │ │
        │                       │(LAN  )│ │(LAN  )│ │  ← منفذان مربوطان بـ 127.0.0.1 فقط
        │                       └────────┘ └───────┘ │
        └────────────────────────────────────────────┘
```

**المبادئ:**
1. كل المشروع داخل حاويات Docker تُدار بـ `docker compose`.
2. **قاعدة البيانات و Redis تُنشَر على `127.0.0.1` فقط** (لا تُكشف خارجياً إطلاقاً).
3. الواجهة والباكند يُنشران على منافذ المضيف، ثم **CloudPanel** يوجّه الدومين إلى منفذ الواجهة.
4. الواجهة (Next.js) تتصل بالباكند داخلياً عبر شبكة Docker (`http://backend:<port>`)، لا عبر الإنترنت.
5. الدومينات خلف **Cloudflare** (شهادة SSL طرفية + حماية)، وCloudPanel يدير الشهادة على مستوى الأصل.
6. **الأسرار خارج Git** دائماً (`.env`، مفاتيح الخدمات).

> **الدومين المقترح للمشروع:** `matjer.grade.sbs` (أو نطاق يحدّده المالك) — يُضاف كموقع reverse-proxy في CloudPanel يشير إلى منفذ الواجهة. يتطلّب إضافة سجل DNS في Cloudflare.

---

## 5. تخصيص المنافذ لمشروع matjer (Port Allocation)

المنافذ التالية مختارة بعد فحص كل المنافذ المستخدمة على السيرفر، وهي **حرّة** ولا تتعارض مع أي مشروع قائم:

| الخدمة | المتغيّر | المنفذ المقترح | الكشف |
|--------|----------|----------------|-------|
| الواجهة (Next.js) | `FRONTEND_PORT` | **3020** | منفذ المضيف (يوجّهه CloudPanel) |
| الباكند (NestJS) | `BACKEND_PORT` | **4002** | منفذ المضيف |
| قاعدة البيانات (Postgres) | `DB_PORT` | **5436** | `127.0.0.1` فقط 🔒 |
| Redis | `REDIS_PORT` | **6383** | `127.0.0.1` فقط 🔒 |
| اسم مشروع compose | `COMPOSE_PROJECT_NAME` | **matjer** | — |

> منافذ مشغولة يجب تجنّبها (للمرجع): 3000، 3010، 3050، 4000، 4001، 4010، 4020، 4040، 4050، 4060، 4070، 5432–5435، 6379–6382، 8000، 8080، 8082، 8096، 8123. تحقّق دائماً قبل النشر بـ `docker ps` و`ss -tlnH`.

---

## 6. الهيكل المقترح للمشروع على السيرفر (Project Layout)

اتباعاً للنمط المعتمد، يُستنسَخ المستودع تحت `/home/sysadmin/`:

```
/home/sysadmin/matjer/
├── backend/                 # NestJS API
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Next.js storefront + لوحة ERP
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # تنسيق الإنتاج
├── docker-compose.dev.yml   # تنسيق التطوير (اختياري)
├── deploy.sh                # سكربت النشر
├── .env                     # القيم الفعلية (خارج Git) 🔒
├── .env.example             # قالب القيم (داخل Git)
├── .gitignore
└── mds/                     # التوثيق (هذا المجلد)
```

### قالب `docker-compose.yml` (مبني على نمط mafia-prod)

```yaml
services:
  database:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: matjer_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "127.0.0.1:${DB_PORT}:5432"   # 🔒 محلي فقط
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine
    restart: always
    ports:
      - "127.0.0.1:${REDIS_PORT}:6379"   # 🔒 محلي فقط
    volumes:
      - redis_data:/data

  backend:
    build: { context: ./backend, dockerfile: Dockerfile }
    restart: always
    environment:
      - PORT=${BACKEND_PORT}
      - DATABASE_URL=postgresql://matjer_user:${DB_PASSWORD}@database:5432/${DB_NAME}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"
    depends_on: [database, redis]
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - BACKEND_URL=http://backend:${BACKEND_PORT}
    restart: always
    environment:
      - PORT=${FRONTEND_PORT}
      - BACKEND_URL=http://backend:${BACKEND_PORT}
      - HOSTNAME=0.0.0.0
    ports:
      - "${FRONTEND_PORT}:${FRONTEND_PORT}"
    depends_on: [backend]

volumes:
  db_data:
  redis_data:
  uploads_data:
```

### قالب `.env.example`

```env
COMPOSE_PROJECT_NAME=matjer
FRONTEND_PORT=3020
BACKEND_PORT=4002
DB_PORT=5436
REDIS_PORT=6383
DB_NAME=matjer_db
DB_PASSWORD=change_me_strong_password
JWT_SECRET=change_me_long_random_secret
```

> الملف الفعلي `.env` يحوي القيم الحقيقية ويُستثنى من Git. تُولَّد كلمات المرور والأسرار بقيم قوية على السيرفر.

---

## 7. آلية الرفع والنشر (Deployment Workflow)

### أ. الرفع من جهاز التطوير إلى GitHub
العمل يتم محلياً ثم يُرفع إلى المستودع (انظر القسم 8)، ثم يُسحب على السيرفر.

### ب. أول نشر على السيرفر (Initial Deploy)
```bash
ssh mafia-prod
cd /home/sysadmin
git clone https://github.com/abd0175149-droid/matjer.git
cd matjer
cp .env.example .env
nano .env                       # ضع القيم الفعلية (منافذ + أسرار)
docker compose build
docker compose up -d
docker compose ps               # تحقّق من تشغيل الخدمات
```
ثم في CloudPanel: إنشاء موقع **Reverse Proxy** للدومين `matjer.grade.sbs` يشير إلى `http://127.0.0.1:3020`، وإصدار شهادة SSL.

### ج. التحديثات اللاحقة — سكربت `deploy.sh`
نمط السكربت المعتمد على السيرفر (مبني على `mafia-prod/deploy.sh`):
```bash
#!/bin/bash
set -e
echo "1️⃣  سحب آخر تحديثات الكود..."
git pull origin main

if [ ! -f .env ]; then
  echo "⚠️  لا يوجد .env — انسخ من .env.example واضبط القيم ثم أعد التشغيل"
  cp .env.example .env
  exit 1
fi

echo "2️⃣  بناء الحاويات الجديدة..."
docker compose build --no-cache

echo "3️⃣  استبدال الحاويات (توقف أدنى)..."
docker compose up -d --force-recreate

echo "4️⃣  ترحيلات قاعدة البيانات..."
sleep 5
docker compose exec -T backend npm run migration:run || true

echo "5️⃣  تنظيف الصور القديمة..."
docker image prune -f

echo "6️⃣  التحقق..."
docker compose ps
echo "✅ تم النشر — https://matjer.grade.sbs"
```
الاستخدام:
```bash
cd /home/sysadmin/matjer && ./deploy.sh
```

### د. أوامر تشغيل مفيدة
```bash
docker compose logs -f backend          # متابعة سجلات الباكند
docker compose logs -f frontend         # متابعة سجلات الواجهة
docker compose restart backend          # إعادة تشغيل خدمة
docker compose down                     # إيقاف الكل (يبقي الـ volumes)
docker compose exec database psql -U matjer_user -d matjer_db   # دخول القاعدة
```

---

## 8. مستودع GitHub (Repository)

| البند | القيمة |
|-------|--------|
| **الرابط** | https://github.com/abd0175149-droid/matjer |
| **المالك** | `abd0175149-droid` |
| **الفرع الرئيسي** | `main` |
| **بيانات الاعتماد** | محفوظة في Windows Credential Manager (HTTPS) — الرفع لا يتطلّب إدخال يدوي |

### سير العمل
```bash
# في جهاز التطوير
git add .
git commit -m "وصف التعديل"
git push origin main

# على السيرفر بعد الرفع
ssh mafia-prod 'cd /home/sysadmin/matjer && ./deploy.sh'
```

> **مرجع:** المشروع الشقيق `mafia-prod` يُنشَر من مستودع `abd0175149-droid/new-mafia` بنفس هذا النمط، ويعمل حالياً على `https://club-mafia.grade.sbs`.

---

## 9. الأمان والنسخ الاحتياطي (Security & Backups)

### الأمان
- قاعدة البيانات و Redis **لا يُكشفان خارجياً** (ربط `127.0.0.1` فقط).
- كل الأسرار في `.env` خارج Git (مدرجة في `.gitignore`).
- SSL عبر Cloudflare + CloudPanel (HTTPS إلزامي).
- مفتاح SSH فقط للوصول (لا كلمات مرور).
- (مطلوب لاحقاً) تفعيل جدار ufw وفتح المنافذ الضرورية فقط.

### النسخ الاحتياطي (نمط معتمد على السيرفر)
نمط أخذ نسخة من قاعدة البيانات قبل أي تغيير كبير (مطبّق في مشاريع أخرى على السيرفر):
```bash
docker compose exec -T database pg_dump -U matjer_user matjer_db \
  | gzip > ~/matjer_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```
> يُوصى بجدولة نسخ يومي تلقائي (cron) ونقلها خارج السيرفر (السيرفر ليس سحابياً والقرص ممتلئ 84%).

---

## 10. قيود ومخاطر يجب الانتباه لها

| القيد | التأثير | التخفيف |
|-------|---------|---------|
| القرص ممتلئ 84% (~74GB متبقٍّ) | قد يفشل البناء/النسخ | تنظيف صور Docker دورياً `docker system prune`؛ مراقبة المساحة |
| الذاكرة محمّلة (8.3/15GB + Swap 5.2/6GB) | بطء عند الذروة | تخفيف بناء `--no-cache`؛ مراقبة الموارد |
| السيرفر منزلي على LAN | لا توفّر سحابي (انقطاع كهرباء/إنترنت) | نسخ احتياطي خارجي؛ خطة ترحيل لسحابة عند التوسّع |
| sudo يتطلّب كلمة مرور | عمليات النظام تحتاج تدخّل يدوي | Docker يعمل بدون sudo؛ معظم النشر لا يحتاج sudo |
| منافذ مشتركة مع مشاريع أخرى | تعارض محتمل | التزام المنافذ المخصّصة (القسم 5) والتحقق قبل النشر |
