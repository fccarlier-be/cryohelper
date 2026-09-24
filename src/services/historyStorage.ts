import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry } from '../types/history';

const KEY = '@cryohelper/history';
const MAX = 50;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  try {
    const existing = await loadHistory();
    const updated = [entry, ...existing].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    const existing = await loadHistory();
    await AsyncStorage.setItem(KEY, JSON.stringify(existing.filter(e => e.id !== id)));
  } catch {}
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
