import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { FEEDBACK_TYPES, FeedbackType, openFeedbackEmail } from '../../utils/feedback';

export default function FeedbackScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const navigation = useNavigation();

  const [selectedType, setSelectedType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        container: { flex: 1 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.md,
        },
        backBtn: {
          padding: spacing.xs,
        },
        headerTitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
        },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        },
        typeRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        },
        typeBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgSubtle,
        },
        typeBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSubtle,
        },
        typeBtnLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
        },
        typeBtnLabelActive: {
          color: colors.accent,
        },
        textArea: {
          height: 140,
          backgroundColor: colors.bgSubtle,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          color: colors.textPrimary,
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          textAlignVertical: 'top',
          marginBottom: spacing.lg,
        },
        sendBtn: {
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        sendBtnText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.textOnAccent,
          letterSpacing: 0.5,
        },
        hint: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: spacing.md,
          lineHeight: 16,
        },
      }),
    [colors, spacing, radius, typography],
  );

  function handleSend() {
    openFeedbackEmail({ type: selectedType, text: message });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Feedback</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Type de feedback</Text>
            <View style={styles.typeRow}>
              {FEEDBACK_TYPES.map((ft) => {
                const active = ft.key === selectedType;
                return (
                  <TouchableOpacity
                    key={ft.key}
                    style={[styles.typeBtn, active && styles.typeBtnActive]}
                    onPress={() => setSelectedType(ft.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={ft.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={16}
                      color={active ? colors.accent : colors.textSecondary}
                    />
                    <Text style={[styles.typeBtnLabel, active && styles.typeBtnLabelActive]}>
                      {ft.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Décrivez le problème ou votre suggestion…"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
              <Text style={styles.sendBtnText}>ENVOYER PAR EMAIL</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Votre client email s’ouvrira avec le message pré-rempli.{'\n'}
              Aucune donnée n’est envoyée automatiquement.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
