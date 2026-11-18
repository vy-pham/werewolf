import { resolve } from 'node:path';
import { chromium, expect, test } from '@playwright/test';
import { SHOTS, signIn } from './helpers';

/**
 * AI captions end to end: real LiveKit (`pnpm infra:up`), the real Python worker
 * (`pnpm captions:dev`) and a browser whose fake microphone plays an English recording. Another
 * player, who reads captions in Vietnamese, must see the translated sentence.
 *
 * Opt-in (models are big and slow on CPU): `CAPTIONS_E2E=1 pnpm --filter @werewolf/web e2e captions`.
 */
const SPEECH = resolve(import.meta.dirname, 'fixtures/speech-en.wav');

test.beforeAll(async () => {
  test.skip(!process.env.CAPTIONS_E2E, 'set CAPTIONS_E2E=1 and run the captions worker');
  const up = await fetch('http://127.0.0.1:7880').then(
    () => true,
    () => false,
  );
  test.skip(!up, 'LiveKit is not running: start it with `pnpm infra:up`');
});

test('speech is captioned and translated for listeners', async ({ browser }) => {
  // The speaker gets its own browser: the fake microphone plays the recording in a loop.
  const speakerBrowser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${SPEECH}`,
    ],
  });
  try {
    const speaker = await signIn(speakerBrowser, 'Speaker');
    const listener = await signIn(browser, 'Listener');

    await speaker.getByTestId('create-room').click();
    await speaker.waitForURL(/\/r\/[A-Z0-9]{6}$/);
    const code = (await speaker.getByTestId('room-code').textContent())?.trim() ?? '';
    await listener.goto(`/r/${code}`);
    await expect(speaker.getByTestId('member')).toHaveCount(2);

    await speaker.getByTestId('setting-captions').click();
    await expect(speaker.getByTestId('setting-captions')).toBeChecked();
    await expect(listener.getByTestId('captions-bar')).toBeVisible();
    await listener.getByTestId('captions-lang').selectOption('vi');
    await expect(listener.getByTestId('captions-lang')).toHaveValue('vi');

    await speaker.getByTestId('voice-join').click();

    // Whisper + NLLB on CPU: allow a few loops of the recording.
    const caption = listener.locator('[data-testid="caption"][data-lang="vi"]').first();
    await expect(caption).toBeVisible({ timeout: 90_000 });
    const text = (await caption.textContent()) ?? '';
    expect(text).toContain('Speaker');
    // The English original (the fake mic loops the file, so it may start mid-sentence).
    expect(text.toLowerCase()).toMatch(/seer|night|player|werewolf|vote/);
    // The speaker (English UI) sees their own words untranslated.
    await expect(speaker.locator('[data-testid="caption"][data-lang="en"]').first()).toBeVisible({
      timeout: 30_000,
    });
    await listener.screenshot({ path: `${SHOTS}/captions-listener.png`, fullPage: true });
  } finally {
    await speakerBrowser.close();
  }
});
