-- AlterTable
ALTER TABLE "Card" ADD COLUMN "critiqueJson" JSONB;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "defenseNote" TEXT;
ALTER TABLE "Review" ADD COLUMN "defenseScore" INTEGER;

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctOptionId" TEXT,
    "rubric" JSONB,
    "points" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "answersJson" JSONB NOT NULL,
    "breakdownJson" JSONB NOT NULL,
    "scorePercent" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scored',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_moduleId_order_key" ON "Question"("moduleId", "order");
