/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `categories` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add columns as nullable first
ALTER TABLE `categories` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `image` LONGTEXT NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'active';

-- Step 2: Add slug as nullable initially
ALTER TABLE `categories` ADD COLUMN `slug` VARCHAR(191) NULL;

-- Step 3: Populate slug for existing rows based on name
UPDATE `categories` SET `slug` = LOWER(REPLACE(TRIM(`name`), ' ', '-')) WHERE `slug` IS NULL;

-- Step 4: Make slug NOT NULL now that all rows have a value
ALTER TABLE `categories` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `categories_slug_key` ON `categories`(`slug`);
