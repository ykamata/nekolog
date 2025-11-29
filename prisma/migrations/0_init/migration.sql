-- CreateTable
CREATE TABLE `cats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `birthdate` DATETIME(3) NULL,
    `weight` DOUBLE NULL,
    `photoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `foods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('DRY', 'WET') NOT NULL,
    `brand` VARCHAR(191) NULL,
    `caloriesPerGram` DOUBLE NOT NULL,
    `pricePerUnit` DOUBLE NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'g',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meal_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `foodId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `calories` DOUBLE NOT NULL,
    `mealTime` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('MEDICINE', 'SUPPLEMENT', 'VITAMIN') NOT NULL,
    `description` TEXT NULL,
    `dosage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medication_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `medicationId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `administeredAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ADMINISTERED', 'SKIPPED', 'MISSED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medication_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `medicationId` INTEGER NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `times` TEXT NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medication_reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scheduleId` INTEGER NOT NULL,
    `catId` INTEGER NOT NULL,
    `medicationId` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_visits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `visitDate` DATETIME(3) NOT NULL,
    `hospitalId` INTEGER NOT NULL,
    `doctorId` INTEGER NULL,
    `cost` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `hasBloodTest` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_appointments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `appointmentDate` DATETIME(3) NOT NULL,
    `hospitalId` INTEGER NOT NULL,
    `doctorId` INTEGER NULL,
    `plannedTreatments` TEXT NULL,
    `notes` TEXT NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_hospitals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `memo` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `veterinary_hospitals_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_doctors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `hospitalId` INTEGER NULL,
    `specialty` TEXT NULL,
    `memo` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `veterinary_doctors_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_treatments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `veterinary_treatments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `veterinary_visit_treatments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `visitId` INTEGER NOT NULL,
    `treatmentId` INTEGER NOT NULL,

    UNIQUE INDEX `veterinary_visit_treatments_visitId_treatmentId_key`(`visitId`, `treatmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `excretion_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `type` ENUM('URINE', 'FECES') NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `excretion_records_catId_idx`(`catId`),
    INDEX `excretion_records_recordedAt_idx`(`recordedAt`),
    INDEX `excretion_records_type_idx`(`type`),
    INDEX `excretion_records_catId_recordedAt_idx`(`catId`, `recordedAt`),
    INDEX `excretion_records_catId_type_idx`(`catId`, `type`),
    INDEX `excretion_records_recordedAt_type_idx`(`recordedAt`, `type`),
    INDEX `excretion_records_catId_recordedAt_type_idx`(`catId`, `recordedAt`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `medicationId` INTEGER NULL,
    `emergencyMedication` BOOLEAN NOT NULL DEFAULT false,
    `memo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_notes_date_idx`(`date`),
    INDEX `daily_notes_catId_date_idx`(`catId`, `date`),
    UNIQUE INDEX `daily_notes_catId_date_key`(`catId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cat_health_signals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `catId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `color` ENUM('GREEN', 'YELLOW', 'RED') NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cat_health_signals_catId_date_idx`(`catId`, `date`),
    INDEX `cat_health_signals_date_idx`(`date`),
    UNIQUE INDEX `cat_health_signals_catId_date_key`(`catId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `meal_records` ADD CONSTRAINT `meal_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meal_records` ADD CONSTRAINT `meal_records_foodId_fkey` FOREIGN KEY (`foodId`) REFERENCES `foods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_records` ADD CONSTRAINT `medication_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_records` ADD CONSTRAINT `medication_records_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_schedules` ADD CONSTRAINT `medication_schedules_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_schedules` ADD CONSTRAINT `medication_schedules_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_reminders` ADD CONSTRAINT `medication_reminders_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `medication_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_reminders` ADD CONSTRAINT `medication_reminders_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_reminders` ADD CONSTRAINT `medication_reminders_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_visits` ADD CONSTRAINT `veterinary_visits_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_visits` ADD CONSTRAINT `veterinary_visits_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_visits` ADD CONSTRAINT `veterinary_visits_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `veterinary_doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_appointments` ADD CONSTRAINT `veterinary_appointments_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_appointments` ADD CONSTRAINT `veterinary_appointments_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_appointments` ADD CONSTRAINT `veterinary_appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `veterinary_doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_hospitals` ADD CONSTRAINT `veterinary_hospitals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_doctors` ADD CONSTRAINT `veterinary_doctors_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_doctors` ADD CONSTRAINT `veterinary_doctors_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_visit_treatments` ADD CONSTRAINT `veterinary_visit_treatments_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `veterinary_visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `veterinary_visit_treatments` ADD CONSTRAINT `veterinary_visit_treatments_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `veterinary_treatments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `excretion_records` ADD CONSTRAINT `excretion_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_notes` ADD CONSTRAINT `daily_notes_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_notes` ADD CONSTRAINT `daily_notes_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cat_health_signals` ADD CONSTRAINT `cat_health_signals_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

