export interface CycleMetrics {
  bpBar: number;
  hpBar: number;
  cop: number;
  compressionRatio: number;
  tSatEvapC: number | null;
  tSatCondC: number | null;
  superheatK: number | null;
  subcoolingK: number | null;
}

export interface HistoryEntry {
  id: string;
  savedAt: string;          // ISO date
  clientName: string;
  installationRef: string;
  technicianName: string;
  refrigerantId: string;
  refrigerantName: string;
  before: CycleMetrics;
  after: CycleMetrics | null;
  diagnosticCount: number;
}
