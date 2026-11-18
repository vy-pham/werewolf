import { attempt, captionLangOf, useGame } from '@werewolf/client-core';
import { CAPTION_LANGS, type CaptionLang } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Button, Card, Muted, styles } from '@/components/ui';
import { updateMe, useSession } from '@/lib/client';

/** Live AI captions (same behaviour as the web app's CaptionsBar). */
export function CaptionsBar() {
  const { t } = useTranslation();
  const enabled = useGame((s) => s.room?.settings.captions ?? false);
  const captions = useGame((s) => s.captions);
  const visible = useGame((s) => s.captionsVisible);
  const setVisible = useGame((s) => s.setCaptionsVisible);
  const user = useSession((s) => s.user);
  if (!enabled || !user) return null;

  const preference = user.captionLangs[0] ?? 'auto';
  const options = ['auto', ...CAPTION_LANGS] as const;
  const labelOf = (o: (typeof options)[number]) =>
    o === 'auto'
      ? t('captions.auto', {
          lang: t(`captions.langName.${captionLangOf({ ...user, captionLangs: [] })}`),
        })
      : t(`captions.langName.${o}`);
  const setLang = (o: (typeof options)[number]) =>
    attempt(t, () => updateMe({ captionLangs: o === 'auto' ? [] : [o as CaptionLang] }));

  return (
    <Card testID={`captions-bar-${visible ? 'on' : 'off'}`}>
      <View style={styles.row}>
        <Button
          testID="captions-toggle"
          variant={visible ? 'secondary' : 'ghost'}
          title={`CC · ${visible ? t('captions.hide') : t('captions.show')}`}
          onPress={() => setVisible(!visible)}
        />
      </View>
      <View style={styles.row}>
        {options.map((o) => (
          <Button
            key={o}
            testID={`captions-lang-${o}${preference === o ? '-on' : ''}`}
            variant={preference === o ? 'secondary' : 'ghost'}
            title={labelOf(o)}
            onPress={() => setLang(o)}
          />
        ))}
      </View>
      {visible ? (
        captions.length === 0 ? (
          <Muted>{t('captions.waiting')}</Muted>
        ) : (
          captions.map((c) => (
            <View key={c.id} testID={`caption-${c.lang}`}>
              <Text style={{ color: colors.text }}>
                <Text style={{ color: colors.moon, fontWeight: '600' }}>{c.speakerName}</Text>
                {c.channel === 'wolves' || c.channel === 'dead'
                  ? ` · ${t(`chat.channel.${c.channel}`)}`
                  : ''}
                {`: ${c.text}`}
              </Text>
              {c.text !== c.original ? (
                <Text style={{ color: colors.faint, fontSize: 12 }}>{c.original}</Text>
              ) : null}
            </View>
          ))
        )
      ) : null}
    </Card>
  );
}
