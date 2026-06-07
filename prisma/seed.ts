import { PrismaClient, Role } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// ==========================================
// CATEGORY SEED DATA (with full fields)
// ==========================================
const categoriesData = [
  { name: "Men's Wear",   slug: 'mens-wear',   description: "Complete men's clothing collection — from casual tees to formal suits.",                                           image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80',   status: 'active' },
  { name: "Women's Wear", slug: 'womens-wear', description: 'Trendy women\'s fashion collection including dresses, blouses, and more.',                                        image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=500&q=80',   status: 'active' },
  { name: "Kids' Wear",   slug: 'kids-wear',   description: "Children's clothing for all ages — comfortable, colourful, and fun.",                                            image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=500&q=80',   status: 'active' },
  { name: 'Footwear',     slug: 'footwear',     description: 'Shoes, sandals, and boots for men, women, and children.',                                                          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',       status: 'active' },
  { name: 'Accessories',  slug: 'accessories',  description: 'Belts, bags, watches, and more to complete your look.',                                                           image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80',   status: 'active' },
  { name: 'Sportswear',   slug: 'sportswear',   description: 'Active & athletic wear for performance and comfort.',                                                            image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80',   status: 'active' },
  { name: 'Formal Wear',  slug: 'formal-wear',  description: 'Suits, blazers, and formal attire for business and special occasions.',                                          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',   status: 'active' },
  { name: 'Denim',        slug: 'denim',        description: 'Jeans, jackets, and denim wear — a timeless classic.',                                                             image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80',   status: 'active' },
  { name: 'Traditional',  slug: 'traditional',  description: 'Sarees, sarongs, and cultural wear for every occasion.',                                                          image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80',   status: 'active' },
  { name: 'Swimwear',     slug: 'swimwear',     description: 'Beachwear & swim collection for men, women, and kids.',                                                           image: 'https://images.unsplash.com/photo-1570976447640-ac859083963f?w=500&q=80',   status: 'active' },
  { name: 'Outerwear',    slug: 'outerwear',    description: 'Jackets, coats & windbreakers to keep you warm and stylish.',                                                     image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80',       status: 'active' },
  { name: 'Ethnic Wear',  slug: 'ethnic-wear',  description: 'Kurtas, sherwanis & ethnic collection for festive celebrations.',                                                image: 'https://fashionbug.lk/cdn/shop/files/0316700020C8_533x.webp?v=1771239468',   status: 'active' },
  { name: 'Maternity',    slug: 'maternity',    description: 'Comfortable maternity clothing for expecting mothers.',                                                          image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&q=80',       status: 'inactive' },
  { name: 'Plus Size',    slug: 'plus-size',    description: 'Inclusive plus-size fashion range — everyone deserves to look great.',                                           image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80',   status: 'active' },
  { name: 'Workwear',     slug: 'workwear',     description: 'Professional office & work attire for a sharp look every day.',                                                 image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',   status: 'active' },
];

// ==========================================
// PRODUCT SEED DATA
// ==========================================
const productsData = [
  {
    name: 'Classic Crew Neck T-Shirt',
    description: 'Essential everyday crew neck t-shirt made from premium cotton. Comfortable fit with reinforced stitching.',
    price: 1490,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',
    categoryName: "Men's Wear",
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Navy'],
    baseSku: 'RL-MT-001',
    stockPerVariant: 15,
  },
  {
    name: 'Slim Fit Polo Shirt',
    description: 'Modern slim fit polo with ribbed collar and two-button placket. Perfect for casual and semi-formal occasions.',
    price: 2290,
    image: 'https://bogartcosmo.no/cdn/shop/files/d9f11355-0cd7-4168-9a3e-6303d5c8d9e9.jpg?crop=center&height=1200&v=1768575245&width=1200',
    categoryName: "Men's Wear",
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Charcoal', 'Forest Green'],
    baseSku: 'RL-MT-002',
    stockPerVariant: 12,
  },
  {
    name: 'Floral Maxi Dress',
    description: 'Elegant floral print maxi dress in lightweight chiffon. Features a flattering A-line silhouette.',
    price: 4490,
    image: 'https://assets.laboutiqueofficielle.com/w_450,q_auto,f_auto/media/products/2025/01/28/only_451294_15342691_NAVY-BLAZER-616TROPIC_20250219T160155_01.jpg',
    categoryName: "Women's Wear",
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Blush Pink', 'Ivory', 'Dusty Blue'],
    baseSku: 'RL-WD-001',
    stockPerVariant: 8,
  },
  {
    name: 'Slim Fit Stretch Jeans',
    description: 'Classic slim fit jeans with 2% stretch for added comfort. Durable denim with modern wash.',
    price: 3490,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTviiBOrSIXuLCEO6zPbnGu7d-2Bjakz5W6Uw&s',
    categoryName: 'Denim',
    sizes: ['28', '30', '32', '34', '36'],
    colors: ['Dark Blue', 'Black', 'Light Wash'],
    baseSku: 'RL-MJ-001',
    stockPerVariant: 10,
  },
  {
    name: 'Cotton Casual Blouse',
    description: 'Versatile cotton blouse with a relaxed fit. Pairs well with jeans, skirts, or trousers.',
    price: 1990,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLqxfNkWrpnEAXMYY8NyqMRfMltxWsJgRpWA&s',
    categoryName: "Women's Wear",
    sizes: ['S', 'M', 'L'],
    colors: ['White', 'Cream', 'Sage'],
    baseSku: 'RL-WT-001',
    stockPerVariant: 10,
  },
  {
    name: "Kids' Graphic Tee",
    description: 'Fun and colourful graphic t-shirt for kids. Made from soft cotton with vibrant prints.',
    price: 990,
    image: 'https://itsugar.com/cdn/shop/files/SPK_Tee_Mens_front.jpg?v=1733264612&width=1500',
    categoryName: "Kids' Wear",
    sizes: ['XS', 'S', 'M'],
    colors: ['Red', 'Blue', 'Yellow'],
    baseSku: 'RL-KB-001',
    stockPerVariant: 20,
  },
  {
    name: 'Leather Crossbody Bag',
    description: 'Premium genuine leather crossbody bag with adjustable strap and multiple compartments.',
    price: 5990,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80',
    categoryName: 'Accessories',
    sizes: ['FREE'],
    colors: ['Black', 'Tan', 'Burgundy'],
    baseSku: 'RL-AC-001',
    stockPerVariant: 5,
  },
  {
    name: "Men's Leather Oxford Shoes",
    description: 'Classic oxford shoes crafted from genuine leather. Features a durable sole and cushioned insole.',
    price: 7990,
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTroU_VBAhZMr8Ebkw96ZXF9Ne-4FSXqQ1lsA&s',
    categoryName: 'Footwear',
    sizes: ['38', 'FREE'],
    colors: ['Black', 'Brown'],
    baseSku: 'RL-FW-001',
    stockPerVariant: 6,
  },
  {
    name: 'Dry-Fit Running Tank',
    description: 'High-performance dry-fit tank top for running and workouts. Moisture-wicking fabric keeps you cool.',
    price: 1790,
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80',
    categoryName: 'Sportswear',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Neon Green', 'Grey'],
    baseSku: 'RL-SP-001',
    stockPerVariant: 15,
  },
  {
    name: 'Two-Piece Formal Suit',
    description: 'Sharp two-piece formal suit with tailored fit. Includes blazer and matching trousers.',
    price: 14990,
    image: 'https://www.sainly.com/cdn/shop/products/sainly-men-s-two-piece-suit-men-suits-men-two-piece-suit-men-party-suit-formal-fashion-suit-elegant-men-suit-suit-for-men-slim-fit-suit-men-prom-suit-30178638921787_grande.png?v=1663242132',
    categoryName: 'Formal Wear',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Charcoal'],
    baseSku: 'RL-FM-001',
    stockPerVariant: 3,
  },
  {
    name: "Women's High-Rise Skinny Jeans",
    description: 'Flattering high-rise skinny jeans with stretch denim. Creates a sleek silhouette.',
    price: 3290,
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80',
    categoryName: 'Denim',
    sizes: ['28', '30', '32'],
    colors: ['Black', 'Dark Blue'],
    baseSku: 'RL-WS-001',
    stockPerVariant: 10,
  },
  {
    name: 'Silk Saree — Wedding Collection',
    description: 'Luxurious pure silk saree with intricate zari work. Perfect for weddings and special occasions.',
    price: 19990,
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80',
    categoryName: 'Traditional',
    sizes: ['FREE'],
    colors: ['Red & Gold', 'Royal Blue', 'Emerald'],
    baseSku: 'RL-TR-001',
    stockPerVariant: 3,
  },
  {
    name: 'Henley Long Sleeve Shirt',
    description: 'Casual long sleeve henley shirt with button placket. Soft cotton blend for all-day comfort.',
    price: 1890,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&q=80',
    categoryName: "Men's Wear",
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Olive', 'Maroon', 'White'],
    baseSku: 'RL-MT-003',
    stockPerVariant: 12,
  },
  {
    name: 'Wrap Around Midi Skirt',
    description: 'Elegant wrap midi skirt in breathable linen. Adjustable fit with tie waist.',
    price: 2690,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80',
    categoryName: "Women's Wear",
    sizes: ['S', 'M', 'L'],
    colors: ['Black', 'Olive', 'Rust'],
    baseSku: 'RL-WD-002',
    stockPerVariant: 8,
  },
  {
    name: "Men's Automatic Watch",
    description: 'Premium automatic movement watch with stainless steel case and genuine leather strap.',
    price: 11990,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80',
    categoryName: 'Accessories',
    sizes: ['FREE'],
    colors: ['Silver/Black', 'Gold/Brown'],
    baseSku: 'RL-AC-002',
    stockPerVariant: 4,
  },
  {
    name: "Girls' Party Frock",
    description: 'Beautiful satin party frock with bow detail. Perfect for birthdays and special events.',
    price: 2990,
    image: 'https://s.alicdn.com/@sc04/kf/H31bf32ea89d04a6a99a204426617b4d5A/2025-Wholesale-New-Frock-Design-Boutique-Frocks-One-Piece-Girls-Party-Dress-Birthday-Wedding.jpg',
    categoryName: "Kids' Wear",
    sizes: ['XS', 'S', 'M'],
    colors: ['Pink', 'Lavender', 'White'],
    baseSku: 'RL-KD-002',
    stockPerVariant: 8,
  },
];

async function main() {
  console.log('🌱 Ever Fit — Seeding database...');

  // ─────────────────────────────────────────
  // 1. Clear existing records safely (respect FK order)
  // ─────────────────────────────────────────
  console.log('  Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.storefrontSetting.deleteMany();
  await prisma.user.deleteMany();

  // ─────────────────────────────────────────
  // 2. Seed Categories (dynamic fields)
  // ─────────────────────────────────────────
  console.log('  Seeding categories...');
  const categoryNameToId: Record<string, number> = {};

  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        status: cat.status,
      },
    });
    categoryNameToId[cat.name] = created.id;
    console.log(`    ✓ ${cat.name} (id: ${created.id}, slug: ${created.slug})`);
  }
  console.log(`  ✓ Seeded ${categoriesData.length} categories`);

  // ─────────────────────────────────────────
  // 3. Seed Products (referencing real category IDs)
  // ─────────────────────────────────────────
  console.log('  Seeding products...');
  let variantIndex = 1;
  let productCount = 0;

  for (const prod of productsData) {
    const categoryId = categoryNameToId[prod.categoryName];
    if (!categoryId) {
      console.warn(`    ✗ Category "${prod.categoryName}" not found, skipping "${prod.name}"`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: prod.name,
        description: prod.description || null,
        price: prod.price,
        image: prod.image || null,
        categoryId,
      },
    });

    // Create variants for each size × color combination
    for (const size of prod.sizes) {
      for (const color of prod.colors) {
        const sku = `${prod.baseSku}-${String(variantIndex).padStart(3, '0')}`;
        variantIndex++;

        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            color,
            sku,
            stock: prod.stockPerVariant,
          },
        });
      }
    }

    productCount++;
    console.log(`    ✓ ${prod.name} (${prod.sizes.length} sizes × ${prod.colors.length} colors = ${prod.sizes.length * prod.colors.length} variants)`);
  }

  console.log(`  ✓ Seeded ${productCount} products with ${variantIndex - 1} variants`);

  // ─────────────────────────────────────────
  // 4. Seed default admin user
  // ─────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@everfit.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@everfit.com',
      role: Role.ADMIN,
    },
  });
  console.log('  ✓ Seeded admin user (admin@everfit.com)');

  // ─────────────────────────────────────────
  // 5. Seed sample customers (Users with CUSTOMER role)
  // ─────────────────────────────────────────
  console.log('  Seeding sample customers...');
  const ayesh = await prisma.user.create({
    data: { name: 'Ayesh Perera', phone: '0712345678', role: Role.CUSTOMER },
  });
  const nimal = await prisma.user.create({
    data: { name: 'Nimal Silva',  phone: '0778901234', role: Role.CUSTOMER },
  });
  const kamala = await prisma.user.create({
    data: { name: 'Kamala Jayawardena', phone: '0769876543', role: Role.CUSTOMER },
  });
  console.log(`  ✓ Seeded 3 customers`);

  // ─────────────────────────────────────────
  // 6. Seed sample orders (invoices)
  //    Look up variant IDs by stable SKU strings
  // ─────────────────────────────────────────
  console.log('  Seeding sample orders...');

  // Helper: get variant by SKU — throws if not found so we catch misconfigured seeds early
  const getVariant = async (sku: string) => {
    const v = await prisma.productVariant.findUnique({ where: { sku } });
    if (!v) throw new Error(`Variant not found for SKU: ${sku}`);
    return v;
  };

  // --- ORDER 1: Ayesh — paid cash, 2× Classic Crew Neck T-Shirt (M/Black) + 1× Slim Fit Polo (M/Black)
  const v1 = await getVariant('RL-MT-001-004'); // Classic Crew Neck T-Shirt M/Black  @ 1490
  const v2 = await getVariant('RL-MT-002-013'); // Slim Fit Polo Shirt M/Black         @ 2290

  // Fetch prices directly from product
  const v1Product = await prisma.product.findUnique({ where: { id: v1.productId } });
  const v2Product = await prisma.product.findUnique({ where: { id: v2.productId } });
  const v1Price = v1Product?.price ?? 1490;
  const v2Price = v2Product?.price ?? 2290;
  const order1Total = (2 * v1Price) + (1 * v2Price);

  const order1 = await prisma.order.create({
    data: {
      customerName:  ayesh.name,
      customerPhone: ayesh.phone ?? '',
      totalAmount:   order1Total,
      subtotal:      order1Total,
      discount:      0,
      paidAmount:    order1Total,
      status:        'PAID',
      paymentMethod: 'cash',
      dueDate:       null,
      items: {
        create: [
          { variantId: v1.id, quantity: 2, unitPrice: v1Price, discount: 0, price: 2 * v1Price },
          { variantId: v2.id, quantity: 1, unitPrice: v2Price, discount: 0, price: v2Price },
        ],
      },
      payments: {
        create: [{ amount: order1Total, method: 'cash', reference: null }],
      },
    },
  });
  console.log(`    ✓ Order #${order1.id} — ${ayesh.name} — PAID — Rs. ${order1Total}`);

  // --- ORDER 2: Nimal — bank transfer, Silk Saree (FREE/Red & Gold), payment verified
  const v3 = await getVariant('RL-TR-001-104'); // Silk Saree FREE/Red & Gold  @ 19990
  const v3Product = await prisma.product.findUnique({ where: { id: v3.productId } });
  const v3Price = v3Product?.price ?? 19990;

  const order2 = await prisma.order.create({
    data: {
      customerName:  nimal.name,
      customerPhone: nimal.phone ?? '',
      totalAmount:   v3Price,
      subtotal:      v3Price,
      discount:      0,
      paidAmount:    v3Price,
      status:        'PAYMENT_VERIFIED',
      paymentMethod: 'bank-transfer',
      dueDate:       null,
      items: {
        create: [
          { variantId: v3.id, quantity: 1, unitPrice: v3Price, discount: 0, price: v3Price },
        ],
      },
      payments: {
        create: [{ amount: v3Price, method: 'bank-transfer', reference: 'BANK-TXN-001' }],
      },
    },
  });
  console.log(`    ✓ Order #${order2.id} — ${nimal.name} — PAYMENT_VERIFIED — Rs. ${v3Price}`);

  // --- ORDER 3: Kamala — credit (partial), Floral Maxi Dress (S/Blush Pink) + Kids Graphic Tee (XS/Red)
  const v4 = await getVariant('RL-WD-001-028'); // Floral Maxi Dress S/Blush Pink @ 4490
  const v5 = await getVariant('RL-KB-001-061'); // Kids Graphic Tee XS/Red        @ 990
  const v4Product = await prisma.product.findUnique({ where: { id: v4.productId } });
  const v5Product = await prisma.product.findUnique({ where: { id: v5.productId } });
  const v4Price = v4Product?.price ?? 4490;
  const v5Price = v5Product?.price ?? 990;
  const order3Total = v4Price + v5Price;
  const order3Paid  = 2000; // partial payment

  const order3 = await prisma.order.create({
    data: {
      customerName:  kamala.name,
      customerPhone: kamala.phone ?? '',
      totalAmount:   order3Total,
      subtotal:      order3Total,
      discount:      0,
      paidAmount:    order3Paid,
      status:        'PENDING',
      paymentMethod: 'credit',
      dueDate:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { variantId: v4.id, quantity: 1, unitPrice: v4Price, discount: 0, price: v4Price },
          { variantId: v5.id, quantity: 1, unitPrice: v5Price, discount: 0, price: v5Price },
        ],
      },
      payments: {
        create: [{ amount: order3Paid, method: 'credit', reference: null }],
      },
    },
  });
  console.log(`    ✓ Order #${order3.id} — ${kamala.name} — PENDING (partial Rs. ${order3Paid}/${order3Total})`);

  // --- ORDER 4: Walk-in — cash, Men's Watch (FREE/Silver-Black)
  const v6 = await getVariant('RL-AC-002-128'); // Men's Automatic Watch FREE/Silver-Black @ 11990
  const v6Product = await prisma.product.findUnique({ where: { id: v6.productId } });
  const v6Price = v6Product?.price ?? 11990;

  const order4 = await prisma.order.create({
    data: {
      customerName:  'Walk-in Customer',
      customerPhone: null,
      totalAmount:   v6Price,
      subtotal:      v6Price,
      discount:      0,
      paidAmount:    v6Price,
      status:        'PAID',
      paymentMethod: 'card',
      dueDate:       null,
      items: {
        create: [
          { variantId: v6.id, quantity: 1, unitPrice: v6Price, discount: 0, price: v6Price },
        ],
      },
      payments: {
        create: [{ amount: v6Price, method: 'card', reference: 'CARD-TXN-001' }],
      },
    },
  });
  console.log(`    ✓ Order #${order4.id} — Walk-in — PAID (card) — Rs. ${v6Price}`);

  console.log(`  ✓ Seeded 4 sample orders`);
  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });