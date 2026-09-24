import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import type { DiagnosticResult } from '../../types/diagnostic';

interface Props {
  results: DiagnosticResult[];
}

function scoreColor(score: number): string {
  if (score >= 70) return '#EF4444'; // rouge — signal fort
  if (score >= 45) return '#F59E0B'; // ambre — signal modéré
  return '#6B7280';                  // gris  — signal faible
}

export default function DiagnosticResults({ results }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        disclaimer: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          fontStyle: 'italic',
          marginBottom: spacing.md,
        },
        emptyText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          textAlign: 'center',
          paddingVertical: spacing.lg,
        },
        resultCard: {
          marginBottom: spacing.sm,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
        },
        faultLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
          flex: 1,
          marginRight: spacing.sm,
        },
        scoreBadge: {
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          minWidth: 48,
          alignItems: 'center',
        },
        scoreText: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: '#fff',
        },
        description: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        symptomsTitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
          color: colors.textMuted,
          marginBottom: 4,
          marginTop: spacing.xs,
        },
        symptomRow: {
          flexDirection: 'row',
          marginLeft: spacing.sm,
          marginBottom: 2,
        },
        symptomBullet: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textSecondary,
          marginRight: 4,
        },
        symptomMeasured: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textPrimary,
          fontWeight: typography.weight.bold,
          flex: 1,
        },
        symptomRef: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          flex: 1,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.sm,
        },
        recLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.bold,
          color: colors.textMuted,
          marginBottom: 2,
        },
        recommendation: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          fontStyle: 'italic',
        },
      }),
    [colors, spacing, radius, typography],
  );

  if (results.length === 0) {
    return (
      <Card>
        <Text style={styles.emptyText}>
          Aucune anomalie significative détectée avec ces valeurs.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <SectionTitle title="Pistes à investiguer" />
      <Text style={styles.disclaimer}>
        Le % indique à quel point vos mesures correspondent à chaque anomalie type.
        Plus c’est élevé, plus la piste mérite d’être vérifiée sur le terrain.
      </Text>
      {results.map((r) => {
        const color = scoreColor(r.score);
        return (
          <Card key={r.faultId} style={styles.resultCard}>
            <View style={styles.header}>
              <Text style={styles.faultLabel}>{r.label}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: color }]}>
                <Text style={styles.scoreText}>{r.score} %</Text>
              </View>
            </View>

            <Text style={styles.description}>{r.description}</Text>

            {r.symptoms.length > 0 && (
              <>
                <Text style={styles.symptomsTitle}>MESURES CONCERNÉES</Text>
                {r.symptoms.map((s, i) => {
                  // Split on "  (" to separate measured value from reference
                  const parts = s.split('  (');
                  const measured = parts[0];
                  const ref = parts[1] ? `(${parts[1]}` : undefined;
                  return (
                    <View key={i} style={styles.symptomRow}>
                      <Text style={styles.symptomBullet}>•</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.symptomMeasured}>{measured}</Text>
                        {ref ? <Text style={styles.symptomRef}>{ref}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            <View style={styles.separator} />

            <Text style={styles.recLabel}>À VÉRIFIER SUR LE TERRAIN</Text>
            <Text style={styles.recommendation}>{r.recommendation}</Text>
          </Card>
        );
      })}
    </>
  );
}
