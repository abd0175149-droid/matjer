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

> **ملاحظة مهمة:** السيرفر هو جهاز Dell Inspiron 3593 يعمل كخادم منزلي/مكتبي على الشبكة المحلية، وليس خادماً سحابياً، **وليس له IP عام ولا port-forwarding**. الوصول عبر SSH يتم من داخل الشبكة المحلية (`192.168.100.0/24`). أمّا الوصول العام من الإنترنت فيتم بالكامل عبر **Cloudflare Tunnel** (انظر القسم 4) — لا منافذ مفتوحة على الراوتر.

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
| **cloudflared** | 2026.1.2 | **بوابة الوصول العام — Cloudflare Tunnel** ✅ (انظر القسم 4) |
| **nginx (نظامي)** | 1.28.0 | غير مستخدم في مسار طلبات مشروعنا |
| **CloudPanel** | 6.0.8 (`clpctl`) | لوحة إدارة (مكشوفة عبر `panel.grade.sbs`) — ليست في مسار طلبات الحاويات |
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

## 4. معمارية النشر والوصول العام عبر Cloudflare Tunnel

> ⚠️ **نقطة جوهرية:** بما أنّ السيرفر منزلي بلا IP عام، **كل** الوصول من الإنترنت يمرّ عبر **Cloudflare Tunnel** واحد. لا يوجد reverse proxy على مستوى الأصل (nginx/CloudPanel) في مسار طلبات المشروع، ولا منافذ مفتوحة على الراوتر. الخدمة `cloudflared` تفتح اتصالاً **صادراً** (outbound) إلى شبكة Cloudflare، وتستقبل الطلبات منها وتوصّلها إلى المنافذ المحلية `127.0.0.1`.

### 4.1 مخطّط مسار الطلب
```
        الإنترنت (المستخدم)
              │  https://matjer.grade.sbs
        ┌─────▼──────────────────────────────┐
        │   Cloudflare Edge                   │  SSL طرفي + WAF + DNS
        │   (DNS: CNAME → <tunnel>.cfargotunnel.com)
        └─────┬──────────────────────────────┘
              │  نفق آمن (QUIC/HTTP2) — اتصال صادر من السيرفر
        ┌─────▼──────────────────────────────┐
        │   cloudflared (systemd service)     │  على السيرفر
        │   /etc/cloudflared/config.yml       │  ← قواعد ingress (hostname/path → port)
        └─────┬──────────────────────────────┘
              │  http://127.0.0.1:<PORT>   (حسب القاعدة المطابقة)
   ┌──────────▼──────────────────────────────────┐
   │     Docker Compose (مشروع matjer)             │
   │                                               │
   │   /api/*  /uploads/*  ──►  backend  :4002     │
   │   كل ما عدا ذلك       ──►  frontend :3020     │
   │                              │                │
   │   backend ──► database :5436 / redis :6383    │  (شبكة Docker الداخلية)
   └───────────────────────────────────────────────┘
```

### 4.2 النفق الموجود على السيرفر
| البند | القيمة |
|-------|--------|
| **اسم النفق** | `cloudpanel-tunnel` |
| **معرّف النفق (Tunnel ID)** | `b8f315ec-a311-4b7a-8891-7b9e37a43f73` |
| **التشغيل** | خدمة systemd: `cloudflared.service` (مفعّلة، `Restart=on-failure`) |
| **الأمر** | `cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run` |
| **ملف الإعداد (ingress)** | `/etc/cloudflared/config.yml` (مالكه root → تعديله يحتاج sudo) |
| **ملف اعتماد النفق** 🔒 | `/home/sysadmin/.cloudflared/b8f315ec-...json` (سرّي، صلاحية 0400) |
| **شهادة الحساب** 🔒 | `/home/sysadmin/.cloudflared/cert.pem` (تُستخدم لإدارة DNS routes) |

> **نفق واحد مشترك** يخدم كل مشاريع السيرفر (mafia، club-mafia، howplatform، shalamoneh، CloudPanel نفسه…). إضافة مشروعنا = إضافة قواعد ingress جديدة لنفس النفق، لا إنشاء نفق منفصل.

### 4.3 كيف تُعرّف قواعد التوجيه (Ingress) — نمطان مستخدمان فعلياً
ملف `config.yml` قائمة قواعد تُطابَق **بالترتيب من الأعلى**، وآخر قاعدة دائماً `http_status:404`. هناك نمطان قائمان على السيرفر:

**النمط (أ) — توجيه حسب المسار (path-based)** — مستخدم في `mafia.grade.sbs`، وهو **الموصى به لمشروعنا** لأنّ الباكند (NestJS) منفصل:
```yaml
  - hostname: matjer.grade.sbs
    path: /api/.*
    service: http://127.0.0.1:4002      # backend
  - hostname: matjer.grade.sbs
    path: /uploads/.*
    service: http://127.0.0.1:4002      # backend (الملفات المرفوعة)
  - hostname: matjer.grade.sbs
    service: http://127.0.0.1:3020      # frontend (كل ما عدا ذلك)
```

**النمط (ب) — قاعدة واحدة للواجهة** — مستخدم في `club-mafia.grade.sbs → 127.0.0.1:3010`؛ تصلح إذا كانت الواجهة (Next.js) نفسها توكّل `/api` للباكند داخلياً عبر rewrites/proxy:
```yaml
  - hostname: matjer.grade.sbs
    service: http://127.0.0.1:3020      # frontend فقط
```

### 4.4 خطوات ربط مشروع matjer بالنفق (مرة واحدة)
1. **اختر منافذ حرّة** للخدمات (انظر القسم 5) وتأكّد أنّ cloudflared سيصلها على `127.0.0.1`.
2. **أنشئ سجل DNS** يربط الدومين بالنفق (يستخدم `cert.pem`):
   ```bash
   cloudflared tunnel route dns cloudpanel-tunnel matjer.grade.sbs
   ```
   هذا ينشئ CNAME مُوكّلاً (proxied) `matjer.grade.sbs → b8f315ec-...cfargotunnel.com` في Cloudflare.
3. **أضف قواعد ingress** لمشروعنا في `/etc/cloudflared/config.yml` **قبل** قاعدة `- service: http_status:404` الأخيرة (يتطلّب sudo):
   ```bash
   sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak.$(date +%F)   # نسخة احتياطية أولاً
   sudo nano /etc/cloudflared/config.yml                                            # أضف كتلة matjer (النمط أ)
   ```
4. **أعد تشغيل الخدمة** لتطبيق التغيير:
   ```bash
   sudo systemctl restart cloudflared
   sudo systemctl status cloudflared --no-pager        # تأكّد أنّها active
   journalctl -u cloudflared -f                         # متابعة السجلات والتحقق من التوجيه
   ```

### 4.5 مبادئ مهمة
1. **SSL يُنهى عند حافة Cloudflare** — لا حاجة لشهادات على السيرفر للمشروع (HTTPS مجاني وتلقائي عبر الدومين).
2. **لا منافذ مكشوفة خارجياً** — cloudflared يصل الخدمات عبر `127.0.0.1` فقط؛ لذا نربط حتى الواجهة والباكند بـ `127.0.0.1` في docker-compose (انظر القسم 6).
3. **WebSocket مدعوم** عبر النفق (يُستخدم فعلياً في socket.io لمشاريع أخرى) — مفيد لتحديثات لحظية مستقبلية.
4. **النفق نقطة فشل مشتركة** — أي خطأ في `config.yml` قد يؤثّر على كل المشاريع؛ خُذ نسخة احتياطية قبل أي تعديل (النمط متّبع: ملفات `config.yml.bak.*` موجودة على السيرفر).
5. **الأسرار خارج Git** دائماً: ملف اعتماد النفق و`cert.pem` و`.env` لا تُرفع إطلاقاً.

> **الدومين المقترح:** `matjer.grade.sbs` (نطاق `grade.sbs` مُدار في Cloudflare ويُستخدم لباقي المشاريع). يمكن للمالك اختيار نطاق آخر؛ الخطوات نفسها.

---

## 5. تخصيص المنافذ لمشروع matjer (Port Allocation)

المنافذ التالية مختارة بعد فحص كل المنافذ المستخدمة على السيرفر، وهي **حرّة** ولا تتعارض مع أي مشروع قائم:

| الخدمة | المتغيّر | المنفذ المقترح | الكشف |
|--------|----------|----------------|-------|
| الواجهة (Next.js) | `FRONTEND_PORT` | **3020** | `127.0.0.1` فقط 🔒 (يصله cloudflared) |
| الباكند (NestJS) | `BACKEND_PORT` | **4002** | `127.0.0.1` فقط 🔒 (يصله cloudflared لمسار `/api`) |
| قاعدة البيانات (Postgres) | `DB_PORT` | **5436** | `127.0.0.1` فقط 🔒 |
| Redis | `REDIS_PORT` | **6383** | `127.0.0.1` فقط 🔒 |
| اسم مشروع compose | `COMPOSE_PROJECT_NAME` | **matjer** | — |

> مع Cloudflare Tunnel **لا يلزم كشف أي منفذ خارجياً** — كل المنافذ مربوطة بـ `127.0.0.1`، وcloudflared (يعمل على نفس المضيف) يصلها محلياً وينقل الطلبات من/إلى الإنترنت عبر النفق.

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
      - "127.0.0.1:${BACKEND_PORT}:${BACKEND_PORT}"   # 🔒 يصله cloudflared محلياً فقط
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
      - "127.0.0.1:${FRONTEND_PORT}:${FRONTEND_PORT}"   # 🔒 يصله cloudflared محلياً فقط
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
ثم اربط الدومين بالنفق (مرة واحدة — انظر تفاصيل القسم 4.4):
```bash
cloudflared tunnel route dns cloudpanel-tunnel matjer.grade.sbs   # إنشاء DNS CNAME
sudo nano /etc/cloudflared/config.yml      # أضف قواعد ingress لـ matjer (قبل قاعدة 404)
sudo systemctl restart cloudflared         # تطبيق التوجيه
```
لا حاجة لإصدار شهادة SSL يدوياً — تُنهى تلقائياً عند حافة Cloudflare.

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
- **كل خدمات المشروع مربوطة بـ `127.0.0.1`** (واجهة، باكند، قاعدة، Redis) — لا شيء مكشوف على LAN أو الإنترنت مباشرةً.
- الوصول العام **حصراً عبر Cloudflare Tunnel** (لا منافذ مفتوحة على الراوتر، لا IP عام) + حماية Cloudflare (WAF/DDoS) على الحافة.
- SSL يُنهى تلقائياً عند **حافة Cloudflare** (HTTPS إلزامي) — لا شهادات تُدار على السيرفر للمشروع.
- كل الأسرار في `.env` + ملف اعتماد النفق + `cert.pem` خارج Git (مدرجة في `.gitignore`).
- مفتاح SSH فقط للوصول (لا كلمات مرور).
- تعديل `/etc/cloudflared/config.yml` يحتاج sudo + نسخة احتياطية (نقطة فشل مشتركة لكل المشاريع).

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
| النفق مشترك لكل المشاريع | خطأ في `config.yml` يعطّل الجميع | نسخة احتياطية قبل كل تعديل؛ التحقق بـ `journalctl -u cloudflared` بعد الإعادة |
| النفق يعتمد على cloudflared + Cloudflare | تعطّل الخدمة = انقطاع الوصول العام | `Restart=on-failure` مفعّل؛ مراقبة حالة الخدمة |
| sudo يتطلّب كلمة مرور | عمليات النظام (تعديل النفق) تحتاج تدخّل يدوي | Docker يعمل بدون sudo؛ النشر نفسه لا يحتاج sudo |
| منافذ مشتركة مع مشاريع أخرى | تعارض محتمل | التزام المنافذ المخصّصة (القسم 5) والتحقق قبل النشر |

---

## 11. النشر الفعلي لـ matjer — حالة وتصحيحات (2026-06-24)

> المشروع **منشور ويعمل** على **https://sooq.grade.sbs**. هذا القسم يوثّق الواقع الفعلي وتصحيحاً مهمّاً لطريقة إدارة النفق.

### 11.1 ⚠️ تصحيح جوهري: النفق **مُدار عن بُعد** (Dashboard/API) وليس عبر `config.yml`
خلافاً لِما ورد في القسم 4، تبيّن عملياً أنّ ingress النفق `cloudpanel-tunnel` **مُدار من لوحة Cloudflare (remotely-managed)**:
- ملف `/etc/cloudflared/config.yml` المحلي **يُتجاهَل** — cloudflared يجلب الإعداد من Cloudflare (لاحظ حقول `"id"` في الإعداد المُحمّل، ووجود مضيفات live غير موجودة في الملف المحلي مثل `scout/nusuk/ssh.grade.sbs`).
- **النتيجة:** تعديل `config.yml` + `systemctl restart cloudflared` **لا يضيف مضيفاً**. الإضافة تتم عبر **Cloudflare API** أو **لوحة Zero Trust**.

### 11.2 الطريقة الصحيحة لإضافة مضيف (hostname) للنفق
**أ. عبر API (المتّبع لـ matjer):**
```
# 1) سجل DNS (يعمل بدون sudo، يستخدم ~/.cloudflared/cert.pem)
cloudflared tunnel route dns cloudpanel-tunnel sooq.grade.sbs

# 2) أضف القاعدة لإعداد النفق البعيد (توكن: Account · Cloudflare Tunnel · Edit)
#    GET ثم PUT على configurations مع إبقاء كل القواعد + إدراج الجديدة قبل http_status:404
GET/PUT https://api.cloudflare.com/client/v4/accounts/053ea85894ec4be0cd2d5c44e2b9c961/cfd_tunnel/b8f315ec-.../configurations
```
**ب. عبر اللوحة:** Zero Trust → Networks → Tunnels → `cloudpanel-tunnel` → Public Hostnames → Add.

> account-id: `053ea85894ec4be0cd2d5c44e2b9c961` · tunnel-id: `b8f315ec-a311-4b7a-8891-7b9e37a43f73`.

### 11.3 قاعدة واحدة بدل path-split (تبسيط)
الواجهة (Next.js) تُوكّل `/api` و`/uploads` للباكند داخلياً عبر `rewrites` في `next.config.mjs`. لذا يحتاج النفق **قاعدة واحدة فقط**:
```
sooq.grade.sbs  →  http://localhost:3020   (frontend؛ وهي توكّل /api للباكند)
```

### 11.4 ملخّص بيئة matjer الحيّة
| البند | القيمة |
|-------|--------|
| الدومين | https://sooq.grade.sbs |
| المسار | `/home/sysadmin/matjer` (git: origin/main) |
| الحاويات | matjer-{frontend,backend,database,redis} (كلها 127.0.0.1) |
| المنافذ | frontend 3020 · backend 4002 · postgres 5436 · redis 6383 |
| لوحة الإدارة | https://sooq.grade.sbs/admin (الحساب الأولي: `admin@sooq.grade.sbs`) |
| الأسرار | `/home/sysadmin/matjer/.env` (mode 600، خارج Git) |
| التحديث | `cd /home/sysadmin/matjer && ./deploy.sh` (git pull → build → up → seed) |
