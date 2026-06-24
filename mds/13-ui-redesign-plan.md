# 13 — خطة إعادة تصميم واجهة المتجر (UI Redesign Plan)

> خطة شاملة لترقية تصميم واجهة المستخدم لمتجر الذهب الفاخر (Next.js 14, RTL عربي) بأنيميشن وتفاعلات حديثة وقدرة تخصيص عالية، مع الحفاظ على الأداء (Lighthouse > 90) والوصولية. بُنيت اعتماداً على بحث إنترنت محدّث (2025–2026) — المصادر في القسم 10.

> **آخر تحديث:** 2026-06-24 · **الحالة:** مقترح بانتظار الموافقة قبل التنفيذ.

---

## 1. الفلسفة والمبادئ

المتجر يبيع **ذهباً تقليدياً فاخراً** → لغة التصميم يجب أن تعكس: **الفخامة بالحد الأدنى (Luxury Minimalism)**. القاعدة الذهبية من البحث: *«الفخامة هي ضبط النفس» — أنيميشن هادف لا مبالغة*.

**مبادئ ملزِمة:**
1. **مساحات بيضاء سخيّة** (40–60% من الصفحة) — تمنح إحساس الحصرية وتدع المنتج يتصدّر.
2. **حركة هادفة** — كل أنيميشن يخدم وضوحاً أو بهجة، ويحترم `prefers-reduced-motion`.
3. **الأداء غير قابل للتفاوض** — Lighthouse > 90، LCP سريع، لا أنيميشن يُبطئ الصفحة.
4. **RTL أصيل** — خصائص منطقية (`ps/pe/ms/me/start/end`) لا فيزيائية، فلا حاجة لقلب يدوي.
5. **تخصيص عالٍ** — كل شيء عبر design tokens (CSS variables)، وثيمات قابلة للتبديل وقت التشغيل.
6. **اتساق** — نظام مكوّنات واحد، مقياس طباعة ومسافات وزوايا وظلال موحّد.

---

## 2. الستاك المختار (نتيجة البحث)

| الطبقة | الأداة | السبب (مختصر) | البديل/ملاحظة |
|--------|--------|----------------|----------------|
| **الأساس** | **Tailwind CSS v4** | `@theme` CSS-first، ألوان OKLCH، خصائص منطقية RTL، بناء أسرع 5×، حزم أصغر | البقاء على v3.4 + CSS vars ممكن كخطة بديلة |
| **المكوّنات** | **shadcn/ui** (Radix/Base UI) | RTL-first (يناير 2026)، theming عبر CSS variables، ملكية الكود (copy-paste)، وصولية | Meraki UI (RTL جاهز) كبديل |
| **الأنيميشن الأساسي** | **Motion (Framer Motion v12)** | الأسرع (2.5–6× من GSAP)، tree-shakable (~2.6–18KB)، RTL سلس، layout/gestures | — |
| **انتقالات الصفحات** | **Next.js View Transitions API** | morph عناصر مشتركة (مصغّر→بطل) بلا تكلفة JS، RTL أصيل | تحسين تدريجي (fallback حيث لا يُدعم) |
| **الهيرو السينمائي فقط** | **GSAP ScrollTrigger + Lenis** | سرد بصري متقدّم في الصفحة الرئيسية فقط (محجوز لتجنّب الوزن) | اختياري — قد نكتفي بـ Motion + CSS scroll |
| **معرض المنتج** | **Embla Carousel** (~7KB) + zoom | أخف 6× من Swiper، SSR-friendly، تحكّم كامل بـ Tailwind | PhotoSwipe للتكبير |
| **الثيمات وقت التشغيل** | **next-themes** | تبديل (ذهبي/بلاتيني/وردي) + Dark mode حسب نظام المستخدم | — |
| **الطباعة** | **next/font + Tajawal (variable)** + خط لاتيني مكمّل | هندسي عصري فاخر، CLS آمن، self-hosted | Almarai/IBM Plex Arabic/Cairo بدائل |
| **الأيقونات** | **lucide-react** | متّسق مع shadcn، خفيف | — |

> **قرار مهم:** Tailwind v4 ترقية جوهرية. التوصية: اعتمادها كهدف (القسم 9 يفصّل خطوات الترحيل الآمن)، مع إبقاء v3.4 كخطة طوارئ إن ظهرت مخاطر، لأن **نظام الـ tokens/الثيمات يعمل على v3 أيضاً**.

---

## 3. نظام التصميم (Design System / Tokens)

كل القيم تُعرَّف كـ **CSS variables** (OKLCH للألوان) لتمكين التخصيص والثيمات. مثال مقترح:

```css
/* globals.css — @theme (Tailwind v4) أو :root (v3) */
:root {
  /* الألوان — OKLCH (إدراك لوني موحّد) */
  --background: oklch(0.99 0.005 95);   /* عاجي ناعم */
  --foreground: oklch(0.20 0.02 60);    /* حبري دافئ */
  --gold:       oklch(0.78 0.12 85);    /* ذهب أساسي */
  --gold-deep:  oklch(0.62 0.13 80);    /* ذهب غامق (hover) */
  --gold-soft:  oklch(0.90 0.06 90);    /* ذهب فاتح (خلفيات) */
  --ink:        oklch(0.18 0.01 60);    /* أسود فاخر */
  --muted:      oklch(0.55 0.02 70);
  --card:       oklch(1 0 0);
  --border:     oklch(0.90 0.01 80);
  --success:    oklch(0.62 0.14 150);
  --danger:     oklch(0.58 0.18 25);
  --ring:       var(--gold);

  /* الطباعة */
  --font-sans: 'Tajawal', system-ui, sans-serif;
  --font-display: 'Tajawal', serif; /* أو خط display فاخر للعناوين */

  /* الزوايا والظلال والمسافات */
  --radius: 1rem;            /* 16px — bento/cards */
  --radius-sm: 0.5rem;
  --shadow-luxe: 0 8px 30px -12px oklch(0.62 0.13 80 / 0.25);

  /* الحركة */
  --ease-luxe: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 150ms; --dur: 300ms; --dur-slow: 600ms;
}
[data-theme='dark'] {
  --background: oklch(0.18 0.01 60);
  --foreground: oklch(0.95 0.01 90);
  --card: oklch(0.22 0.015 60);
  --border: oklch(0.30 0.02 70);
}
[data-theme='platinum'] { --gold: oklch(0.80 0.02 250); --gold-deep: oklch(0.65 0.03 250); }
[data-theme='rose'] { --gold: oklch(0.78 0.10 30); --gold-deep: oklch(0.64 0.12 28); }
```

**مقياس الطباعة** (display للعناوين، sans للنص؛ زيادة حجم العربي 20–25% للتوازن البصري):
`display-1 (48–64px) · h1 (36px) · h2 (28px) · h3 (22px) · body (16px) · small (14px)`.

**المسافات:** سلّم 4px (4/8/12/16/24/32/48/64/96). **الزوايا:** 8/16/24px. **bento gaps:** 16–32px.

---

## 4. مكتبة المكوّنات المطلوب بناؤها

### أساسية (shadcn/ui — معدّلة بالـ tokens)
`Button` (gold/outline/ghost) · `Card` · `Dialog` · `Drawer/Sheet` (slide-over) · `Input/Select/Textarea` · `Badge` · `Skeleton` · `Tabs` · `DropdownMenu` · `Toast/Sonner` · `Tooltip` · `Accordion` · `Avatar` · `Switch` · `Pagination`.

### مكوّنات العلامة (مخصّصة)
| المكوّن | الوصف + الأنيميشن |
|---------|-------------------|
| `ProductCard` | صورة مع hover zoom + رفع خفيف (lift)، badge خصم، overlay زجاجي للسعر، زر مفضلة قلب نابض |
| `ProductGallery` | Embla + مصغّرات + تكبير (PhotoSwipe)؛ **morph** المصغّر→البطل عبر View Transitions |
| `CartDrawer` | slide-over من اليسار (RTL)، عناصر مع animate-in، «طار للسلة» (fly-to-cart) عند الإضافة، اقتراحات upsell |
| `MegaMenu` | قائمة تصنيفات بمعاينة صور + بحث فوري |
| `Hero` | بطل بصري كبير (صورة/فيديو/بانر) + نص متدرّج الظهور (stagger)، اختياري parallax (GSAP) |
| `SectionReveal` | إظهار عند التمرير (fade/slide up) عبر Motion `whileInView` أو CSS scroll-driven |
| `QuickView` | معاينة سريعة للمنتج كـ Drawer دون مغادرة الصفحة |
| `StickyAddToCart` | شريط سفلي لاصق على الجوال (رفع تحويل 8–15%) |
| `RatingStars` · `PriceTag` · `Breadcrumbs` · `EmptyState` · `ThemeSwitcher` |

---

## 5. كتالوج الأنيميشن والتفاعلات

| النمط | الأداة | أين |
|------|--------|-----|
| انتقال الصفحات + morph العناصر المشتركة | View Transitions API | كل التنقّل، مصغّر المنتج→صفحته |
| إظهار عند التمرير (stagger reveal) | Motion `whileInView` / CSS scroll-driven | أقسام الرئيسية، شبكات المنتجات |
| hover المنتج (zoom + lift + glare) | Motion / CSS | بطاقات المنتج |
| السلة المنزلقة + fly-to-cart | Motion (layout + AnimatePresence) | الإضافة للسلة |
| micro-interactions (أزرار، قلب المفضلة، toasts) | Motion | عام |
| هيكل عظمي + optimistic UI | Skeleton + Motion | أثناء التحميل |
| الهيرو السينمائي (parallax/scrub) — اختياري | GSAP ScrollTrigger + Lenis | الصفحة الرئيسية فقط |
| سحب/تكبير الصور (gestures) | Motion / Embla | معرض المنتج |

**حُرّاس الأداء/الوصولية:** كل الحركات تحترم `prefers-reduced-motion`؛ لا lazy-load للـ LCP؛ `fetchpriority` لصورة البطل؛ code-splitting للمكوّنات الثقيلة (GSAP يُحمّل ديناميكياً في الرئيسية فقط).

---

## 6. إعادة تصميم كل صفحة (Page-by-Page)

| الصفحة | التغييرات الرئيسية |
|--------|--------------------|
| **الرئيسية** `(storefront)/page` | هيرو سينمائي (بانر/فيديو + stagger)، **bento grid** للتصنيفات، أقسام بإظهار-عند-التمرير، شريط ثقة متحرك، شعار العلامة |
| **التصنيف** `category/[slug]` | شريط فلاتر كـ **Drawer** على الجوال، رقائق فلاتر أنيقة، شبكة بطاقات محسّنة، skeletons، ترقيم/تحميل لا نهائي |
| **المنتج** `product/[slug]` | **Gallery (Embla+zoom)** مع morph، تخطيط فاخر، StickyAddToCart للجوال، تبويبات (وصف/مواصفات/مراجعات)، منتجات مشابهة بإظهار متدرّج |
| **السلة** | تتحوّل إلى **CartDrawer** منزلق (مع إبقاء صفحة `/cart` كاملة)، تحديث كمية optimistic |
| **الدفع** `checkout` | خطوات أنيقة (عنوان→دفع→مراجعة)، تحقّق فوري، ملخّص لاصق، حالة نجاح احتفالية |
| **الحساب** `account` | تبويبات محسّنة (بطاقات طلبات، شبكة مفضلة، نماذج أنيقة) |
| **البحث** `search` | نتائج فورية + حالة فارغة جميلة + اقتراحات |
| **التتبّع** `track` | خط زمني (timeline) متحرّك لحالة الطلب |
| **الصفحات الثابتة** `page/[slug]` | تنسيق محتوى أنيق (prose) |
| **الهيدر/الفوتر** | هيدر شفاف يتغيّر عند التمرير + MegaMenu + ThemeSwitcher + بحث autocomplete محسّن؛ فوتر فاخر |
| **لوحة الإدارة** `/admin` | تطبيق نفس نظام التصميم/الـ tokens (shell, sidebar, جداول, بطاقات) — أولوية أقل من المتجر |

---

## 7. التخصيص العالي (Theming Architecture)

1. **كل القيم tokens** (CSS variables) — تغيير ثيم = تغيير متغيرات فقط، بلا إعادة بناء.
2. **next-themes** لتبديل وقت التشغيل: `light` / `dark` / `platinum` / `rose-gold` عبر `data-theme`.
3. **لوحة إعدادات الثيم في الإدارة** (مستقبلي): ربط ألوان العلامة/الشعار من `SettingsModule` الحالي (`store_logo`, ألوان) لتغيير المظهر دون كود.
4. **(اختياري) tweakcn** لتوليد ثيمات shadcn بصرياً، و**Style Dictionary** لو احتجنا جسر Figma→tokens لاحقاً.

---

## 8. الأداء والوصولية (Guardrails)

- **Lighthouse > 90** (perf/a11y/SEO) على الجوال — بوّابة قبول لكل مرحلة.
- LCP: صورة البطل بـ `priority`/`fetchpriority=high`، بلا lazy فوق الطيّة.
- `next/image` لكل الصور + WebP/AVIF + أحجام متجاوبة (يحلّ ملاحظة الأداء في mds/07).
- `prefers-reduced-motion` يعطّل الحركات غير الضرورية.
- وصولية: تباين كافٍ (OKLCH يساعد)، تنقّل لوحة مفاتيح، `aria` عبر Radix، اختبار `axe`.
- ميزانية حزمة: الهيرو الثقيل (GSAP) ديناميكي فقط؛ مراقبة bundle.

---

## 9. خطة التنفيذ المرحلية (Execution Roadmap)

| المرحلة | المحتوى | المخرجات | معيار القبول |
|---------|---------|----------|---------------|
| **P0 — الأساس** | تثبيت Motion/next-themes/Embla/lucide؛ ترقية Tailwind v4 (أو tokens على v3)؛ تعريف tokens + الخطوط + الثيمات؛ ThemeProvider | نظام تصميم يعمل + ثيم داكن | البناء ينجح، الثيمات تبدّل، Lighthouse ثابت |
| **P1 — مكتبة المكوّنات** | shadcn init + المكوّنات الأساسية + مكوّنات العلامة (ProductCard, Drawer, Gallery, Hero, SectionReveal) | Storybook/صفحة عرض مكوّنات | كل مكوّن RTL + reduced-motion |
| **P2 — صفحات المتجر** | إعادة تصميم: الهيدر/الفوتر، الرئيسية، التصنيف، المنتج، البحث | متجر بمظهر فاخر متجاوب | Lighthouse>90، RTL سليم |
| **P3 — التفاعلات** | CartDrawer + fly-to-cart، View Transitions، StickyAddToCart، QuickView، skeletons، الدفع/الحساب/التتبّع | تجربة تفاعلية كاملة | لا CLS، حركات سلسة |
| **P4 — لوحة الإدارة** | تطبيق نظام التصميم على shell الإدارة والجداول | لوحة إدارة متّسقة | — |
| **P5 — التخصيص** | ثيمات إضافية + لوحة ثيم في الإعدادات + توثيق نظام التصميم | تخصيص بلا كود | — |

> **التقدير:** P0–P3 (المتجر) هي القيمة الأكبر. كل مرحلة تُبنى وتُختبر وتُنشر على https://sooq.grade.sbs بشكل تدريجي دون كسر العمل الحالي.

---

## 10. المصادر (بحث 2025–2026)

- Motion (Framer Motion) — motion.dev، GSAP vs Motion: https://motion.dev/docs/gsap-vs-motion
- Next.js View Transitions: https://nextjs.org/docs/app/guides/view-transitions
- GSAP + Next.js 2025: https://gsap.com/resources/React/
- shadcn/ui + RTL، Tailwind v4: https://ui.shadcn.com — Tailwind v4: https://tailwindcss.com/blog/tailwindcss-v4
- Aceternity UI / Magic UI / Motion Primitives (مكوّنات أنيميشن فاخرة)
- next-themes: https://github.com/pacocoursey/next-themes
- Embla Carousel: https://www.embla-carousel.com — PhotoSwipe للتكبير
- الطباعة العربية: Tajawal/Almarai/Cairo/IBM Plex Arabic + next/font
- اتجاهات تصميم التجارة الفاخرة 2025–2026: bento grids، glassmorphism، whitespace، dark mode، 3D (Spline/R3F)
- أنماط UX: cart drawer، sticky add-to-cart (Baymard)، skeletons، mega menu، Radix UI (RTL)

> التقرير البحثي الكامل (كل الخيارات والمقارنات والمصادر التفصيلية) محفوظ في مخرجات التدقيق.
