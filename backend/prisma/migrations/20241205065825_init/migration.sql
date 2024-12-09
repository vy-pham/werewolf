-- AlterTable
ALTER TABLE "GameRoundAction" ADD COLUMN     "booleanResult" BOOLEAN,
ADD COLUMN     "statusResult" "GamePlayerStatus";

-- CreateTable
CREATE TABLE "RoleAbilities" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "total_uses" INTEGER NOT NULL,
    "uses_per_round" INTEGER NOT NULL,

    CONSTRAINT "RoleAbilities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoleAbilities" ADD CONSTRAINT "RoleAbilities_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
