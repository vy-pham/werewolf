/*
  Warnings:

  - Added the required column `turn_of` to the `GameRoundAction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GameRoundAction" DROP CONSTRAINT "GameRoundAction_actor_id_fkey";

-- AlterTable
ALTER TABLE "GameRoundAction" ADD COLUMN     "turn_of" "Roles" NOT NULL,
ALTER COLUMN "actor_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GameRoundAction" ADD CONSTRAINT "GameRoundAction_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
