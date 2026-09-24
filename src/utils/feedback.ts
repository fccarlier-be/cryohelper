import { Linking, Platform } from 'react-native';
import { APP_CONTACT, APP_VERSION } from '../data/legal';

export type FeedbackType = 'bug' | 'suggestion' | 'erreur_donnees' | 'autre';

export const FEEDBACK_TYPES: Array<{ key: FeedbackType; label: string; icon: string }> = [
  { key: 'bug', label: 'Bug', icon: 'bug-outline' },
  { key: 'suggestion', label: 'Suggestion', icon: 'bulb-outline' },
  { key: 'erreur_donnees', label: 'Erreur données', icon: 'book-outline' },
  { key: 'autre', label: 'Autre', icon: 'chatbubble-outline' },
];

interface FeedbackOptions {
  type?: FeedbackType;
  text?: string;
  context?: string;
}

export function openFeedbackEmail({
  type = 'autre',
  text = '',
  context = '',
}: FeedbackOptions): void {
  const typeLabel = FEEDBACK_TYPES.find((t) => t.key === type)?.label ?? type;

  const body = [
    text,
    '',
    '---',
    `Type : ${typeLabel}`,
    context ? `Écran : ${context}` : '',
    `Version : ${APP_VERSION}`,
    `Plateforme : ${Platform.OS} ${Platform.Version}`,
  ]
    .filter(Boolean)
    .join('\n');

  const subject = `[CryoHelper] ${typeLabel}`;
  const url = `mailto:${APP_CONTACT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  Linking.openURL(url).catch(() => {
    /* Email client not available — silent fail */
  });
}
