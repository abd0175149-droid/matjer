// matjer — seed: أدوار/صلاحيات (mds/10) + مدير + بيانات تصنيفات/منتجات أولية + sequence رقم الطلب
import { PrismaClient, GoldType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// صلاحيات بصيغة resource.action (errata C-10)
const PERMISSIONS = [
  'products.read', 'products.write', 'products.delete',
  'inventory.read', 'inventory.write', 'inventory.count',
  'orders.read', 'orders.write', 'orders.cancel', 'orders.returns',
  'purchases.read', 'purchases.write',
  'accounting.read', 'accounting.export',
  'customers.read', 'customers.write',
  'settings.manage', 'users.manage', 'roles.manage', 'audit.read',
];

// مصفوفة الأدوار→الصلاحيات (mds/10 §3)
const ROLE_PERMS: Record<string, string[]> = {
  admin: PERMISSIONS, // كل الصلاحيات
  sales: ['products.read', 'inventory.read', 'orders.read', 'orders.write', 'orders.cancel', 'orders.returns', 'customers.read', 'customers.write'],
  inventory: ['products.read', 'products.write', 'products.delete', 'inventory.read', 'inventory.write', 'inventory.count', 'purchases.read', 'purchases.write'],
  accountant: ['products.read', 'inventory.read', 'orders.read', 'purchases.read', 'accounting.read', 'accounting.export', 'customers.read'],
  customer: [],
};

const ROLE_DESC: Record<string, string> = {
  admin: 'المدير — صلاحية كاملة',
  sales: 'موظف المبيعات',
  inventory: 'موظف المخزون',
  accountant: 'المحاسب',
  customer: 'عميل',
};

async function main() {
  // 1) sequence لرقم الطلب (errata R-11)
  await prisma.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1');

  // 2) الصلاحيات
  for (const name of PERMISSIONS) {
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }
  const allPerms = await prisma.permission.findMany();
  const permId = (n: string) => allPerms.find((p) => p.name === n)!.id;

  // 3) الأدوار + ربط الصلاحيات
  for (const [roleName, perms] of Object.entries(ROLE_PERMS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESC[roleName] },
      create: { name: roleName, description: ROLE_DESC[roleName], isSystem: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (perms.length) {
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: permId(p) })),
        skipDuplicates: true,
      });
    }
  }

  // 4) مستخدم المدير
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@matjer.local';
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { roleId: adminRole.id, isActive: true },
    create: {
      name: 'مدير المتجر',
      email: adminEmail,
      phone: '0000000000',
      passwordHash: await bcrypt.hash(adminPass, 10),
      roleId: adminRole.id,
      provider: 'local',
      isActive: true,
    },
  });
  console.log(`✅ admin: ${adminEmail}`);

  // 5) تصنيفات (mds/03 §1)
  const cats = [
    { name: 'أطقم', slug: 'sets' },
    { name: 'خواتم', slug: 'rings' },
    { name: 'أساور', slug: 'bracelets' },
    { name: 'قلادات', slug: 'necklaces' },
  ];
  const catMap: Record<string, number> = {};
  for (let i = 0; i < cats.length; i++) {
    const c = await prisma.category.upsert({
      where: { slug: cats[i].slug },
      update: { name: cats[i].name, sortOrder: i },
      create: { name: cats[i].name, slug: cats[i].slug, sortOrder: i },
    });
    catMap[cats[i].slug] = c.id;
  }

  // 6) منتجات عيّنة مع متغيرات ومخزون
  const products = [
    { name: 'طقم ذهب روسي ملكي', slug: 'royal-russian-set', cat: 'sets', gold: GoldType.RUSSIAN, price: 120, disc: 99, featured: true, img: 'https://picsum.photos/seed/set1/600/600' },
    { name: 'طقم ذهب صيني كلاسيك', slug: 'classic-chinese-set', cat: 'sets', gold: GoldType.CHINESE, price: 85, disc: null, featured: true, img: 'https://picsum.photos/seed/set2/600/600' },
    { name: 'خاتم ذهب روسي مرصّع', slug: 'russian-stone-ring', cat: 'rings', gold: GoldType.RUSSIAN, price: 35, disc: 29, featured: false, img: 'https://picsum.photos/seed/ring1/600/600' },
    { name: 'سوار ذهب صيني أنيق', slug: 'elegant-chinese-bracelet', cat: 'bracelets', gold: GoldType.CHINESE, price: 45, disc: null, featured: true, img: 'https://picsum.photos/seed/brc1/600/600' },
    { name: 'قلادة ذهب روسي فاخرة', slug: 'luxury-russian-necklace', cat: 'necklaces', gold: GoldType.RUSSIAN, price: 75, disc: 65, featured: false, img: 'https://picsum.photos/seed/nck1/600/600' },
    { name: 'قلادة ذهب صيني ناعمة', slug: 'soft-chinese-necklace', cat: 'necklaces', gold: GoldType.CHINESE, price: 55, disc: null, featured: true, img: 'https://picsum.photos/seed/nck2/600/600' },
  ];

  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, basePrice: p.price, discountPrice: p.disc ?? null, isFeatured: p.featured },
      create: {
        name: p.name,
        slug: p.slug,
        description: `${p.name} — إكسسوار ذهب تقليدي عالي الجودة بسعر ثابت.`,
        categoryId: catMap[p.cat],
        goldType: p.gold,
        basePrice: p.price,
        discountPrice: p.disc ?? null,
        isFeatured: p.featured,
        attributes: { material: 'ذهب مطلي', pieces: p.cat === 'sets' ? 4 : 1 },
        images: { create: [{ imageUrl: p.img, sortOrder: 0 }] },
        variants: {
          create: [
            { sku: `${p.slug}-default`, color: 'ذهبي', price: p.disc ?? p.price, stockQuantity: 25, minStockAlert: 5 },
          ],
        },
      },
    });
    // حركة مخزون أولية (IN) إن لم توجد
    const variant = await prisma.productVariant.findFirst({ where: { productId: prod.id } });
    if (variant) {
      const existing = await prisma.stockMovement.count({ where: { variantId: variant.id, type: 'IN' } });
      if (existing === 0) {
        await prisma.stockMovement.create({
          data: { variantId: variant.id, type: 'IN', quantity: 25, reference: 'seed', note: 'رصيد افتتاحي' },
        });
      }
    }
  }
  console.log(`✅ seeded ${products.length} products in ${cats.length} categories`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
