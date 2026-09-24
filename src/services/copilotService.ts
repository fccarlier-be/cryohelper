export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CopilotConfig {
  serverUrl: string;
  model: string;
}

// Streams tokens from Ollama via XHR (fetch.body is null in Hermes/React Native).
// Calls onChunk for each text fragment as it arrives.
export async function streamChat(
  config: CopilotConfig,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const base = config.serverUrl.replace(/\/$/, '');
    const xhr = new XMLHttpRequest();

    let processedLength = 0;
    let buffer = '';

    xhr.open('POST', `${base}/api/chat`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onprogress = () => {
      const newText = xhr.responseText.slice(processedLength);
      processedLength = xhr.responseText.length;

      buffer += newText;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
          };
          if (parsed.message?.content) {
            onChunk(parsed.message.content);
          }
        } catch {
          // skip malformed line
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Serveur Ollama : HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Connexion impossible'));

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        const err = new Error('AbortError');
        err.name = 'AbortError';
        reject(err);
      });
    }

    xhr.send(JSON.stringify({ model: config.model, messages, stream: true, options: { num_ctx: 4096, temperature: 0 } }));
  });
}

// Quick connectivity check — resolves true if Ollama responds.
export async function pingCopilot(serverUrl: string): Promise<boolean> {
  try {
    const base = serverUrl.replace(/\/$/, '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${base}/api/tags`, { signal: ctrl.signal });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
