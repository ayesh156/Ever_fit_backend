import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // ==========================================
  // SEED CUSTOMERS (for orders)
  // ==========================================
  const seedCustomers = [
    { name: 'Kamal Gunawardena', phone: '0771234567', city: 'Colombo' },
    { name: 'Saman Perera', phone: '0719876543', city: 'Galle' },
    { name: 'Nimal Fernando', phone: '0765544332', city: 'Kandy' },
    { name: 'Priya Jayawardena', phone: '0781122334', city: 'Matara' },
    { name: 'Sunil Bandara', phone: '0724455667', city: 'Kurunegala' },
  ];
  const customerIds: number[] = [];
  for (const c of seedCustomers) {
    const created = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: { name: c.name, phone: c.phone, city: c.city },
    });
    customerIds.push(created.id);
  }
  console.log(`Seeded ${customerIds.length} customers`);

  // ==========================================
  // SEED CATEGORIES
  // ==========================================
  const categoriesData = [
    { name: "Men's Wear", slug: 'mens-wear', description: "Men's clothing collection", image: null as string | null, status: 'active' },
    { name: "Women's Wear", slug: 'womens-wear', description: "Women's fashion collection", image: null as string | null, status: 'active' },
    { name: "Kids' Wear", slug: 'kids-wear', description: "Children's clothing", image: null as string | null, status: 'active' },
    { name: 'Footwear', slug: 'footwear', description: 'Shoes sandals and boots', image: null as string | null, status: 'active' },
    { name: 'Accessories', slug: 'accessories', description: 'Belts bags watches and more', image: null as string | null, status: 'active' },
    { name: 'Sportswear', slug: 'sportswear', description: 'Active and athletic wear', image: null as string | null, status: 'active' },
    { name: 'Formal Wear', slug: 'formal-wear', description: 'Suits blazers and formal attire', image: null as string | null, status: 'active' },
    { name: 'Denim', slug: 'denim', description: 'Jeans jackets and denim wear', image: null as string | null, status: 'active' },
    { name: 'Traditional', slug: 'traditional', description: 'Sarees sarongs and cultural wear', image: null as string | null, status: 'active' },
    { name: 'Swimwear', slug: 'swimwear', description: 'Beachwear and swim collection', image: null as string | null, status: 'active' },
    { name: 'Outerwear', slug: 'outerwear', description: 'Jackets coats and windbreakers', image: null as string | null, status: 'active' },
    { name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Kurtas sherwanis and ethnic collection', image: null as string | null, status: 'active' },
    { name: 'Maternity', slug: 'maternity', description: 'Comfortable maternity clothing', image: null as string | null, status: 'inactive' },
    { name: 'Plus Size', slug: 'plus-size', description: 'Inclusive plus-size fashion range', image: null as string | null, status: 'active' },
    { name: 'Workwear', slug: 'workwear', description: 'Professional office and work attire', image: null as string | null, status: 'active' },
  ];

  const categoryNameToId: Record<string, number> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { slug: cat.slug, description: cat.description, image: cat.image, status: cat.status },
      create: { name: cat.name, slug: cat.slug, description: cat.description, image: cat.image, status: cat.status },
    });
    categoryNameToId[cat.name] = created.id;
  }
  console.log(`Seeded ${categoriesData.length} categories`);

  // ==========================================
  // SEED PRODUCTS WITH VARIANTS
  // ==========================================
  const productsData = [
    { name: 'Classic Crew Neck T-Shirt', description: 'Essential everyday crew neck t-shirt made from premium cotton. Comfortable fit with reinforced stitching.', price: 1490, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', categoryName: "Men's Wear", sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Navy'], baseSku: 'RL-MT-001', stockPerVariant: 15 },
    { name: 'Slim Fit Polo Shirt', description: 'Modern slim fit polo with ribbed collar and two-button placket. Perfect for casual and semi-formal occasions.', price: 2290, image: 'https://bogartcosmo.no/cdn/shop/files/d9f11355-0cd7-4168-9a3e-6303d5c8d9e9.jpg?crop=center&height=1200&v=1768575245&width=1200', categoryName: "Men's Wear", sizes: ['M', 'L', 'XL', 'XXL'], colors: ['Black', 'Charcoal', 'Forest Green'], baseSku: 'RL-MT-002', stockPerVariant: 12 },
    { name: 'Floral Maxi Dress', description: 'Elegant floral print maxi dress in lightweight chiffon. Features a flattering A-line silhouette.', price: 4490, image: 'https://assets.laboutiqueofficielle.com/w_450,q_auto,f_auto/media/products/2025/01/28/only_451294_15342691_NAVY-BLAZER-616TROPIC_20250219T160155_01.jpg', categoryName: "Women's Wear", sizes: ['XS', 'S', 'M', 'L'], colors: ['Blush Pink', 'Ivory', 'Dusty Blue'], baseSku: 'RL-WD-001', stockPerVariant: 8 },
    { name: 'Slim Fit Stretch Jeans', description: 'Classic slim fit jeans with 2% stretch for added comfort. Durable denim with modern wash.', price: 3490, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTviiBOrSIXuLCEO6zPbnGu7d-2Bjakz5W6Uw&s', categoryName: 'Denim', sizes: ['28', '30', '32', '34', '36'], colors: ['Dark Blue', 'Black', 'Light Wash'], baseSku: 'RL-MJ-001', stockPerVariant: 10 },
    { name: 'Cotton Casual Blouse', description: 'Versatile cotton blouse with a relaxed fit. Pairs well with jeans, skirts, or trousers.', price: 1990, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLqxfNkWrpnEAXMYY8NyqMRfMltxWsJgRpWA&s', categoryName: "Women's Wear", sizes: ['S', 'M', 'L'], colors: ['White', 'Cream', 'Sage'], baseSku: 'RL-WT-001', stockPerVariant: 10 },
    { name: "Kids' Graphic Tee", description: 'Fun and colourful graphic t-shirt for kids. Made from soft cotton with vibrant prints.', price: 990, image: 'https://itsugar.com/cdn/shop/files/SPK_Tee_Mens_front.jpg?v=1733264612&width=1500', categoryName: "Kids' Wear", sizes: ['XS', 'S', 'M'], colors: ['Red', 'Blue', 'Yellow'], baseSku: 'RL-KB-001', stockPerVariant: 20 },
    { name: 'Leather Crossbody Bag', description: 'Premium genuine leather crossbody bag with adjustable strap and multiple compartments.', price: 5990, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80', categoryName: 'Accessories', sizes: ['FREE'], colors: ['Black', 'Tan', 'Burgundy'], baseSku: 'RL-AC-001', stockPerVariant: 5 },
    { name: "Men's Leather Oxford Shoes", description: 'Classic oxford shoes crafted from genuine leather. Features a durable sole and cushioned insole.', price: 7990, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTroU_VBAhZMr8Ebkw96ZXF9Ne-4FSXqQ1lsA&s', categoryName: 'Footwear', sizes: ['38', 'FREE'], colors: ['Black', 'Brown'], baseSku: 'RL-FW-001', stockPerVariant: 6 },
    { name: 'Dry-Fit Running Tank', description: 'High-performance dry-fit tank top for running and workouts. Moisture-wicking fabric keeps you cool.', price: 1790, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80', categoryName: 'Sportswear', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Neon Green', 'Grey'], baseSku: 'RL-SP-001', stockPerVariant: 15 },
    { name: 'Two-Piece Formal Suit', description: 'Sharp two-piece formal suit with tailored fit. Includes blazer and matching trousers.', price: 14990, image: 'https://www.sainly.com/cdn/shop/products/sainly-men-s-two-piece-suit-men-suits-men-two-piece-suit-men-party-suit-formal-fashion-suit-elegant-men-suit-suit-for-men-slim-fit-suit-men-prom-suit-30178638921787_grande.png?v=1663242132', categoryName: 'Formal Wear', sizes: ['M', 'L', 'XL'], colors: ['Black', 'Navy', 'Charcoal'], baseSku: 'RL-FM-001', stockPerVariant: 3 },
    { name: "Women's High-Rise Skinny Jeans", description: 'Flattering high-rise skinny jeans with stretch denim. Creates a sleek silhouette.', price: 3290, image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80', categoryName: 'Denim', sizes: ['28', '30', '32'], colors: ['Black', 'Dark Blue'], baseSku: 'RL-WS-001', stockPerVariant: 10 },
    { name: 'Silk Saree — Wedding Collection', description: 'Luxurious pure silk saree with intricate zari work. Perfect for weddings and special occasions.', price: 19990, image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80', categoryName: 'Traditional', sizes: ['FREE'], colors: ['Red & Gold', 'Royal Blue', 'Emerald'], baseSku: 'RL-TR-001', stockPerVariant: 3 },
    { name: 'Henley Long Sleeve Shirt', description: 'Casual long sleeve henley shirt with button placket. Soft cotton blend for all-day comfort.', price: 1890, image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&q=80', categoryName: "Men's Wear", sizes: ['S', 'M', 'L', 'XL'], colors: ['Olive', 'Maroon', 'White'], baseSku: 'RL-MT-003', stockPerVariant: 12 },
    { name: 'Wrap Around Midi Skirt', description: 'Elegant wrap midi skirt in breathable linen. Adjustable fit with tie waist.', price: 2690, image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80', categoryName: "Women's Wear", sizes: ['S', 'M', 'L'], colors: ['Black', 'Olive', 'Rust'], baseSku: 'RL-WD-002', stockPerVariant: 8 },
    { name: "Men's Automatic Watch", description: 'Premium automatic movement watch with stainless steel case and genuine leather strap.', price: 11990, image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80', categoryName: 'Accessories', sizes: ['FREE'], colors: ['Silver/Black', 'Gold/Brown'], baseSku: 'RL-AC-002', stockPerVariant: 4 },
    { name: "Girls' Party Frock", description: 'Beautiful satin party frock with bow detail. Perfect for birthdays and special events.', price: 2990, image: 'https://s.alicdn.com/@sc04/kf/H31bf32ea89d04a6a99a204426617b4d5A/2025-Wholesale-New-Frock-Design-Boutique-Frocks-One-Piece-Girls-Party-Dress-Birthday-Wedding.jpg', categoryName: "Kids' Wear", sizes: ['XS', 'S', 'M'], colors: ['Pink', 'Lavender', 'White'], baseSku: 'RL-KD-002', stockPerVariant: 8 },
  ];

  let variantIndex = 1;
  let productCount = 0;
  const variantIds: number[] = [];

  for (const prod of productsData) {
    const categoryId = categoryNameToId[prod.categoryName];
    if (!categoryId) { console.warn(`Category "${prod.categoryName}" not found, skipping "${prod.name}"`); continue; }

    // First image URL goes into product_images as the primary image (order: 0)
    const product = await prisma.product.create({
      data: {
        name: prod.name,
        description: prod.description || null,
        price: prod.price,
        categoryId,
        images: prod.image ? { create: { imageUrl: prod.image, order: 0 } } : undefined,
      },
    });

    for (const size of prod.sizes) {
      for (const color of prod.colors) {
        const sku = `${prod.baseSku}-${String(variantIndex).padStart(3, '0')}`;
        variantIndex++;
        const variant = await prisma.productVariant.create({
          data: { productId: product.id, size, color, sku, stock: prod.stockPerVariant },
        });
        variantIds.push(variant.id);
      }
    }
    productCount++;
  }
  console.log(`Seeded ${productCount} products with ${variantIds.length} variants`);

  // ==========================================
  // SEED CITIES (Sri Lanka)
  // ==========================================
  const sriLankanCities = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kurunegala', 'Ratnapura',
    'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Moneragala', 'Kegalle',
    'Trincomalee', 'Batticaloa', 'Ampara', 'Puttalam', 'Vavuniya',
    'Mannar', 'Kilinochchi', 'Mullaitivu',
  ];
  for (const cityName of sriLankanCities) {
    await prisma.city.upsert({ where: { name: cityName }, update: {}, create: { name: cityName } });
  }
  console.log(`Seeded ${sriLankanCities.length} Sri Lankan cities`);

  // ==========================================
  // SEED ORDERS with OrderItems
  // ==========================================
  const orderStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PENDING', 'PAYMENT_REVIEW'];
  const orderCount = 12;
  let orderItemsTotal = 0;

  for (let i = 0; i < orderCount; i++) {
    // Pick a random customer
    const customerId = customerIds[i % customerIds.length];
    const customer = seedCustomers[i % customerIds.length];
    const status = orderStatuses[i % orderStatuses.length];

    // Pick 1-3 random variants
    const itemCount = (i % 3) + 1;
    const items: { variantId: number; quantity: number; unitPrice: number; discount: number; price: number }[] = [];
    let totalAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      const vi = (i * 3 + j) % variantIds.length;
      const variantId = variantIds[vi];
      // Fetch variant's product to get price
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      if (!variant) continue;
      const unitPrice = variant.product.price;
      const quantity = (i % 3) + 1;
      const discount = j === 0 ? Math.round(unitPrice * 0.05) : 0; // 5% discount on first item
      const price = quantity * unitPrice - discount * quantity;
      totalAmount += price;
      items.push({ variantId, quantity, unitPrice, discount, price });
    }

    // Past dates: go back `i` days
    const createdDate = new Date(Date.now() - (orderCount - i) * 86400000);
    const dueDate = new Date(createdDate.getTime() + 30 * 86400000);
    const paidAmount = status === 'PAID' || status === 'DELIVERED' || status === 'SHIPPED' ? totalAmount : status === 'PROCESSING' ? Math.round(totalAmount * 0.5) : 0;

    const order = await prisma.order.create({
      data: {
        customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalAmount,
        subtotal: totalAmount,
        discount: items.reduce((s, it) => s + it.discount * it.quantity, 0),
        paidAmount,
        dueDate,
        status,
        paymentMethod: i % 2 === 0 ? 'cash' : 'bank-transfer',
        createdAt: createdDate,
        items: { create: items },
        payments: paidAmount > 0 ? { create: [{ amount: paidAmount, method: i % 2 === 0 ? 'cash' : 'bank-transfer' }] } : undefined,
      },
    });
    orderItemsTotal += items.length;
    console.log(`  Created Order #${order.id} — ${customer.name} — ${status} — LKR ${totalAmount}`);
  }

  console.log(`Seeded ${orderCount} orders with ${orderItemsTotal} order items`);

  // ==========================================
  // SEED DEFAULT ADMIN USERS (with bcrypt hashed passwords)
  // ==========================================
  const adminPassword = await bcrypt.hash('Ayesh123', 12);
  await prisma.user.upsert({
    where: { email: 'ayesh@gmail.com' },
    update: {},
    create: { name: 'Ayesh', email: 'ayesh@gmail.com', password: adminPassword, role: Role.ADMIN },
  });
  console.log('Seeded admin user (ayesh@gmail.com / Ayesh123)');

  // Also seed a fallback admin for testing
  const fallbackPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@everfit.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@everfit.com', password: fallbackPassword, role: Role.ADMIN },
  });
  console.log('Seeded fallback admin user (admin@everfit.com / admin123)');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => { console.error('Error during seeding:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });