-- MySQL DDL for Nekolog Database
-- Character Set: utf8mb4
-- Collation: utf8mb4_0900_ai_ci

-- Create Database (handled by docker initialization)
-- CREATE DATABASE IF NOT EXISTS nekolog CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- USE nekolog;

-- Create ENUM types using ENUM columns
-- Note: MySQL doesn't have separate ENUM types like PostgreSQL

-- Table: users
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `users_email_key`(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: cats
CREATE TABLE `cats` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `birthdate` DATETIME(3) NULL,
    `weight` DOUBLE NULL,
    `photoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: foods
CREATE TABLE `foods` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('DRY', 'WET') NOT NULL,
    `brand` VARCHAR(191) NULL,
    `caloriesPerGram` DOUBLE NOT NULL,
    `pricePerUnit` DOUBLE NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'g',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: meal_records
CREATE TABLE `meal_records` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `foodId` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `calories` DOUBLE NOT NULL,
    `mealTime` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `meal_records_catId_fkey`(`catId`),
    INDEX `meal_records_foodId_fkey`(`foodId`),
    CONSTRAINT `meal_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `meal_records_foodId_fkey` FOREIGN KEY (`foodId`) REFERENCES `foods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: medications
CREATE TABLE `medications` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('MEDICINE', 'SUPPLEMENT', 'VITAMIN') NOT NULL,
    `description` TEXT NULL,
    `dosage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: medication_records
CREATE TABLE `medication_records` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `medicationId` VARCHAR(191) NOT NULL,
    `quantity` INT NOT NULL,
    `administeredAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ADMINISTERED', 'SKIPPED', 'MISSED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `medication_records_catId_fkey`(`catId`),
    INDEX `medication_records_medicationId_fkey`(`medicationId`),
    CONSTRAINT `medication_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `medication_records_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: medication_schedules
CREATE TABLE `medication_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `medicationId` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `times` TEXT NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `medication_schedules_catId_fkey`(`catId`),
    INDEX `medication_schedules_medicationId_fkey`(`medicationId`),
    CONSTRAINT `medication_schedules_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `medication_schedules_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: medication_reminders
CREATE TABLE `medication_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `medicationId` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `medication_reminders_scheduleId_fkey`(`scheduleId`),
    INDEX `medication_reminders_catId_fkey`(`catId`),
    INDEX `medication_reminders_medicationId_fkey`(`medicationId`),
    CONSTRAINT `medication_reminders_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `medication_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `medication_reminders_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `medication_reminders_medicationId_fkey` FOREIGN KEY (`medicationId`) REFERENCES `medications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_hospitals
CREATE TABLE `veterinary_hospitals` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `memo` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `veterinary_hospitals_name_key`(`name`),
    INDEX `veterinary_hospitals_userId_fkey`(`userId`),
    CONSTRAINT `veterinary_hospitals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_doctors
CREATE TABLE `veterinary_doctors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NULL,
    `specialty` TEXT NULL,
    `memo` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `veterinary_doctors_name_key`(`name`),
    INDEX `veterinary_doctors_userId_fkey`(`userId`),
    INDEX `veterinary_doctors_hospitalId_fkey`(`hospitalId`),
    CONSTRAINT `veterinary_doctors_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `veterinary_doctors_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_treatments
CREATE TABLE `veterinary_treatments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `veterinary_treatments_name_key`(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_visits
CREATE TABLE `veterinary_visits` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `visitDate` DATETIME(3) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NULL,
    `cost` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `hasBloodTest` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `veterinary_visits_catId_fkey`(`catId`),
    INDEX `veterinary_visits_hospitalId_fkey`(`hospitalId`),
    INDEX `veterinary_visits_doctorId_fkey`(`doctorId`),
    CONSTRAINT `veterinary_visits_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `veterinary_visits_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `veterinary_visits_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `veterinary_doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_visit_treatments
CREATE TABLE `veterinary_visit_treatments` (
    `id` VARCHAR(191) NOT NULL,
    `visitId` VARCHAR(191) NOT NULL,
    `treatmentId` VARCHAR(191) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `veterinary_visit_treatments_visitId_treatmentId_key`(`visitId`, `treatmentId`),
    INDEX `veterinary_visit_treatments_visitId_fkey`(`visitId`),
    INDEX `veterinary_visit_treatments_treatmentId_fkey`(`treatmentId`),
    CONSTRAINT `veterinary_visit_treatments_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `veterinary_visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `veterinary_visit_treatments_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `veterinary_treatments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: veterinary_appointments
CREATE TABLE `veterinary_appointments` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `appointmentDate` DATETIME(3) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NULL,
    `plannedTreatments` TEXT NULL,
    `notes` TEXT NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `veterinary_appointments_catId_fkey`(`catId`),
    INDEX `veterinary_appointments_hospitalId_fkey`(`hospitalId`),
    INDEX `veterinary_appointments_doctorId_fkey`(`doctorId`),
    CONSTRAINT `veterinary_appointments_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `veterinary_appointments_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `veterinary_hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `veterinary_appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `veterinary_doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: excretion_records
CREATE TABLE `excretion_records` (
    `id` VARCHAR(191) NOT NULL,
    `catId` VARCHAR(191) NOT NULL,
    `type` ENUM('URINE', 'FECES') NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `excretion_records_catId_idx`(`catId`),
    INDEX `excretion_records_recordedAt_idx`(`recordedAt`),
    INDEX `excretion_records_type_idx`(`type`),
    INDEX `excretion_records_catId_recordedAt_idx`(`catId`, `recordedAt`),
    INDEX `excretion_records_catId_type_idx`(`catId`, `type`),
    INDEX `excretion_records_recordedAt_type_idx`(`recordedAt`, `type`),
    INDEX `excretion_records_catId_recordedAt_type_idx`(`catId`, `recordedAt`, `type`),
    CONSTRAINT `excretion_records_catId_fkey` FOREIGN KEY (`catId`) REFERENCES `cats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
