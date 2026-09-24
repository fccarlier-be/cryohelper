import React, { createContext, useContext, useState } from 'react';
import type { CycleResult } from '../types/enthalpy';
import type { DiagnosticResult } from '../types/diagnostic';
import type { RefrigerantData } from '../types/refrigerant';
import type { FluidTable } from '../types/fluidTable';
import type { PassData } from '../types/report';

const EMPTY_PASS: PassData = { refrigerant: null, fluidTable: null, cycleResult: null, diagnosticResults: [] };

interface ReportContextValue {
  before: PassData;
  after: PassData | null;
  currentPass: 'before' | 'after';
  setCycleData: (fluid: RefrigerantData, result: CycleResult, table?: FluidTable | null) => void;
  setDiagnosticData: (results: DiagnosticResult[]) => void;
  startAfterPass: () => void;
  resetPasses: () => void;
}

const ReportContext = createContext<ReportContextValue>({
  before: EMPTY_PASS,
  after: null,
  currentPass: 'before',
  setCycleData: () => {},
  setDiagnosticData: () => {},
  startAfterPass: () => {},
  resetPasses: () => {},
});

export function ReportContextProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [before, setBefore] = useState<PassData>({ ...EMPTY_PASS });
  const [after, setAfter] = useState<PassData | null>(null);
  const [currentPass, setCurrentPass] = useState<'before' | 'after'>('before');

  function setCycleData(fluid: RefrigerantData, result: CycleResult, table?: FluidTable | null) {
    if (currentPass === 'before') {
      setBefore(p => ({ ...p, refrigerant: fluid, fluidTable: table ?? null, cycleResult: result }));
    } else {
      setAfter(p => ({ ...(p ?? EMPTY_PASS), refrigerant: fluid, fluidTable: table ?? null, cycleResult: result }));
    }
  }

  function setDiagnosticData(results: DiagnosticResult[]) {
    if (currentPass === 'before') {
      setBefore(p => ({ ...p, diagnosticResults: results }));
    } else {
      setAfter(p => ({ ...(p ?? EMPTY_PASS), diagnosticResults: results }));
    }
  }

  function startAfterPass() {
    setAfter({ ...EMPTY_PASS });
    setCurrentPass('after');
  }

  function resetPasses() {
    setBefore({ ...EMPTY_PASS });
    setAfter(null);
    setCurrentPass('before');
  }

  return (
    <ReportContext.Provider value={{
      before, after, currentPass,
      setCycleData, setDiagnosticData, startAfterPass, resetPasses,
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext(): ReportContextValue {
  return useContext(ReportContext);
}
