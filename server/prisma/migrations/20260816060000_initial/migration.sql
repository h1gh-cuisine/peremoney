CREATE TYPE "UserRole" AS ENUM ('MASTER', 'FULL', 'LIMITED');
CREATE TYPE "ProjectType" AS ENUM ('VDL', 'PACKAGE', 'NUMBERS');

CREATE TABLE "Cabinet" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "providerProjectId" INTEGER,
  "type" "ProjectType" NOT NULL,
  "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "contactsVisible" BOOLEAN NOT NULL DEFAULT true,
  "sourcesVisible" BOOLEAN NOT NULL DEFAULT true,
  "scriptVisible" BOOLEAN NOT NULL DEFAULT true,
  "financeVisible" BOOLEAN NOT NULL DEFAULT true,
  "settingsVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "login" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "cabinetId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE INDEX "User_cabinetId_idx" ON "User"("cabinetId");
CREATE INDEX "Cabinet_providerProjectId_idx" ON "Cabinet"("providerProjectId");
ALTER TABLE "User" ADD CONSTRAINT "User_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
