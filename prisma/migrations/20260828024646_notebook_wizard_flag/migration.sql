-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Module" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "hasWizard" BOOLEAN NOT NULL DEFAULT false,
    "hasTaskWizard" BOOLEAN NOT NULL DEFAULT false,
    "hasPentagramWizard" BOOLEAN NOT NULL DEFAULT false,
    "hasDiagnostic" BOOLEAN NOT NULL DEFAULT true,
    "hasCaseWizard" BOOLEAN NOT NULL DEFAULT false,
    "hasNotebookWizard" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Module_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Module" ("dayId", "hasCaseWizard", "hasDiagnostic", "hasPentagramWizard", "hasTaskWizard", "hasWizard", "id", "order", "pdfUrl", "title") SELECT "dayId", "hasCaseWizard", "hasDiagnostic", "hasPentagramWizard", "hasTaskWizard", "hasWizard", "id", "order", "pdfUrl", "title" FROM "Module";
DROP TABLE "Module";
ALTER TABLE "new_Module" RENAME TO "Module";
CREATE UNIQUE INDEX "Module_dayId_order_key" ON "Module"("dayId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

