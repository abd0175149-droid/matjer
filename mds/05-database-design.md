# 05 — تصميم قاعدة البيانات (Database Design)

> مخطط مبدئي للجداول الرئيسية والعلاقات بينها. الأنواع تقريبية وقابلة للتعديل حسب التنفيذ.

---

## 1. الجداول الرئيسية

### المستخدمون والأدوار

**users** (المستخدمون — عملاء وموظفون)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | UUID/BIGINT | المعرّف |
| name | VARCHAR | الاسم |
| email | VARCHAR | البريد (فريد) |
| phone | VARCHAR | الهاتف |
| password_hash | VARCHAR | كلمة المرور المشفّرة |
| role_id | FK | الدور |
| is_active | BOOLEAN | الحالة |
| created_at | TIMESTAMP | تاريخ الإنشاء |

**roles** (الأدوار)
| الحقل | النوع |
|-------|------|
| id | PK |
| name | VARCHAR (admin, sales, inventory, accountant, customer) |

**permissions** + **role_permissions** (الصلاحيات وربطها بالأدوار)

---

### المنتجات والمخزون

**categories** (التصنيفات)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| name | VARCHAR | اسم التصنيف |
| parent_id | FK (nullable) | تصنيف أب (للتصنيفات الفرعية) |
| slug | VARCHAR | رابط نظيف |

**products** (المنتجات)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| name | VARCHAR | الاسم |
| description | TEXT | الوصف |
| category_id | FK | التصنيف |
| gold_type | ENUM | روسي / صيني |
| base_price | DECIMAL | السعر الأساسي |
| discount_price | DECIMAL (nullable) | سعر الخصم |
| is_active | BOOLEAN | منشور؟ |
| is_featured | BOOLEAN | مميز؟ |
| created_at | TIMESTAMP | |

**product_variants** (متغيرات المنتج)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| product_id | FK | المنتج |
| sku | VARCHAR | كود فريد |
| size | VARCHAR | المقاس |
| color | VARCHAR | اللون |
| price | DECIMAL | سعر المتغير |
| stock_quantity | INT | الكمية المتاحة |
| reserved_quantity | INT | الكمية المحجوزة |
| min_stock_alert | INT | حد التنبيه |

**product_images** (صور المنتج)
| الحقل | النوع |
|-------|------|
| id | PK |
| product_id | FK |
| image_url | VARCHAR |
| sort_order | INT |

**stock_movements** (حركات المخزون)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| variant_id | FK | المتغير |
| type | ENUM | إدخال/إخراج/مرتجع/تالف/تسوية/تحويل |
| quantity | INT | الكمية (موجب/سالب) |
| reference | VARCHAR | مرجع (رقم طلب/شراء) |
| warehouse_id | FK (nullable) | المستودع |
| created_by | FK | المستخدم |
| created_at | TIMESTAMP | |

**warehouses** (المستودعات — اختياري)

---

### الطلبات

**orders** (الطلبات)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| order_number | VARCHAR | رقم الطلب (فريد) |
| customer_id | FK | العميل |
| status | ENUM | جديد/مؤكد/قيد التجهيز/مشحون/مُسلّم/ملغي/مرتجع |
| subtotal | DECIMAL | المجموع الفرعي |
| discount | DECIMAL | الخصم |
| shipping_cost | DECIMAL | الشحن |
| total | DECIMAL | الإجمالي |
| payment_method | ENUM | إلكتروني/عند الاستلام |
| payment_status | ENUM | مدفوع/غير مدفوع/مسترد |
| shipping_address_id | FK | عنوان التوصيل |
| coupon_id | FK (nullable) | الكوبون |
| notes | TEXT | ملاحظات |
| created_at | TIMESTAMP | |

**order_items** (عناصر الطلب)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| order_id | FK | الطلب |
| variant_id | FK | المتغير |
| quantity | INT | الكمية |
| unit_price | DECIMAL | سعر الوحدة وقت الطلب |
| total | DECIMAL | الإجمالي |

**order_status_history** (سجل تغيّر حالات الطلب)
| الحقل | النوع |
|-------|------|
| id | PK |
| order_id | FK |
| status | ENUM |
| changed_by | FK |
| created_at | TIMESTAMP |

**addresses** (العناوين)
| الحقل | النوع |
|-------|------|
| id | PK |
| customer_id | FK |
| full_name | VARCHAR |
| phone | VARCHAR |
| city | VARCHAR |
| area | VARCHAR |
| street | VARCHAR |
| details | TEXT |

---

### المشتريات

**suppliers** (الموردون)
| الحقل | النوع |
|-------|------|
| id | PK |
| name | VARCHAR |
| contact | VARCHAR |
| notes | TEXT |

**purchase_orders** (أوامر الشراء)
| الحقل | النوع |
|-------|------|
| id | PK |
| supplier_id | FK |
| status | ENUM (معلّق/مستلم جزئي/مستلم) |
| total_cost | DECIMAL |
| created_at | TIMESTAMP |

**purchase_order_items**
| الحقل | النوع |
|-------|------|
| id | PK |
| purchase_order_id | FK |
| variant_id | FK |
| quantity | INT |
| unit_cost | DECIMAL |

---

### التسويق والتفاعل

**coupons** (الكوبونات)
| الحقل | النوع | الوصف |
|-------|------|-------|
| id | PK | |
| code | VARCHAR | الكود |
| type | ENUM | نسبة/مبلغ |
| value | DECIMAL | القيمة |
| min_order | DECIMAL | حد أدنى للطلب |
| usage_limit | INT | حد الاستخدام |
| expires_at | TIMESTAMP | الانتهاء |

**reviews** (المراجعات)
| الحقل | النوع |
|-------|------|
| id | PK |
| product_id | FK |
| customer_id | FK |
| rating | INT (1-5) |
| comment | TEXT |
| is_approved | BOOLEAN |
| created_at | TIMESTAMP |

**wishlists** (المفضلة)
| الحقل | النوع |
|-------|------|
| id | PK |
| customer_id | FK |
| product_id | FK |

**carts** + **cart_items** (السلة)

---

## 2. مخطط العلاقات (مبسّط)

```
roles ──< users ──< addresses
                │
                ├──< orders ──< order_items >── product_variants
                │      │                              │
                │      └──< order_status_history      ├──< product_images
                │                                     ├──< stock_movements
                ├──< reviews >── products ────────────┤
                ├──< wishlists >── products           │
                └──< carts ──< cart_items             │
                                                      │
categories ──< products                               │
suppliers ──< purchase_orders ──< purchase_order_items┘
coupons ──< orders
warehouses ──< stock_movements
```

`──<` تعني علاقة واحد لمتعدد (One-to-Many).

---

## 3. ملاحظات التصميم

- استخدام **UUID** للمعرّفات الحساسة (الطلبات) لتجنّب التخمين.
- فهرسة (Indexing) الحقول كثيرة الاستعلام: `sku`, `order_number`, `email`, `category_id`.
- استخدام **Soft Delete** (حقل `deleted_at`) بدل الحذف النهائي للمنتجات والطلبات.
- تخزين السعر في `order_items` وقت الطلب (لأن سعر المنتج قد يتغيّر لاحقاً).
- فصل `stock_quantity` عن `reserved_quantity` لإدارة الحجز المؤقت بدقة.
