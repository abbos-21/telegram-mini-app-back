/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "languageCode" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "referredById" INTEGER,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "firstName", "id", "telegramId", "username") SELECT "createdAt", "firstName", "id", "telegramId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
