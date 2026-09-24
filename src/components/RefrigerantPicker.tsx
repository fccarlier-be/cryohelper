import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { FLUID_CATALOG } from '../constants/fluidCatalog';
import type { FluidEntry } from '../constants/fluidCatalog';

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

function gwpColor(gwp: number, colors: ReturnType<typeof useAppTheme>['colors']): string {
  if (gwp === 0) return colors.green;
  if (gwp < 10) return colors.green;
  if (gwp < 150) return colors.green;
  if (gwp < 750) return colors.orange;
  if (gwp < 2500) return colors.yellow;
  return colors.red;
}

export default function RefrigerantPicker({ value, onChange, label = 'Fluide frigorigène' }: Props) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => FLUID_CATALOG.find((f) => f.id === value), [value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FLUID_CATALOG;
    return FLUID_CATALOG.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.ashraeClass.toLowerCase().includes(q),
    );
  }, [search]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        trigger: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.bgSubtle,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        triggerText: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          color: colors.textPrimary,
          fontWeight: typography.weight.medium,
        },
        chevron: { marginLeft: spacing.xs },
        // Modal
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.card,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '80%',
          paddingBottom: spacing.xl,
        },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          alignSelf: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        },
        sheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        sheetTitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold,
          color: colors.textPrimary,
        },
        searchWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          marginHorizontal: spacing.lg,
          marginVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
        },
        searchInput: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          color: colors.textPrimary,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
        },
        item: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm + 2,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
        itemActive: { backgroundColor: colors.accentSubtle },
        itemLeft: { flex: 1 },
        itemName: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          color: colors.textPrimary,
          fontWeight: typography.weight.medium,
        },
        itemMeta: {
          flexDirection: 'row',
          gap: spacing.xs,
          marginTop: 2,
        },
        badge: {
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 4,
        },
        badgeText: {
          fontFamily: typography.fontMono,
          fontSize: 10,
          fontWeight: typography.weight.bold,
        },
        classBadge: {
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 4,
          backgroundColor: colors.bgSubtle,
          borderWidth: 1,
          borderColor: colors.border,
        },
        classBadgeText: {
          fontFamily: typography.fontMono,
          fontSize: 10,
          color: colors.textSecondary,
        },
        checkmark: { marginLeft: spacing.sm },
        empty: {
          padding: spacing.xl,
          textAlign: 'center',
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
        },
      }),
    [colors, spacing, radius, typography],
  );

  const renderItem = ({ item }: { item: FluidEntry }) => {
    const active = item.id === value;
    const gwp = item.gwp100;
    const gc = gwpColor(gwp, colors);
    return (
      <TouchableOpacity
        style={[styles.item, active && styles.itemActive]}
        onPress={() => {
          onChange(item.id);
          setOpen(false);
          setSearch('');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <View style={[styles.badge, { backgroundColor: gc + '22' }]}>
              <Text style={[styles.badgeText, { color: gc }]}>
                GWP {gwp === 0 ? '≈0' : gwp}
              </Text>
            </View>
            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>{item.ashraeClass}</Text>
            </View>
          </View>
        </View>
        {active && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={colors.accent}
            style={styles.checkmark}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.triggerText}>{selected?.name ?? value}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={styles.chevron} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => { setOpen(false); setSearch(''); }}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Fluide frigorigène</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher…"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>Aucun résultat</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
