import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BoreasIcon from '../../components/BoreasIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useReportContext } from '../../context/ReportContext';
import { loadCopilotUrl, loadCopilotModel, DEFAULT_MODEL } from '../../services/copilotStorage';
import { buildSystemPrompt, computeSatNote } from '../../services/copilotContextBuilder';
import { streamChat, pingCopilot } from '../../services/copilotService';
import type { ChatMessage } from '../../services/copilotService';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

// ─── Skeleton loader shown while the first tokens are arriving ────────────────

function SkeletonBubble({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // anim ref is stable — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fixed px widths — percentage widths compute to 0 when the parent has no fixed size
  const widths = [200, 160, 110];
  return (
    <View style={{ paddingVertical: 4 }}>
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={{
            height: 12,
            width: w,
            borderRadius: 6,
            backgroundColor: color,
            opacity: anim,
            marginBottom: i < widths.length - 1 ? 10 : 0,
          }}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// Minimum content length before skeleton gives way to the streaming text.
const SKELETON_THRESHOLD = 150;

export default function CopilotScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { before, after } = useReportContext();

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCopilotUrl().then(setServerUrl);
      loadCopilotModel().then(setModel);
    }, []),
  );

  useEffect(() => {
    if (!serverUrl) { setServerStatus('unknown'); return; }
    setServerStatus('unknown');
    pingCopilot(serverUrl).then(ok => setServerStatus(ok ? 'ok' : 'error'));
  }, [serverUrl]);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(before, after),
    [before, after],
  );

  function scrollToEnd() {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming || !serverUrl) return;

    setInput('');

    const userMsg: UIMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    scrollToEnd();

    const satNote = await computeSatNote(text);
    const activePrompt = satNote ? buildSystemPrompt(before, after, satNote) : systemPrompt;

    const history: ChatMessage[] = [
      { role: 'system', content: activePrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamChat(
        { serverUrl, model },
        history,
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
          scrollToEnd();
        },
        ctrl.signal,
      );
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m),
      );
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: isAbort
                  ? m.content || '...'
                  : `Erreur : ${err instanceof Error ? err.message : 'Connexion impossible'}`,
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleClear() {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
  }

  async function handleShare(text: string) {
    try {
      await Share.share({ message: text });
    } catch {}
  }

  const styles = useMemo(() => StyleSheet.create({
    safe:        { flex: 1, backgroundColor: colors.bg },
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerAvatar: { marginRight: spacing.sm },
    headerTitle:  { flex: 1, fontFamily: typography.fontSans, fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.textPrimary },
    statusDot:    { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
    clearBtn:    { padding: spacing.xs },
    list:        { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
    rowUser:      { alignItems: 'flex-end' },
    rowAssistant: { alignItems: 'flex-start' },
    bubbleUser:      { backgroundColor: colors.accent, borderRadius: radius.md, borderBottomRightRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: '82%' },
    bubbleAssistant: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, borderBottomLeftRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: '92%' },
    textUser:      { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textOnAccent, lineHeight: 20 },
    textAssistant: { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textPrimary, lineHeight: 20 },
    cursor:   { color: colors.accent, fontWeight: 'bold' },
    shareRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingLeft: 2, gap: spacing.sm },
    shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle },
    shareBtnLabel: { fontFamily: typography.fontSans, fontSize: 10, color: colors.textMuted },
    emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    emptyIcon:  { opacity: 0.2, marginBottom: spacing.md },
    emptyTitle: { fontFamily: typography.fontSans, fontSize: typography.size.md, fontWeight: typography.weight.medium, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
    emptyDesc:  { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    noUrlWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
    noUrlText:  { fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    inputRow:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
    input:      { flex: 1, fontFamily: typography.fontSans, fontSize: typography.size.sm, color: colors.textPrimary, backgroundColor: colors.bgSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100 },
    sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    stopBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  }), [colors, spacing, radius, typography]);

  const statusColor = serverStatus === 'ok' ? '#10B981' : serverStatus === 'error' ? colors.red : colors.textMuted;

  function renderMessage({ item }: { item: UIMessage }) {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <View style={styles.rowUser}>
          <View style={styles.bubbleUser}>
            <Text style={styles.textUser}>{item.content}</Text>
          </View>
        </View>
      );
    }

    // Show skeleton until SKELETON_THRESHOLD chars have arrived
    const showSkeleton = item.streaming && item.content.length < SKELETON_THRESHOLD;

    return (
      <View style={styles.rowAssistant}>
        <View style={styles.bubbleAssistant}>
          {showSkeleton ? (
            <SkeletonBubble color={colors.textMuted} />
          ) : (
            <Text selectable style={styles.textAssistant}>
              {item.content || (item.streaming ? '' : '…')}
              {item.streaming && <Text style={styles.cursor}>▍</Text>}
            </Text>
          )}
        </View>

        {/* Action row — visible once the response is complete */}
        {!item.streaming && item.content.length > 0 && (
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item.content)}>
              <Ionicons name="share-social-outline" size={12} color={colors.textMuted} />
              <Text style={styles.shareBtnLabel}>Partager</Text>
            </TouchableOpacity>
            <Text style={[styles.shareBtnLabel, { opacity: 0.5 }]}>
              · appui long pour copier
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (!serverUrl) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerAvatar}><BoreasIcon size={28} color={colors.accent} /></View>
          <Text style={styles.headerTitle}>Boreas</Text>
        </View>
        <View style={styles.noUrlWrap}>
          <Ionicons name="server-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Serveur non configuré</Text>
          <Text style={styles.noUrlText}>
            Va dans Réglages → Copilot IA et saisis l’adresse de ton serveur Ollama.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}><BoreasIcon size={28} color={colors.accent} /></View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.headerTitle}>Boreas</Text>
        <Text style={{ fontFamily: typography.fontMono, fontSize: 10, color: colors.textMuted, marginRight: spacing.sm }}>
          {model}
        </Text>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={{ opacity: 0.6, marginBottom: spacing.md }}><BoreasIcon size={80} color={colors.accent} /></View>
            <Text style={styles.emptyTitle}>Boreas</Text>
            <Text style={styles.emptyDesc}>
              {before.cycleResult
                ? `Mesure ${before.refrigerant?.name ?? ''} chargée — je peux analyser le cycle, interpréter les diagnostics ou répondre à toute autre question.`
                : 'Posez-moi n\'importe quelle question : tables de saturation, diagnostic d\'une panne, choix de fluide, réglementation F-Gas, calcul de charge…'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            onContentSizeChange={scrollToEnd}
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Posez une question…"
            placeholderTextColor={colors.textMuted}
            multiline
            returnKeyType="default"
            editable={!streaming}
          />
          {streaming ? (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
              <Ionicons name="stop" size={18} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
