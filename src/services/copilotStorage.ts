import AsyncStorage from '@react-native-async-storage/async-storage';

const URL_KEY   = '@cryohelper/copilot-url';
const MODEL_KEY = '@cryohelper/copilot-model';

export const DEFAULT_MODEL = 'qwen2.5:14b';

export async function loadCopilotUrl(): Promise<string> {
  try { return (await AsyncStorage.getItem(URL_KEY)) ?? ''; }
  catch { return ''; }
}

export async function saveCopilotUrl(url: string): Promise<void> {
  try { await AsyncStorage.setItem(URL_KEY, url.trim()); } catch {}
}

export async function loadCopilotModel(): Promise<string> {
  try { return (await AsyncStorage.getItem(MODEL_KEY)) ?? DEFAULT_MODEL; }
  catch { return DEFAULT_MODEL; }
}

export async function saveCopilotModel(model: string): Promise<void> {
  try { await AsyncStorage.setItem(MODEL_KEY, model.trim()); } catch {}
}
