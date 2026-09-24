import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { ALL_DOCUMENTS, LegalDocument } from '../../data/legal';

function DocTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        tab: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.accentSubtle : 'transparent',
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: active ? colors.accent : colors.textSecondary,
          fontWeight: active ? typography.weight.medium : typography.weight.regular,
        },
      }),
    [colors, spacing, radius, typography, active],
  );
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function DocContent({ doc }: { doc: LegalDocument }): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginBottom: spacing.lg,
        },
        sectionTitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          fontWeight: typography.weight.semibold,
          color: colors.accent,
          marginBottom: spacing.xs,
        },
        sectionContent: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <>
      {doc.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}
    </>
  );
}

export default function LegalScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useAppTheme();
  const navigation = useNavigation();
  const [activeDoc, setActiveDoc] = useState<string>(ALL_DOCUMENTS[0].id);

  const currentDoc = ALL_DOCUMENTS.find((d) => d.id === activeDoc) ?? ALL_DOCUMENTS[0];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.md,
        },
        backBtn: {
          padding: 4,
        },
        headerTitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
        },
        tabs: {
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexWrap: 'wrap',
        },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        warningBox: {
          backgroundColor: colors.orange + '22',
          borderLeftWidth: 3,
          borderLeftColor: colors.orange,
          borderRadius: 4,
          padding: spacing.md,
          marginBottom: spacing.lg,
        },
        warningText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.orange,
          lineHeight: 18,
        },
      }),
    [colors, spacing, typography],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mentions légales</Text>
        </View>

        <View style={styles.tabs}>
          {ALL_DOCUMENTS.map((doc) => (
            <DocTab
              key={doc.id}
              label={doc.title}
              active={doc.id === activeDoc}
              onPress={() => setActiveDoc(doc.id)}
            />
          ))}
        </View>

        <View style={styles.content}>
          {activeDoc === 'disclaimer' && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠ Les résultats sont des estimations. Ils ne remplacent pas une étude
                professionnelle.
              </Text>
            </View>
          )}

          <DocContent doc={currentDoc} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
