/*
  Warnings:

  - You are about to drop the column `specialization` on the `veterinary_doctors` table. All the data in the column will be lost.
  - Added the required column `userId` to the `veterinary_doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `veterinary_hospitals` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_veterinary_doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hospitalId" TEXT,
    "specialty" TEXT,
    "memo" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veterinary_doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "veterinary_doctors_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "veterinary_hospitals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_veterinary_doctors" ("createdAt", "hospitalId", "id", "name", "updatedAt") SELECT "createdAt", "hospitalId", "id", "name", "updatedAt" FROM "veterinary_doctors";
DROP TABLE "veterinary_doctors";
ALTER TABLE "new_veterinary_doctors" RENAME TO "veterinary_doctors";
CREATE UNIQUE INDEX "veterinary_doctors_name_key" ON "veterinary_doctors"("name");
CREATE TABLE "new_veterinary_hospitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "memo" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veterinary_hospitals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_veterinary_hospitals" ("address", "createdAt", "id", "name", "phone", "updatedAt") SELECT "address", "createdAt", "id", "name", "phone", "updatedAt" FROM "veterinary_hospitals";
DROP TABLE "veterinary_hospitals";
ALTER TABLE "new_veterinary_hospitals" RENAME TO "veterinary_hospitals";
CREATE UNIQUE INDEX "veterinary_hospitals_name_key" ON "veterinary_hospitals"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
