-- DropForeignKey
ALTER TABLE "GamePlayer" DROP CONSTRAINT "GamePlayer_game_id_fkey";

-- DropForeignKey
ALTER TABLE "GameRoleAbilities" DROP CONSTRAINT "GameRoleAbilities_game_id_fkey";

-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_game_id_fkey";

-- DropForeignKey
ALTER TABLE "GameRoundAction" DROP CONSTRAINT "GameRoundAction_game_round_id_fkey";

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoleAbilities" ADD CONSTRAINT "GameRoleAbilities_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundAction" ADD CONSTRAINT "GameRoundAction_game_round_id_fkey" FOREIGN KEY ("game_round_id") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
