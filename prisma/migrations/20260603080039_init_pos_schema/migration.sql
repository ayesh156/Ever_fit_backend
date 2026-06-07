/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unitPrice` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add discount with default, unitPrice as nullable first
ALTER TABLE `order_items` ADD COLUMN `discount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `unitPrice` DOUBLE NULL;

-- Step 2: Populate unitPrice for existing rows based on price
UPDATE `order_items` SET `unitPrice` = `price` WHERE `unitPrice` IS NULL;

-- Step 3: Make unitPrice NOT NULL now that all rows have a value
ALTER TABLE `order_items` MODIFY COLUMN `unitPrice` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    ADD COLUMN `discount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `subtotal` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `product_variants` ADD COLUMN `barcode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `order_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `product_variants_barcode_key` ON `product_variants`(`barcode`);

-- AddForeignKey
ALTER TABLE `order_payments` ADD CONSTRAINT `order_payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
