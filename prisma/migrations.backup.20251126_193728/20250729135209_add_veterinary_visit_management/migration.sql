-- CreateTable
CREATE TABLE "veterinary_visits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catId" TEXT NOT NULL,
    "visitDate" DATETIME NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "doctorId" TEXT,
    "cost" REAL NOT NULL,
    "notes" TEXT,
    "hasBloodTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veterinary_visits_catId_fkey" FOREIGN KEY ("catId") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "veterinary_visits_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "veterinary_hospitals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "veterinary_visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "veterinary_doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "veterinary_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catId" TEXT NOT NULL,
    "appointmentDate" DATETIME NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "doctorId" TEXT,
    "plannedTreatments" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veterinary_appointments_catId_fkey" FOREIGN KEY ("catId") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "veterinary_appointments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "veterinary_hospitals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "veterinary_appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "veterinary_doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "veterinary_hospitals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "veterinary_doctors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "hospitalId" TEXT,
    "specialization" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "veterinary_doctors_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "veterinary_hospitals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "veterinary_treatments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "veterinary_visit_treatments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    CONSTRAINT "veterinary_visit_treatments_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "veterinary_visits" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "veterinary_visit_treatments_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "veterinary_treatments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_hospitals_name_key" ON "veterinary_hospitals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_treatments_name_key" ON "veterinary_treatments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "veterinary_visit_treatments_visitId_treatmentId_key" ON "veterinary_visit_treatments"("visitId", "treatmentId");
