import { type Browser, expect, type Page } from '@playwright/test';

export const SHOTS = 'e2e/screenshots';

/** A fresh browser context signed in as a guest. Page errors fail the test. */
export async function signIn(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext({ permissions: ['microphone'] });
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

/** Signs in `count` players; the first creates a room, the others join and get ready. */
export async function setupRoom(browser: Browser, count: number) {
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) pages.push(await signIn(browser, `Player${i + 1}`));
  const [host, ...guests] = pages as [Page, ...Page[]];
  await host.getByTestId('create-room').click();
  await host.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  for (const page of guests) {
    await page.goto(`/r/${code}`);
    await expect(page.getByTestId('toggle-ready')).toBeVisible();
    await page.getByTestId('toggle-ready').click();
  }
  await expect(host.getByTestId('member')).toHaveCount(count);
  return { pages, host, guests, code };
}

/** Host sets timers (seconds) in the room settings. */
export async function setTimers(host: Page, timers: Record<string, number>) {
  for (const [key, value] of Object.entries(timers)) {
    await host.getByTestId(`timer-${key}`).fill(String(value));
    await host.getByTestId(`timer-${key}`).blur();
  }
}

/**
 * One bot step for one browser: wolves bite the first selectable player, the current speaker
 * ends their turn, everybody else skips. Returns true if it clicked something.
 */
export async function botStep(page: Page): Promise<boolean> {
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

export const phaseOf = (page: Page) =>
  page
    .getByTestId('phase-name')
    .getAttribute('data-phase', { timeout: 1000 })
    .catch(() => null);
