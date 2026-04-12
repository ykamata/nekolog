-- CreateTable
CREATE TABLE `daily_note_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dailyNoteId` INTEGER NOT NULL,
    `eventType` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_note_events_dailyNoteId_idx`(`dailyNoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_note_events` ADD CONSTRAINT `daily_note_events_dailyNoteId_fkey` FOREIGN KEY (`dailyNoteId`) REFERENCES `daily_notes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
