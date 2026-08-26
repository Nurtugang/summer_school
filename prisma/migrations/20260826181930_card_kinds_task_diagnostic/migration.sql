/*
  Warnings:

  - Added the required column `draftJson` to the `Card` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "DiagnosticTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "taskText" TEXT NOT NULL,
    "isBroken" BOOLEAN NOT NULL,
    "fixRubric" JSONB,
    CONSTRAINT "DiagnosticTask_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosticAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "answersJson" JSONB NOT NULL,
    "breakdownJson" JSONB NOT NULL,
    "scorePercent" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scored',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticAttempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'alignment_card',
    "contextJson" JSONB NOT NULL,
    "draftJson" JSONB NOT NULL,
    "cardJson" JSONB NOT NULL,
    "critiqueJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Card_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("cardJson", "contextJson", "createdAt", "critiqueJson", "id", "moduleId", "status", "updatedAt", "userId") SELECT "cardJson", "contextJson", "createdAt", "critiqueJson", "id", "moduleId", "status", "updatedAt", "userId" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE TABLE "new_Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "hasWizard" BOOLEAN NOT NULL DEFAULT false,
    "hasTaskWizard" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Module_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Module" ("dayId", "hasWizard", "id", "order", "pdfUrl", "title") SELECT "dayId", "hasWizard", "id", "order", "pdfUrl", "title" FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Module" RENAME TO "Module";
CREATE UNIQUE INDEX "Module_dayId_order_key" ON "Module"("dayId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticTask_moduleId_order_key" ON "DiagnosticTask"("moduleId", "order");
