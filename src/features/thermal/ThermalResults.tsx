import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import ResultRow from '../../components/ResultRow';
import SectionTitle from '../../components/SectionTitle';
import type { ThermalResult, COSTICResult } from '../../types/thermal';

function isCOSTIC(r: ThermalResult | COSTICResult): r is COSTICResult {
  return 'elements' in r;
}

interface Props {
  result: ThermalResult | COSTICResult;
}

export default function ThermalResults({ result }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const costic = isCOSTIC(result);

  const minKW = costic ? result.minRecommendedKW : result.minRecommendedKW;
  const maxKW = costic ? result.maxRecommendedKW : result.maxRecommendedKW;
  const margin = costic ? result.safetyMarginPct : result.safetyMarginPct;
  const totalKW = costic ? result.totalKW : result.powerKW;
  const totalW = costic ? result.totalW : result.powerW;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: spacing.lg,
        },
        recommendBox: {
          backgroundColor: colors.accentSubtle,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent,
          padding: spacing.md,
          marginBottom: spacing.md,
          alignItems: 'center',
        },
        recommendLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        recommendValue: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xxl,
          fontWeight: typography.weight.bold,
          color: colors.accent,
        },
        recommendUnit: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.md,
          color: colors.textSecondary,
        },
        marginBadge: {
          marginTop: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: radius.pill,
          backgroundColor: colors.green + '22',
          alignSelf: 'center',
        },
        marginText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.green,
        },
        costicBadge: {
          marginTop: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: radius.pill,
          backgroundColor: colors.accent + '22',
          alignSelf: 'center',
        },
        costicBadgeText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.accent,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.sm,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <View style={styles.container}>
      <Card elevated>
        {/* Main recommendation */}
        <View style={styles.recommendBox}>
          <Text style={styles.recommendLabel}>Puissance conseillée</Text>
          <Text style={styles.recommendValue}>
            {minKW}
            <Text style={styles.recommendUnit}> – </Text>
            {maxKW}
            <Text style={styles.recommendUnit}> kW</Text>
          </Text>
          <View style={styles.marginBadge}>
            <Text style={styles.marginText}>Marge de sécurité {margin} %</Text>
          </View>
          {costic && (
            <View style={styles.costicBadge}>
              <Text style={styles.costicBadgeText}>
                Méthode COSTIC — T ext. {result.tExtC} °C
              </Text>
            </View>
          )}
        </View>

        {/* Base power */}
        <ResultRow
          label="Puissance de base calculée"
          value={String(totalW)}
          unit="W"
        />
        <ResultRow
          label="Puissance de base calculée"
          value={String(totalKW)}
          unit="kW"
          highlighted
        />

        <View style={styles.separator} />

        {costic ? (
          /* COSTIC element-by-element breakdown */
          <>
            <SectionTitle title="Détail par élément" />
            {result.elements.map((el) => (
              <ResultRow
                key={el.label}
                label={el.label}
                value={String(el.watts)}
                unit="W"
                valueColor="blue"
              />
            ))}
          </>
        ) : (
          /* Quick / Detailed breakdown */
          <>
            <SectionTitle title="Détail des apports" />
            <ResultRow
              label="Parois + plafond + sol"
              value={String(result.breakdown.envelopeW)}
              unit="W"
              valueColor="blue"
            />
            <ResultRow
              label="Infiltrations / renouvellement d'air"
              value={String(result.breakdown.infiltrationW)}
              unit="W"
              valueColor="orange"
            />
            <ResultRow
              label="Apports internes"
              value={String(result.breakdown.internalLoadsW)}
              unit="W"
              valueColor="green"
            />
          </>
        )}
      </Card>
    </View>
  );
}
