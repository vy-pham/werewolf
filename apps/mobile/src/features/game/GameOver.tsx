import { useGame } from '@werewolf/client-core';
import { isWolfRole, type PlayerView } from '@werewolf/shared';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '@/components/theme';
import { Badge, Button, Card, styles } from '@/components/ui';
import { ReportPanel } from '@/features/reports/ReportPanel';
import { useNames } from './names';

export function GameOver({ result }: { result: PlayerView }) {
  const { t } = useTranslation();
  const name = useNames();
  const dismiss = useGame((s) => s.dismissResult);
  const won = result.me && result.winner === result.me.team;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card testID={`game-over-${result.winner ?? 'none'}`} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>
          {result.winner === 'wolves' ? '🐺' : result.winner === 'lovers' ? '💘' : '🏡'}
        </Text>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
          {result.winner ? t(`log.winner.${result.winner}`) : null}
        </Text>
        {result.me ? (
          <Text style={{ color: won ? colors.goodText : colors.badText }}>
            {won ? t('gameOver.youWon') : t('gameOver.youLost')}
          </Text>
        ) : null}
      </Card>
      <Card>
        {[...result.players]
          .sort((a, b) => a.seat - b.seat)
          .map((p) => (
            <View key={p.id} style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text
                style={{
                  color: p.alive ? colors.text : colors.faint,
                  textDecorationLine: p.alive ? 'none' : 'line-through',
                }}
              >
                {name(p.id)}
                {result.lovers?.includes(p.id) ? ' 💘' : ''}
              </Text>
              {p.role ? (
                <Badge tone={isWolfRole(p.role) ? 'bad' : 'good'} label={t(`roles.${p.role}`)} />
              ) : null}
            </View>
          ))}
      </Card>
      <ReportPanel latestOnly />
      <Button testID="back-to-room" title={t('gameOver.backToRoom')} onPress={dismiss} />
    </ScrollView>
  );
}
