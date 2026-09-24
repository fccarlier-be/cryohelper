import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Branding {
  companyName: string;
  technicianName: string;
}

const KEY = '@cryohelper/branding';
const EMPTY: Branding = { companyName: '', technicianName: '' };

export async function loadBranding(): Promise<Branding> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function saveBranding(b: Branding): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(b));
  } catch { /* ignore */ }
}
