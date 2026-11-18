import { expect, type Page, test } from '@playwright/test';
import { RoomServiceClient } from 'livekit-server-sdk';
import { botStep, phaseOf, SHOTS, setTimers, setupRoom } from './helpers';

/**
 * Voice with a REAL LiveKit server (`pnpm infra:up`) and fake microphones. Checks both what each
 * browser plays and what LiveKit itself allows (permissions, published tracks).
 */
const LIVEKIT_HTTP = 'http://127.0.0.1:7880';
const livekit = new RoomServiceClient(LIVEKIT_HTTP, 'devkey', 'secret');

const status = (page: Page, channel: string) =>
  page
    .locator(`[data-testid="voice-channel"][data-channel="${channel}"]`)
    .getAttribute('data-status', { timeout: 1000 })
    .catch(() => null);

const remoteAudio = async (page: Page) =>
  Number(await page.getByTestId('voice-bar').getAttribute('data-remote-audio'));

async function participants(suffix: string) {
  const rooms = await livekit.listRooms();
  const room = rooms.find((r) => r.name.endsWith(suffix));
  return room ? livekit.listParticipants(room.name) : [];
}

test.beforeAll(async () => {
  const up = await fetch(LIVEKIT_HTTP).then(
    () => true,
    () => false,
  );
  test.skip(!up, 'LiveKit is not running: start it with `pnpm infra:up`');
});

test('voice follows the game: wolves whisper at night, one speaker by day', async ({ browser }) => {
  const { pages, host } = await setupRoom(browser, 6);
  await setTimers(host, { nightActionSeconds: 40, speakingSeconds: 30 });

  // ── Lobby: everybody talks and hears the 5 others ──
  for (const page of pages) await page.getByTestId('voice-join').click();
  for (const page of pages) {
    await expect.poll(() => status(page, 'lobby')).toBe('talk');
    await expect.poll(() => remoteAudio(page), { timeout: 30_000 }).toBe(5);
  }
  await host.screenshot({ path: `${SHOTS}/voice-1-lobby.png`, fullPage: true });

  // ── Night: only the wolves talk, privately ──
  await host.getByTestId('start-game').click();
  await expect.poll(() => phaseOf(host), { timeout: 30_000 }).toBe('NIGHT');
  const roles = await Promise.all(
    pages.map((p) => p.getByTestId('my-role').getAttribute('data-role')),
  );
  const wolves = pages.filter((_, i) => roles[i] === 'werewolf');
  const villagers = pages.filter((_, i) => roles[i] !== 'werewolf');
  expect(wolves).toHaveLength(2);

  for (const wolf of wolves) {
    await expect.poll(() => status(wolf, 'wolves')).toBe('talk');
    await expect.poll(() => status(wolf, 'main')).toBe('off');
    await expect.poll(() => remoteAudio(wolf), { timeout: 30_000 }).toBe(1); // the other wolf
  }
  for (const villager of villagers) {
    await expect.poll(() => status(villager, 'main')).toBe('off');
    expect(await status(villager, 'wolves')).toBeNull(); // no access to the wolves' room at all
    await expect.poll(() => remoteAudio(villager), { timeout: 30_000 }).toBe(0);
  }

  // What LiveKit enforces: 2 wolves publishing in the wolves' room; nobody may listen on main.
  await expect
    .poll(async () => {
      const ps = await participants('-wolves');
      return ps.filter((p) => p.permission?.canPublish && p.tracks.length > 0).length;
    })
    .toBe(2);
  await expect
    .poll(async () => {
      const ps = await participants('-main');
      return ps.length === 6 && ps.every((p) => p.permission?.canSubscribe === false);
    })
    .toBe(true);
  await wolves[0]?.screenshot({ path: `${SHOTS}/voice-2-night-wolf.png`, fullPage: true });

  // ── Day: let the night play out, then exactly one speaker holds the floor ──
  while ((await phaseOf(host)) !== 'DISCUSSION') {
    if ((await phaseOf(host)) === 'NIGHT')
      await Promise.all(pages.map((p) => botStep(p).catch(() => false)));
    await host.waitForTimeout(500);
  }
  const panels = await Promise.all(
    pages.map((p) => p.getByTestId('action-panel').getAttribute('data-action')),
  );
  const speaker = pages[panels.indexOf('END_TURN')] as Page;
  const listeners = pages.filter((p) => p !== speaker);

  await expect.poll(() => status(speaker, 'main')).toBe('talk');
  for (const listener of listeners) {
    await expect.poll(() => status(listener, 'main')).toBe('listen');
    // Everyone (alive or dead) hears exactly one voice on main: the speaker.
    await expect.poll(() => remoteAudio(listener), { timeout: 30_000 }).toBe(1);
  }
  await expect
    .poll(async () => {
      const ps = await participants('-main');
      return ps.filter((p) => p.tracks.length > 0 && p.permission?.canPublish).length;
    })
    .toBe(1);
  await speaker.screenshot({ path: `${SHOTS}/voice-3-discussion.png`, fullPage: true });
});
