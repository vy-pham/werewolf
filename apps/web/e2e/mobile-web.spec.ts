import { type Browser, expect, type Page, test } from '@playwright/test';
import { botStep, signIn } from './helpers';

/**
 * The Expo app (web export, http://127.0.0.1:8082) hosts a game that 5 web-app players join.
 * Proves both clients speak the same protocol and that the mobile UI can play a whole game.
 */
const MOBILE = 'http://127.0.0.1:8082';
const WEB = 'http://127.0.0.1:5173';

const testIdOf = (page: Page, prefix: string) =>
  page
    .locator(`[data-testid^="${prefix}"]`)
    .first()
    .getAttribute('data-testid', { timeout: 1000 })
    .catch(() => null);

async function mobileSignIn(browser: Browser, name: string) {
  const page = await (
    await browser.newContext({ viewport: { width: 412, height: 915 } })
  ).newPage();
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.goto(`${MOBILE}/`);
  await page.getByTestId('nickname').fill(name);
  await page.getByTestId('play-as-guest').click();
  await expect(page.getByTestId('current-user')).toHaveText(name);
  return page;
}

/** The mobile bot: same strategy as the web bot, reading state from testIDs. */
async function mobileBotStep(page: Page) {
  const panel = await testIdOf(page, 'action-panel-');
  if (!panel) return;
  if (panel.startsWith('action-panel-END_TURN')) {
    await page.getByTestId('action-confirm').click();
  } else if (panel === 'action-panel-WOLF_VOTE-open') {
    await page.locator('[data-testid="player-card-on"]').first().click();
    await page.getByTestId('action-confirm').click();
  } else if (panel.endsWith('-open')) {
    await page.getByTestId('action-skip').click();
  }
}

/** Taps the − button until the timer shows `target`. */
async function setMobileTimer(page: Page, key: string, target: number) {
  for (let i = 0; i < 10; i++) {
    const value = Number(await page.getByTestId(`timer-${key}`).textContent());
    if (value <= target) return;
    await page.getByTestId(`timer-${key}-dec`).click();
    await expect(page.getByTestId(`timer-${key}`)).not.toHaveText(String(value));
  }
}

test('the mobile app hosts a full game with 5 web players', async ({ browser }) => {
  const host = await mobileSignIn(browser, 'MobileHost');
  await host.getByTestId('create-room').click();
  await host.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';

  const guests: Page[] = [];
  for (let i = 0; i < 5; i++) {
    const page = await signIn(browser, `WebPlayer${i + 1}`);
    await page.goto(`${WEB}/r/${code}`);
    await page.getByTestId('toggle-ready').click();
    guests.push(page);
  }
  await expect(host.getByTestId('member')).toHaveCount(6);

  await setMobileTimer(host, 'speakingSeconds', 10);
  await setMobileTimer(host, 'voteSeconds', 10);
  await setMobileTimer(host, 'defenseSeconds', 0);
  await setMobileTimer(host, 'nightActionSeconds', 15);
  await host.screenshot({ path: 'e2e/screenshots/mobile-1-lobby.png', fullPage: true });

  await host.getByTestId('start-game').click();
  await expect.poll(() => testIdOf(host, 'my-role-'), { timeout: 20_000 }).toMatch(/^my-role-/);

  let shot = false;
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    if (await testIdOf(host, 'game-over-')) break;
    await Promise.all([
      mobileBotStep(host).catch(() => undefined),
      ...guests.map((g) => botStep(g).catch(() => false)),
    ]);
    if (!shot && (await testIdOf(host, 'phase-'))?.startsWith('phase-NIGHT')) {
      await host.screenshot({ path: 'e2e/screenshots/mobile-2-night.png', fullPage: true });
      shot = true;
    }
    await host.waitForTimeout(300);
  }

  await expect
    .poll(() => testIdOf(host, 'game-over-'), { timeout: 20_000 })
    .toBe('game-over-wolves');
  for (const g of guests) {
    await expect(g.getByTestId('winner')).toHaveAttribute('data-winner', 'wolves', {
      timeout: 20_000,
    });
  }
  await host.screenshot({ path: 'e2e/screenshots/mobile-3-game-over.png', fullPage: true });
  await host.getByTestId('back-to-room').click();
  await expect(host.getByTestId('start-game')).toBeVisible();
});
