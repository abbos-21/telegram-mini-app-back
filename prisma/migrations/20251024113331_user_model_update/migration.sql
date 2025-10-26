/*
  Warnings:

  - You are about to alter the column `telegramId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id", "telegramId") SELECT "id", "telegramId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
