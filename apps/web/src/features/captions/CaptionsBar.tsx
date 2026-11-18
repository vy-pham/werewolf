import { attempt, captionLangOf } from '@werewolf/client-core';
import { CAPTION_LANGS, type CaptionLang } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../components/ui';
import { updateMe } from '../../lib/client';
import { useGame } from '../../stores/game';
import { useSession } from '../../stores/session';

/**
 * Live AI captions (room setting `captions`). The server sends only captions of channels this
 * player can hear, already translated into their caption language.
 */
export function CaptionsBar() {
  const { t } = useTranslation();
  const enabled = useGame((s) => s.room?.settings.captions ?? false);
  const captions = useGame((s) => s.captions);
  const visible = useGame((s) => s.captionsVisible);
  const setVisible = useGame((s) => s.setCaptionsVisible);
  const user = useSession((s) => s.user);
  if (!enabled || !user) return null;

  const preference = user.captionLangs[0] ?? 'auto';
  const setLang = (value: string) =>
    attempt(t, () => updateMe({ captionLangs: value === 'auto' ? [] : [value as CaptionLang] }));

  return (
    <Card className="space-y-2" data-testid="captions-bar" data-visible={visible}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={visible ? 'secondary' : 'ghost'}
          className="px-2 py-1 text-xs"
          data-testid="captions-toggle"
          onClick={() => setVisible(!visible)}
        >
          CC · {visible ? t('captions.hide') : t('captions.show')}
        </Button>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-gray-300 text-xs">
          {t('captions.language')}
          <select
            value={preference}
            data-testid="captions-lang"
            onChange={(e) => setLang(e.target.value)}
            className="rounded-md border border-white/20 bg-transparent px-2 py-1"
          >
            <option value="auto" className="text-black">
              {t('captions.auto', {
                lang: t(`captions.langName.${captionLangOf({ ...user, captionLangs: [] })}`),
              })}
            </option>
            {CAPTION_LANGS.map((l) => (
              <option key={l} value={l} className="text-black">
                {t(`captions.langName.${l}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {visible ? (
        <ul className="min-h-12 space-y-1" aria-live="polite">
          {captions.length === 0 ? (
            <li className="text-gray-500 text-sm">{t('captions.waiting')}</li>
          ) : (
            captions.map((c) => (
              <li key={c.id} className="text-sm" data-testid="caption" data-lang={c.lang}>
                <span className="font-semibold text-amber-300">{c.speakerName}</span>
                {c.channel === 'wolves' || c.channel === 'dead' ? (
                  <span className="text-gray-400 text-xs"> · {t(`chat.channel.${c.channel}`)}</span>
                ) : null}
                <span>: {c.text}</span>
                {c.text !== c.original ? (
                  <span
                    className="block text-gray-500 text-xs"
                    title={t('captions.translatedFrom', { lang: c.sourceLang })}
                  >
                    {c.original}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </Card>
  );
}
