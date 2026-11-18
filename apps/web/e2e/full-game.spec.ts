import { type Browser, expect, type Page, test } from '@playwright/test';

const PLAYERS = 8;
const SHOTS = 'e2e/screenshots';

async function signIn(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.goto('/');
  await page.getByTestId('nickname').fill(name);
  await page.getByTestId('play-as-guest').click();
  await expect(page.getByTestId('current-user')).toHaveText(name);
  return page;
}

/**
 * One bot step for one browser: wolves bite the first selectable player, the current speaker
 * ends their turn, everybody else skips. Returns true if it clicked something.
 */
async function botStep(page: Page): Promise<boolean> {
  const panel = page.getByTestId('action-panel');
  if ((await panel.count()) === 0) return false;
  const action = await panel.getAttribute('data-action');
  const submitted = (await panel.getAttribute('data-submitted')) === 'true';
  if (!action) return false;
  if (action === 'END_TURN') {
    await page.getByTestId('action-confirm').click();
    return true;
  }
  if (submitted) return false;
  if (action === 'WOLF_VOTE') {
    const prey = page.locator('[data-testid="player-card"][data-selectable="true"]').first();
    if ((await prey.count()) === 0) return false;
    await prey.click();
    await page.getByTestId('action-confirm').click();
    return true;
  }
  await page.getByTestId('action-skip').click();
  return true;
}

test('8 players play a full game in their browsers', async ({ browser }) => {
  const pages: Page[] = [];
  for (let i = 0; i < PLAYERS; i++) pages.push(await signIn(browser, `Player${i + 1}`));
  const [host, ...guests] = pages as [Page, ...Page[]];

  // Host creates a room; everyone joins with the code and gets ready.
  await host.getByTestId('create-room').click();
  await host.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  for (const page of guests) {
    await page.goto(`/r/${code}`);
    await expect(page.getByTestId('toggle-ready')).toBeVisible();
    await page.getByTestId('toggle-ready').click();
  }
  await expect(host.getByTestId('member')).toHaveCount(PLAYERS);

  // Faster timers so the test does not take ages.
  for (const [key, value] of [
    ['speakingSeconds', '10'],
    ['voteSeconds', '10'],
    ['nightActionSeconds', '15'],
    ['defenseSeconds', '0'],
  ] as const) {
    await host.getByTestId(`timer-${key}`).fill(value);
    await host.getByTestId(`timer-${key}`).blur();
  }
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
  const visibleRoles = async () =>
    villager.locator('[data-testid="player-card"]:not([data-role=""])').count();

  let shotTaken = false;
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if ((await host.getByTestId('game-over').count()) > 0) break;
    await Promise.all(pages.map((p) => botStep(p).catch(() => false)));

    const phase = await host
      .getByTestId('phase-name')
      .getAttribute('data-phase')
      .catch(() => null);
    if (phase !== 'GAME_OVER' && phase !== null) expect(await visibleRoles()).toBe(1);
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
