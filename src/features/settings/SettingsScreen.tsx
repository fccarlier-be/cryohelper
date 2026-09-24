import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import { THEME_MODES, ThemeMode } from '../../theme';
import { APP_VERSION, APP_DATE, APP_COPYRIGHT } from '../../data/legal';
import { loadBranding, saveBranding } from '../../services/brandingStorage';
import { loadCopilotUrl, saveCopilotUrl, loadCopilotModel, saveCopilotModel, DEFAULT_MODEL } from '../../services/copilotStorage';
import type { SettingsStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export default function SettingsScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography, mode, setTheme } = useAppTheme();
  const navigation = useNavigation<Nav>();

  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [copilotUrl, setCopilotUrl] = useState('');
  const [copilotModel, setCopilotModel] = useState(DEFAULT_MODEL);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);

  const PRESET_MODELS = [
    { id: 'qwen2.5:14b',   label: 'Qwen 2.5 14B',       note: '~9 GB VRAM' },
    { id: 'qwen2.5:7b',    label: 'Qwen 2.5 7B',        note: '~5 GB VRAM' },
    { id: 'mistral-nemo',  label: 'Mistral NeMo 12B',   note: '~7 GB VRAM' },
    { id: 'mistral-small', label: 'Mistral Small 22B',  note: '~13 GB VRAM' },
    { id: 'mistral:7b',    label: 'Mistral 7B',         note: '~4 GB VRAM' },
    { id: 'llama3.1:8b',   label: 'Llama 3.1 8B',      note: '~5 GB VRAM' },
    { id: 'llama3.2:3b',   label: 'Llama 3.2 3B',      note: '~2 GB VRAM' },
  ];

  useEffect(() => {
    loadBranding().then((b) => {
      setCompanyName(b.companyName);
      setTechnicianName(b.technicianName);
    });
    loadCopilotUrl().then(setCopilotUrl);
    loadCopilotModel().then(setCopilotModel);
  }, []);

  function handleBlur() {
    saveBranding({ companyName, technicianName });
  }

  function handleCopilotUrlBlur() {
    saveCopilotUrl(copilotUrl);
  }

  function handleCopilotModelBlur() {
    saveCopilotModel(copilotModel);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        },
        sectionGap: { marginBottom: spacing.lg },
        themeRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        themeBtn: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          backgroundColor: colors.bgSubtle,
        },
        themeBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSubtle,
        },
        themeBtnLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginTop: 4,
        },
        themeBtnLabelActive: {
          color: colors.accent,
          fontWeight: typography.weight.medium,
        },
        navRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        },
        navRowLast: {
          borderBottomWidth: 0,
        },
        navIcon: {
          width: 32,
        },
        navLabel: {
          flex: 1,
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          color: colors.textPrimary,
        },
        versionText: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: spacing.xl,
        },
        inputLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginBottom: 4,
          marginTop: spacing.xs,
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
          marginBottom: spacing.xs,
        },
      }),
    [colors, spacing, radius, typography],
  );

  type NavRowProps = {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress: () => void;
    last?: boolean;
  };

  function NavRow({ icon, label, onPress, last }: NavRowProps) {
    return (
      <TouchableOpacity
        style={[styles.navRow, last && styles.navRowLast]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.navIcon}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
        </View>
        <Text style={styles.navLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Réglages</Text>
          <Text style={styles.subtitle}>Préférences & informations</Text>
        </View>

        <View style={styles.content}>
          {/* Branding */}
          <View style={styles.sectionGap}>
            <SectionTitle title="Identification technicien" />
            <Card>
              <Text style={styles.inputLabel}>Société / Entreprise</Text>
              <TextInput
                style={styles.inputField}
                value={companyName}
                onChangeText={setCompanyName}
                onBlur={handleBlur}
                placeholder="Ex : Froid Services SA"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>Nom du technicien (par défaut)</Text>
              <TextInput
                style={[styles.inputField, { marginBottom: 0 }]}
                value={technicianName}
                onChangeText={setTechnicianName}
                onBlur={handleBlur}
                placeholder="Votre nom"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </Card>
          </View>

          {/* Theme */}
          <View style={styles.sectionGap}>
            <SectionTitle title="Apparence" />
            <Card>
              <View style={styles.themeRow}>
                {THEME_MODES.map((tm) => {
                  const active = tm.key === mode;
                  return (
                    <TouchableOpacity
                      key={tm.key}
                      style={[styles.themeBtn, active && styles.themeBtnActive]}
                      onPress={() => setTheme(tm.key as ThemeMode)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={tm.icon as React.ComponentProps<typeof Ionicons>['name']}
                        size={22}
                        color={active ? colors.accent : colors.textMuted}
                      />
                      <Text style={[styles.themeBtnLabel, active && styles.themeBtnLabelActive]}>
                        {tm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </View>

          {/* Copilot */}
          <View style={styles.sectionGap}>
            <SectionTitle title="Copilot IA" />
            <Card>
              <Text style={styles.inputLabel}>URL serveur Ollama</Text>
              <TextInput
                style={styles.inputField}
                value={copilotUrl}
                onChangeText={setCopilotUrl}
                onBlur={handleCopilotUrlBlur}
                placeholder="http://192.168.1.x:11434"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="next"
              />
              <Text style={styles.inputLabel}>Modèle</Text>
              <TouchableOpacity
                style={[styles.inputField, { flexDirection: 'row', alignItems: 'center', marginBottom: 0 }]}
                onPress={() => setModelPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={{ flex: 1, fontFamily: typography.fontSans, fontSize: typography.size.md, color: copilotModel ? colors.textPrimary : colors.textMuted }}>
                  {copilotModel || 'Choisir un modèle…'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Support */}
          <View style={styles.sectionGap}>
            <SectionTitle title="Support" />
            <Card>
              <NavRow
                icon="time-outline"
                label="Historique des interventions"
                onPress={() => navigation.navigate('History')}
              />
              <NavRow
                icon="chatbubble-outline"
                label="Envoyer un feedback"
                onPress={() => navigation.navigate('Feedback')}
              />
              <NavRow
                icon="document-text-outline"
                label="Mentions légales"
                onPress={() => navigation.navigate('Legal')}
                last
              />
            </Card>
          </View>

          <Text style={styles.versionText}>
            CryoHelper v{APP_VERSION} — {APP_DATE}{'\n'}{APP_COPYRIGHT}
          </Text>
        </View>
      </ScrollView>

      <Modal visible={modelPickerVisible} transparent animationType="fade" onRequestClose={() => setModelPickerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.xl }} activeOpacity={1} onPress={() => setModelPickerVisible(false)}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' }}>
            <Text style={{ fontFamily: typography.fontSans, fontSize: typography.size.md, fontWeight: typography.weight.bold, color: colors.textPrimary, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              Choisir un modèle
            </Text>
            <FlatList
              data={PRESET_MODELS}
              keyExtractor={m => m.id}
              renderItem={({ item }) => {
                const active = item.id === copilotModel;
                return (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, backgroundColor: active ? colors.accentSubtle : 'transparent' }}
                    onPress={() => { setCopilotModel(item.id); saveCopilotModel(item.id); setModelPickerVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.fontSans, fontSize: typography.size.md, color: active ? colors.accent : colors.textPrimary, fontWeight: active ? typography.weight.semibold : typography.weight.regular }}>
                        {item.label}
                      </Text>
                      <Text style={{ fontFamily: typography.fontMono, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
                        {item.id} · {item.note}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
