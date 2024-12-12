-- CreateTable
CREATE TABLE "GameRoleAbilities" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "total_uses" INTEGER NOT NULL,
    "uses_per_round" INTEGER NOT NULL,

    CONSTRAINT "GameRoleAbilities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameRoleAbilities" ADD CONSTRAINT "GameRoleAbilities_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
