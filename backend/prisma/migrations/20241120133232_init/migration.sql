/*
  Warnings:

  - The values [doctor,cupid,little_girl,elder,tanner,village_idiot,wild_child] on the enum `Roles` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Roles_new" AS ENUM ('werewolf', 'villager', 'seer', 'guard', 'hunter', 'witch');
ALTER TABLE "Role" ALTER COLUMN "enum" TYPE "Roles_new" USING ("enum"::text::"Roles_new");
ALTER TYPE "Roles" RENAME TO "Roles_old";
ALTER TYPE "Roles_new" RENAME TO "Roles";
DROP TYPE "Roles_old";
COMMIT;
