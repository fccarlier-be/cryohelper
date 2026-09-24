import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import { loadHistory, deleteHistoryEntry, clearHistory } from '../../services/historyStorage';
import type { HistoryEntry } from '../../types/history';

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ─── Metric row: one label + before value + optional after value ──────────────

function MetricRow({
  label, before, after, higherIsBetter, unit,
}: {
  label: string;
  before: string;
  after?: string | null;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  const { colors, typography } = useAppTheme();

  let deltaEl: React.ReactNode = null;
  if (after != null && higherIsBetter !== undefined) {
    const bVal = parseFloat(before);
    const aVal = parseFloat(after);
    const d = aVal - bVal;
    if (!isNaN(d) && Math.abs(d) >= 0.01) {
      const good = higherIsBetter ? d > 0 : d < 0;
      const color = good ? '#10B981' : '#EF4444';
      const sign = d > 0 ? '+' : '';
      deltaEl = (
        <Text style={{ fontSize: 10, color, fontWeight: '700', marginLeft: 4 }}>
          {sign}{d.toFixed(2)}
        </Text>
      );
    }
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    }}>
      <Text style={{
        flex: 2,
        fontFamily: typography.fontSans,
        fontSize: 10,
        color: colors.textMuted,
      }}>{label}</Text>
      <Text style={{
        flex: 2,
        fontFamily: typography.fontMono,
        fontSize: 11,
        color: colors.textPrimary,
        fontWeight: '600',
      }}>{before}{unit ?? ''}</Text>
      {after != null ? (
        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontFamily: typography.fontMono,
            fontSize: 11,
            color: colors.textPrimary,
            fontWeight: '600',
          }}>{after}{unit ?? ''}</Text>
          {deltaEl}
        </View>
      ) : (
        <View style={{ flex: 2 }} />
      )}
    </View>
  );
}

// ─── Column headers for the before/after table ────────────────────────────────

function ColumnHeaders({ hasAfter }: { hasAfter: boolean }) {
  const { colors, typography } = useAppTheme();
  if (!hasAfter) return null;
  const cell = (label: string, color: string) => (
    <Text style={{
      flex: 2,
      fontFamily: typography.fontSans,
      fontSize: 9,
      fontWeight: '700',
      color,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>{label}</Text>
  );
  return (
    <View style={{
      flexDirection: 'row',
      paddingBottom: 4,
      marginBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{ flex: 2 }} />
      {cell('Avant', '#6366F1')}
      {cell('Après', '#10B981')}
    </View>
  );
}

// ─── Single entry card ────────────────────────────────────────────────────────

function EntryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const clientLine = [entry.clientName, entry.installationRef].filter(Boolean).join(' · ') || null;
  const hasAfter = entry.after != null;
  const b = entry.before;
  const a = entry.after;

  function confirmDelete() {
    Alert.alert(
      'Supprimer cette entrée ?',
      clientLine ?? formatDate(entry.savedAt),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ],
    );
  }

  function fmt(v: number | null | undefined, decimals = 2): string {
    return v != null ? v.toFixed(decimals) : '—';
  }

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: typography.fontSans,
            fontSize: 11,
            color: colors.textMuted,
            marginBottom: 2,
          }}>
            {formatDate(entry.savedAt)}
            {entry.technicianName ? `  ·  ${entry.technicianName}` : ''}
          </Text>
          {clientLine ? (
            <Text style={{
              fontFamily: typography.fontSans,
              fontSize: 14,
              fontWeight: '600',
              color: colors.textPrimary,
            }}>{clientLine}</Text>
          ) : (
            <Text style={{
              fontFamily: typography.fontSans,
              fontSize: 13,
              color: colors.textMuted,
              fontStyle: 'italic',
            }}>Sans client</Text>
          )}
        </View>
        <TouchableOpacity onPress={confirmDelete} style={{ padding: 4, marginLeft: spacing.sm }}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
        <View style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          backgroundColor: colors.accentSubtle,
          borderRadius: radius.sm,
        }}>
          <Text style={{
            fontFamily: typography.fontMono,
            fontSize: 11,
            color: colors.accent,
            fontWeight: '700',
          }}>{entry.refrigerantName}</Text>
        </View>
        {hasAfter && (
          <View style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            backgroundColor: '#D1FAE5',
            borderRadius: radius.sm,
          }}>
            <Text style={{ fontFamily: typography.fontSans, fontSize: 10, color: '#065F46', fontWeight: '600' }}>
              Avant / Après
            </Text>
          </View>
        )}
        {entry.diagnosticCount > 0 && (
          <View style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            backgroundColor: '#FEF3C7',
            borderRadius: radius.sm,
          }}>
            <Text style={{ fontFamily: typography.fontSans, fontSize: 10, color: '#D97706' }}>
              {entry.diagnosticCount} diag.
            </Text>
          </View>
        )}
      </View>

      {/* Metrics table */}
      <ColumnHeaders hasAfter={hasAfter} />
      <MetricRow label="BP"         before={fmt(b.bpBar)}            after={a && fmt(a.bpBar)}            unit=" bar" higherIsBetter={true} />
      <MetricRow label="HP"         before={fmt(b.hpBar)}            after={a && fmt(a.hpBar)}            unit=" bar" higherIsBetter={false} />
      <MetricRow label="COP"        before={fmt(b.cop)}              after={a && fmt(a.cop)}              higherIsBetter={true} />
      <MetricRow label="Taux comp." before={fmt(b.compressionRatio)} after={a && fmt(a.compressionRatio)} higherIsBetter={false} />
      {(b.tSatEvapC != null) && (
        <MetricRow label="T sat évap" before={fmt(b.tSatEvapC, 1)} after={a?.tSatEvapC != null ? fmt(a.tSatEvapC, 1) : null} unit=" °C" higherIsBetter={true} />
      )}
      {(b.tSatCondC != null) && (
        <MetricRow label="T sat cond" before={fmt(b.tSatCondC, 1)} after={a?.tSatCondC != null ? fmt(a.tSatCondC, 1) : null} unit=" °C" higherIsBetter={false} />
      )}
      {(b.superheatK != null) && (
        <MetricRow label="Surchauffe" before={fmt(b.superheatK, 1)} after={a?.superheatK != null ? fmt(a.superheatK, 1) : null} unit=" K" />
      )}
      {(b.subcoolingK != null) && (
        <MetricRow label="S/refroid." before={fmt(b.subcoolingK, 1)} after={a?.subcoolingK != null ? fmt(a.subcoolingK, 1) : null} unit=" K" />
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setEntries);
    }, []),
  );

  function handleDelete(id: string) {
    deleteHistoryEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleClearAll() {
    Alert.alert(
      'Effacer tout l\'historique ?',
      `${entries.length} entrée${entries.length > 1 ? 's' : ''} seront supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout effacer', style: 'destructive', onPress: () => { clearHistory(); setEntries([]); } },
      ],
    );
  }

  const styles = useMemo(() => StyleSheet.create({
    safe:     { flex: 1, backgroundColor: colors.bg },
    header:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
    title:    { fontFamily: typography.fontSans, fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.textPrimary },
    subtitle: { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textMuted, marginTop: 2 },
    clearBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.red, borderRadius: radius.sm },
    clearText:{ fontFamily: typography.fontSans, fontSize: typography.size.xs, color: colors.red },
    content:  { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    empty:    { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 80 },
    emptyTitle: { fontFamily: typography.fontSans, fontSize: typography.size.md, fontWeight: typography.weight.medium, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs, marginTop: spacing.md },
    emptyDesc:  { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  }), [colors, spacing, radius, typography]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>
            {entries.length === 0 ? 'Aucune entrée' : `${entries.length} intervention${entries.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        {entries.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
            <Text style={styles.clearText}>Tout effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyTitle}>Aucune intervention enregistrée</Text>
          <Text style={styles.emptyDesc}>
            Les entrées sont créées automatiquement lors de la génération d’un rapport PDF.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
