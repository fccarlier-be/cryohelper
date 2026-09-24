import React, { createContext, MutableRefObject, useCallback, useContext, useState } from 'react';

export interface KeypadField {
  id: string;
  valueRef: MutableRefObject<string>;
  onChangeRef: MutableRefObject<(v: string) => void>;
  signed: boolean;
  /** If provided, ↵ calls this instead of hideKeypad (used by wizard to advance steps) */
  onConfirmRef?: MutableRefObject<() => void>;
}

interface KeypadContextValue {
  activeField: KeypadField | null;
  showKeypad: (field: KeypadField) => void;
  hideKeypad: () => void;
}

const KeypadContext = createContext<KeypadContextValue>({
  activeField: null,
  showKeypad: () => {},
  hideKeypad: () => {},
});

export function KeypadProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [activeField, setActiveField] = useState<KeypadField | null>(null);
  const showKeypad = useCallback((field: KeypadField) => setActiveField(field), []);
  const hideKeypad = useCallback(() => setActiveField(null), []);
  return (
    <KeypadContext.Provider value={{ activeField, showKeypad, hideKeypad }}>
      {children}
    </KeypadContext.Provider>
  );
}

export function useKeypadContext() {
  return useContext(KeypadContext);
}

export const KEYPAD_HEIGHT = 224;
