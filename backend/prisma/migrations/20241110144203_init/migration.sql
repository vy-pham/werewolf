-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'inactive');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Roles" ADD VALUE 'villager';
ALTER TYPE "Roles" ADD VALUE 'hunter';
ALTER TYPE "Roles" ADD VALUE 'cupid';
ALTER TYPE "Roles" ADD VALUE 'little_girl';
ALTER TYPE "Roles" ADD VALUE 'elder';
ALTER TYPE "Roles" ADD VALUE 'tanner';
ALTER TYPE "Roles" ADD VALUE 'village_idiot';
ALTER TYPE "Roles" ADD VALUE 'wild_child';

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'active';
