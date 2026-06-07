"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
require("dotenv/config");
const adapter = new adapter_mariadb_1.PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding database...');
    // ==========================================
    // SEED CATEGORIES
    // ==========================================
    const categoriesData = [
        { id: 1, name: "Men's Wear", slug: 'mens-wear', description: "Men's clothing collection", image: null, status: 'active' },
        { id: 2, name: "Women's Wear", slug: 'womens-wear', description: "Women's fashion collection", image: null, status: 'active' },
        { id: 3, name: "Kids' Wear", slug: 'kids-wear', description: "Children's clothing", image: null, status: 'active' },
        { id: 4, name: 'Footwear', slug: 'footwear', description: 'Shoes sandals and boots', image: null, status: 'active' },
        { id: 5, name: 'Accessories', slug: 'accessories', description: 'Belts bags watches and more', image: null, status: 'active' },
        { id: 6, name: 'Sportswear', slug: 'sportswear', description: 'Active and athletic wear', image: null, status: 'active' },
        { id: 7, name: 'Formal Wear', slug: 'formal-wear', description: 'Suits blazers and formal attire', image: null, status: 'active' },
        { id: 8, name: 'Denim', slug: 'denim', description: 'Jeans jackets and denim wear', image: null, status: 'active' },
        { id: 9, name: 'Traditional', slug: 'traditional', description: 'Sarees sarongs and cultural wear', image: null, status: 'active' },
        { id: 10, name: 'Swimwear', slug: 'swimwear', description: 'Beachwear and swim collection', image: null, status: 'active' },
        { id: 11, name: 'Outerwear', slug: 'outerwear', description: 'Jackets coats and windbreakers', image: null, status: 'active' },
        { id: 12, name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Kurtas sherwanis and ethnic collection', image: null, status: 'active' },
        { id: 13, name: 'Maternity', slug: 'maternity', description: 'Comfortable maternity clothing', image: null, status: 'inactive' },
        { id: 14, name: 'Plus Size', slug: 'plus-size', description: 'Inclusive plus-size fashion range', image: null, status: 'active' },
        { id: 15, name: 'Workwear', slug: 'workwear', description: 'Professional office and work attire', image: null, status: 'active' },
    ];
    const categoryNameToId = {};
    for (const cat of categoriesData) {
        const created = await prisma.category.upsert({
            where: { id: cat.id },
            update: { name: cat.name },
            create: { id: cat.id, name: cat.name, slug: cat.slug ?? '', description: cat.description ?? '', image: cat.image, status: cat.status ?? 'active' },
        });
        categoryNameToId[cat.name] = created.id;
    }
    console.log(`Seeded ${categoriesData.length} categories`);
    // ==========================================
    // SEED PRODUCTS WITH VARIANTS & IMAGES
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
            image: 'https://rooprekha.com/cdn/shop/files/photo_2022-11-15_06-38-59.jpg?v=1702482722&width=1445',
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
    let variantIndex = 1;
    let productCount = 0;
    for (const prod of productsData) {
        const categoryId = categoryNameToId[prod.categoryName];
        if (!categoryId) {
            console.warn(`Category "${prod.categoryName}" not found, skipping product "${prod.name}"`);
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
        // Create variants for each size + color combination
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
    }
    console.log(`Seeded ${productCount} products with ${variantIndex - 1} variants`);
    // ==========================================
    // SEED DEFAULT ADMIN USER
    // ==========================================
    await prisma.user.upsert({
        where: { email: 'admin@everfit.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@everfit.com',
            role: client_1.Role.ADMIN,
        },
    });
    console.log('Seeded admin user');
    console.log('Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map