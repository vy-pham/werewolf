-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_game_id_fkey";

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
