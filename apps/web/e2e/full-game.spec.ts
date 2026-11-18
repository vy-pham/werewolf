import { expect, type Page, test } from '@playwright/test';
import { botStep, SHOTS, setTimers, setupRoom } from './helpers';

const PLAYERS = 8;

test('8 players play a full game in their browsers', async ({ browser }) => {
  const { pages, host } = await setupRoom(browser, PLAYERS);

  // Faster timers so the test does not take ages.
  await setTimers(host, {
    speakingSeconds: 10,
    voteSeconds: 10,
    nightActionSeconds: 15,
    defenseSeconds: 0,
  });
  await host.screenshot({ path: `${SHOTS}/1-lobby.png`, fullPage: true });

  await expect(host.getByTestId('start-game')).toBeEnabled();
  await host.getByTestId('start-game').click();

  // Everyone sees their own role, and exactly two players are wolves.
  for (const page of pages) await expect(page.getByTestId('my-role')).toBeVisible();
  const roles = await Promise.all(
    pages.map((p) => p.getByTestId('my-role').getAttribute('data-role')),
  );
  expect(roles.filter((r) => r === 'werewolf')).toHaveLength(2);

  // A villager never sees anyone else's role during the game.
  const villager = pages[roles.indexOf('villager')] as Page;
  // Roles visible on the villager's own screen, or null at GAME_OVER (everything is revealed).
  // Read phase and cards from the SAME page: another page may already be one phase ahead.
  const villagerKnownRoles = () =>
    villager.evaluate(() => {
      const phase = document
        .querySelector('[data-testid="phase-name"]')
        ?.getAttribute('data-phase');
      if (!phase || phase === 'GAME_OVER') return null;
      return document.querySelectorAll('[data-testid="player-card"]:not([data-role=""])').length;
    });

  let shotTaken = false;
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if ((await host.getByTestId('game-over').count()) > 0) break;
    await Promise.all(pages.map((p) => botStep(p).catch(() => false)));

    const phase = await host
      .getByTestId('phase-name')
      .getAttribute('data-phase')
      .catch(() => null);
    const known = await villagerKnownRoles();
    if (known !== null) expect(known).toBe(1);
    if (!shotTaken && phase === 'DISCUSSION') {
      // The host's timer change (10 s per speaker) must have been applied.
      const left = Number((await host.getByTestId('countdown').textContent())?.replace('s', ''));
      expect(left).toBeLessThanOrEqual(11); // 30 by default; +1 for the 250 ms UI tick and rounding up
      await host.screenshot({ path: `${SHOTS}/2-discussion.png`, fullPage: true });
      shotTaken = true;
    }
    await host.waitForTimeout(300);
  }

  // Everyone gets the result screen with every role revealed.
  for (const page of pages) {
    await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('winner')).toHaveAttribute('data-winner', 'wolves');
  }
  await host.screenshot({ path: `${SHOTS}/3-game-over.png`, fullPage: true });

  // Back to the room for another game.
  await host.getByTestId('back-to-room').click();
  await expect(host.getByTestId('start-game')).toBeVisible();
});
