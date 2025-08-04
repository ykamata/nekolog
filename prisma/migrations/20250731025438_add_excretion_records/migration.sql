-- CreateTable
CREATE TABLE "excretion_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "excretion_records_catId_fkey" FOREIGN KEY ("catId") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
