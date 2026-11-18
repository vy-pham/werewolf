import { expect, type Page, test } from '@playwright/test';
import { botStep, SHOTS, setTimers, setupRoom } from './helpers';

/**
 * M7: the extended roles in real browsers (Cupid, alpha wolf, fool, elder), then a report and the
 * player's stats. Bots: Cupid links the first two players it can pick, the alpha always infects.
 */
test('extended roles, report and stats', async ({ browser }) => {
  const { pages, host } = await setupRoom(browser, 6);
  await setTimers(host, {
    speakingSeconds: 10,
    voteSeconds: 10,
    nightActionSeconds: 15,
    defenseSeconds: 0,
  });

  // Custom role set: werewolf, alpha wolf, Cupid, fool, elder, villager.
  await host.getByTestId('roles-customize').click();
  const setRole = async (role: string, count: number) => {
    const counter = host.getByTestId(`role-${role}-count`);
    for (let i = 0; i < 8; i++) {
      const now = Number(await counter.textContent());
      if (now === count) return;
      await host.getByTestId(`role-${role}-${now < count ? 'inc' : 'dec'}`).click();
      await expect(counter).not.toHaveText(String(now));
    }
    throw new Error(`could not set ${role} to ${count}`);
  };
  for (const [role, count] of Object.entries({
    werewolf: 1,
    seer: 0,
    guard: 0,
    villager: 1,
    alpha_wolf: 1,
    cupid: 1,
    fool: 1,
    elder: 1,
  })) {
    await setRole(role, count);
  }

  await host.getByTestId('start-game').click();
  for (const page of pages) await expect(page.getByTestId('my-role')).toBeVisible();
  const roles = await Promise.all(
    pages.map((p) => p.getByTestId('my-role').getAttribute('data-role')),
  );
  expect([...roles].sort()).toEqual(
    ['alpha_wolf', 'cupid', 'elder', 'fool', 'villager', 'werewolf'].sort(),
  );
  const cupid = pages[roles.indexOf('cupid')] as Page;

  let sawCouple = false;
  const deadline = Date.now() + 200_000;
  while (Date.now() < deadline) {
    if ((await host.getByTestId('game-over').count()) > 0) break;
    await Promise.all(pages.map((p) => botStep(p).catch(() => false)));
    if (!sawCouple && (await cupid.getByTestId('lovers-card').count()) > 0) {
      sawCouple = true;
      await cupid.screenshot({ path: `${SHOTS}/m7-cupid.png`, fullPage: true });
    }
    await host.waitForTimeout(300);
  }
  expect(sawCouple).toBe(true);

  for (const page of pages) {
    await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 20_000 });
  }
  const winner = await host.getByTestId('winner').getAttribute('data-winner');
  expect(['village', 'wolves', 'lovers']).toContain(winner);
  // The alpha infected someone on night 1: one more werewolf than at the start.
  const finalRoles = await host
    .locator('[data-testid="game-over"] li')
    .allTextContents()
    .then((rows) => rows.filter((r) => /Werewolf|Ma sói/.test(r)).length);
  expect(finalRoles).toBeGreaterThanOrEqual(2);

  // Report a player from the result screen.
  const reporter = pages[1] as Page;
  const panel = reporter.getByTestId('report-panel');
  await expect(panel).toBeVisible();
  await panel.getByTestId('report-open').first().click();
  await panel.getByTestId('report-reason').selectOption('afk');
  await panel.getByTestId('report-send').click();
  await expect(panel.getByTestId('report-row').first()).toContainText(/Reported|Đã báo cáo/);
  await reporter.screenshot({ path: `${SHOTS}/m7-report.png`, fullPage: true });

  // Stats on the home page.
  await reporter.goto('/');
  await expect(reporter.getByTestId('stats-summary')).toContainText(/^1 /);
});
