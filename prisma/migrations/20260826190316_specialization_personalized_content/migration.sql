-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiagnosticTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT,
    "order" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "taskText" TEXT NOT NULL,
    "isBroken" BOOLEAN NOT NULL,
    "fixRubric" JSONB,
    CONSTRAINT "DiagnosticTask_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiagnosticTask" ("fixRubric", "id", "isBroken", "level", "moduleId", "order", "taskText") SELECT "fixRubric", "id", "isBroken", "level", "moduleId", "order", "taskText" FROM "DiagnosticTask";
DROP TABLE "DiagnosticTask";
ALTER TABLE "new_DiagnosticTask" RENAME TO "DiagnosticTask";
CREATE UNIQUE INDEX "DiagnosticTask_moduleId_userId_order_key" ON "DiagnosticTask"("moduleId", "userId", "order");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctOptionId" TEXT,
    "rubric" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("correctOptionId", "id", "moduleId", "options", "order", "points", "prompt", "rubric", "type") SELECT "correctOptionId", "id", "moduleId", "options", "order", "points", "prompt", "rubric", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE UNIQUE INDEX "Question_moduleId_userId_order_key" ON "Question"("moduleId", "userId", "order");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "specialization" TEXT NOT NULL DEFAULT 'Компьютерные науки',
    "university" TEXT NOT NULL DEFAULT 'Университет им. М. Ауэзова (Шымкент)',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "department", "email", "firstName", "id", "lastName", "passwordHash", "university") SELECT "createdAt", "department", "email", "firstName", "id", "lastName", "passwordHash", "university" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
