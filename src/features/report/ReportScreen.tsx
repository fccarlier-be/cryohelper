import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { useReportContext } from '../../context/ReportContext';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import SignatureModal from '../../components/SignatureModal';
import { generateAndShareReport } from '../../services/reportGenerator';
import { loadBranding } from '../../services/brandingStorage';
import { saveHistoryEntry } from '../../services/historyStorage';
import { satPointFromPressure } from '../../services/thermoUtils';
import { DEFAULT_ACTIONS } from '../../types/report';
import type { ActionItem } from '../../types/report';
import type { CycleMetrics } from '../../types/history';
import type { CycleResult } from '../../types/enthalpy';
import type { RefrigerantData } from '../../types/refrigerant';

type ActiveSig = 'tech' | 'client' | null;

function computeMetrics(c: CycleResult, r: RefrigerantData): CycleMetrics {
  const bp = c.points[0].pressureBar;
  const hp = c.points[2].pressureBar;
  let tSatEvapC: number | null = null;
  let tSatCondC: number | null = null;
  let superheatK: number | null = null;
  let subcoolingK: number | null = null;
  try {
    const satEvap = satPointFromPressure(r, bp);
    const satCond = satPointFromPressure(r, hp);
    tSatEvapC    = Math.round(satEvap.temperatureC * 10) / 10;
    tSatCondC    = Math.round(satCond.temperatureC * 10) / 10;
    superheatK   = Math.round((c.points[0].temperatureC - satEvap.temperatureC) * 10) / 10;
    subcoolingK  = Math.round((satCond.temperatureC - c.points[2].temperatureC) * 10) / 10;
  } catch {}
  return {
    bpBar:            Math.round(bp * 100) / 100,
    hpBar:            Math.round(hp * 100) / 100,
    cop:              Math.round(c.cop * 100) / 100,
    compressionRatio: Math.round(c.compressionRatio * 100) / 100,
    tSatEvapC,
    tSatCondC,
    superheatK,
    subcoolingK,
  };
}

export default function ReportScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { before, after } = useReportContext();

  const [clientName, setClientName] = useState('');
  const [installationRef, setInstallationRef] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [actions, setActions] = useState<ActionItem[]>(DEFAULT_ACTIONS.map(a => ({ ...a })));
  const [observations, setObservations] = useState('');
  const [techSignature, setTechSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [activeSig, setActiveSig] = useState<ActiveSig>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBranding().then((b) => {
      if (b.technicianName) setTechnicianName(b.technicianName);
      if (b.companyName) setCompanyName(b.companyName);
    });
  }, []);

  function toggleAction(id: string) {
    setActions(prev => prev.map(a => a.id === id ? { ...a, checked: !a.checked } : a));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      // Auto-save to history when a before cycle is available
      if (before.cycleResult && before.refrigerant) {
        await saveHistoryEntry({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          savedAt: new Date().toISOString(),
          clientName,
          installationRef,
          technicianName,
          refrigerantId: before.refrigerant.id,
          refrigerantName: before.refrigerant.name,
          before: computeMetrics(before.cycleResult, before.refrigerant),
          after: (after?.cycleResult && after.refrigerant)
            ? computeMetrics(after.cycleResult, after.refrigerant)
            : null,
          diagnosticCount: before.diagnosticResults.length,
        });
      }

      await generateAndShareReport({
        clientName,
        installationRef,
        companyName,
        technicianName,
        interventionDate: new Date(),
        before,
        after: after ?? null,
        actions,
        observations,
        techSignature,
        clientSignature,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  }

  const hasCycleData = !!before.cycleResult && !!before.refrigerant;
  const hasDiagData = before.diagnosticResults.length > 0;
  const hasAfter = !!after?.cycleResult;

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xl,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textMuted,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    statusRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statusBadge: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    statusText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      fontWeight: typography.weight.medium,
    },
    inputField: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      color: colors.textPrimary,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    inputLabel: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      marginBottom: 4,
      marginTop: spacing.xs,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxLabel: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
    },
    obsInput: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textPrimary,
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    sigRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sigRowLast: {
      borderBottomWidth: 0,
    },
    sigDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.sm,
    },
    sigLabel: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textPrimary,
    },
    sigStatus: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      marginRight: spacing.sm,
    },
    sigBtn: {
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    sigBtnText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      fontWeight: typography.weight.medium,
    },
    generateBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    generateBtnText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      fontWeight: typography.weight.bold,
      color: colors.textOnAccent,
      letterSpacing: 0.5,
    },
    errorBox: {
      backgroundColor: colors.red + '22',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.red,
      padding: spacing.md,
    },
    errorText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.red,
    },
    diagItem: {
      paddingVertical: spacing.xs,
      borderLeftWidth: 2,
      borderLeftColor: colors.accent,
      paddingLeft: spacing.sm,
      marginBottom: spacing.xs,
    },
    diagLabel: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      fontWeight: typography.weight.medium,
      color: colors.textPrimary,
    },
    diagDesc: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      color: colors.textMuted,
    },
  }), [colors, spacing, radius, typography]);

  function SigRow({
    label, sublabel, signed, onPress, last,
  }: { label: string; sublabel?: string; signed: boolean; onPress: () => void; last?: boolean }) {
    const green = '#10B981';
    return (
      <TouchableOpacity
        style={[styles.sigRow, last && styles.sigRowLast]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.sigDot, { backgroundColor: signed ? green : colors.border }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.sigLabel}>{label}</Text>
          {sublabel ? (
            <Text style={[styles.sigStatus, { color: colors.textMuted }]}>{sublabel}</Text>
          ) : null}
        </View>
        <Text style={[styles.sigStatus, { color: signed ? green : colors.textMuted, marginRight: spacing.sm }]}>
          {signed ? 'Signé ✓' : 'Non signé'}
        </Text>
        <View style={[styles.sigBtn, {
          borderColor: signed ? green : colors.accent,
          backgroundColor: signed ? green + '15' : colors.accentSubtle,
        }]}>
          <Text style={[styles.sigBtnText, { color: signed ? green : colors.accent }]}>
            {signed ? 'Modifier' : 'Signer'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <Text style={styles.title}>Rapport PDF</Text>
          <Text style={styles.subtitle}>Génère un document professionnel à remettre au client</Text>
        </View>

        <View style={styles.content}>

          {/* Data status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: hasCycleData ? '#6366F122' : colors.bgSubtle, borderWidth: 1, borderColor: hasCycleData ? '#6366F1' : colors.border }]}>
              <Text style={[styles.statusText, { color: hasCycleData ? '#6366F1' : colors.textMuted }]}>
                {hasCycleData ? '✓ Mesure initiale' : '— Mesure initiale'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: hasAfter ? '#10B98122' : colors.bgSubtle, borderWidth: 1, borderColor: hasAfter ? '#10B981' : colors.border }]}>
              <Text style={[styles.statusText, { color: hasAfter ? '#10B981' : colors.textMuted }]}>
                {hasAfter ? '✓ Mesure après' : '— Mesure après'}
              </Text>
            </View>
          </View>

          {/* Intervention info */}
          <Card>
            <SectionTitle title="Informations intervention" />
            <Text style={styles.inputLabel}>Société / Entreprise</Text>
            <TextInput
              style={styles.inputField}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Ex : Froid Services SA"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Nom du client</Text>
            <TextInput
              style={styles.inputField}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Ex : Boucherie Dupont"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Référence installation</Text>
            <TextInput
              style={styles.inputField}
              value={installationRef}
              onChangeText={setInstallationRef}
              placeholder="Ex : Groupe Froid Positif Cuisine"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Nom du technicien</Text>
            <TextInput
              style={[styles.inputField, { marginBottom: 0 }]}
              value={technicianName}
              onChangeText={setTechnicianName}
              placeholder="Votre nom"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </Card>

          {/* Diagnostic preview */}
          {hasDiagData && (
            <Card>
              <SectionTitle title="Diagnostics inclus" />
              {before.diagnosticResults.map(r => (
                <View key={r.faultId} style={styles.diagItem}>
                  <Text style={styles.diagLabel}>{r.label} — {r.score}%</Text>
                  <Text style={styles.diagDesc}>{r.recommendation}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Actions checklist */}
          <Card>
            <SectionTitle title="Actions réalisées" />
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionItem, idx === actions.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => toggleAction(action.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, {
                  backgroundColor: action.checked ? colors.accent : 'transparent',
                  borderColor: action.checked ? colors.accent : colors.border,
                }]}>
                  {action.checked && (
                    <Text style={{ color: colors.textOnAccent, fontSize: 13, fontWeight: 'bold', lineHeight: 16 }}>✓</Text>
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: action.checked ? colors.textPrimary : colors.textMuted }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>

          {/* Observations */}
          <Card>
            <SectionTitle title="Observations & Préconisations" />
            <TextInput
              style={styles.obsInput}
              value={observations}
              onChangeText={setObservations}
              placeholder={"Ex : Prévoir remplacement ventilateur condenseur.\nPlanifier contrôle charge dans 6 mois."}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>

          {/* Signatures */}
          <Card>
            <SectionTitle title="Signatures" />
            <SigRow
              label="Technicien"
              sublabel={technicianName || undefined}
              signed={!!techSignature}
              onPress={() => setActiveSig('tech')}
            />
            <SigRow
              label="Client"
              sublabel={clientName || undefined}
              signed={!!clientSignature}
              onPress={() => setActiveSig('client')}
              last
            />
          </Card>

          {/* Generate button */}
          <TouchableOpacity
            style={[styles.generateBtn, loading && { opacity: 0.6 }]}
            onPress={handleGenerate}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading && <ActivityIndicator color={colors.textOnAccent} size="small" />}
            <Text style={styles.generateBtnText}>
              {loading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER ET PARTAGER LE PDF'}
            </Text>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

        </View>
      </ScrollView>

      <SignatureModal
        visible={activeSig === 'tech'}
        label="Signature Technicien"
        sublabel={technicianName || undefined}
        onConfirm={(svg) => { setTechSignature(svg); setActiveSig(null); }}
        onCancel={() => setActiveSig(null)}
      />
      <SignatureModal
        visible={activeSig === 'client'}
        label="Signature Client"
        sublabel={clientName || undefined}
        onConfirm={(svg) => { setClientSignature(svg); setActiveSig(null); }}
        onCancel={() => setActiveSig(null)}
      />
    </SafeAreaView>
  );
}
