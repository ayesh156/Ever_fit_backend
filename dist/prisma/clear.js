"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
require("dotenv/config");
async function main() {
    const adapter = new adapter_mariadb_1.PrismaMariaDb(process.env.DATABASE_URL);
    const prisma = new client_1.PrismaClient({ adapter });
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
    console.log('All data cleared');
    await prisma.$disconnect();
}
main().catch(console.error);
//# sourceMappingURL=clear.js.map