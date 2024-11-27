-- CreateEnum
CREATE TYPE "GamePlayerStatus" AS ENUM ('alive', 'dead');

-- CreateEnum
CREATE TYPE "GameRoundActionTargetStatus" AS ENUM ('alive', 'dead');

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "virtual" TEXT,
    "role_id" INTEGER NOT NULL,
    "status" "GamePlayerStatus" NOT NULL DEFAULT 'alive',

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRoundAction" (
    "id" SERIAL NOT NULL,
    "game_round_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "target_id" INTEGER,
    "target_status" "GameRoundActionTargetStatus" NOT NULL,

    CONSTRAINT "GameRoundAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAction" ADD CONSTRAINT "GameRoundAction_game_round_id_fkey" FOREIGN KEY ("game_round_id") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAction" ADD CONSTRAINT "GameRoundAction_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "GamePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAction" ADD CONSTRAINT "GameRoundAction_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
