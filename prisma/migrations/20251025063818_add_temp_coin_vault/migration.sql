/*
  Warnings:

  - You are about to drop the column `lastMinedAt` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" INTEGER NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "miningStarted" DATETIME,
    "referredById" INTEGER,
    "lastMiningTick" DATETIME,
    "tempCoins" INTEGER NOT NULL DEFAULT 0,
    "vaultCapacity" INTEGER NOT NULL DEFAULT 120,
    CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("coins", "createdAt", "firstName", "id", "isBot", "languageCode", "lastName", "referredById", "telegramId", "tempCoins", "updatedAt", "username") SELECT "coins", "createdAt", "firstName", "id", "isBot", "languageCode", "lastName", "referredById", "telegramId", "tempCoins", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
