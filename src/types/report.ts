import type { CycleResult } from './enthalpy';
import type { DiagnosticResult } from './diagnostic';
import type { RefrigerantData } from './refrigerant';
import type { FluidTable } from './fluidTable';

export interface ActionItem {
  id: string;
  label: string;
  checked: boolean;
}

export const DEFAULT_ACTIONS: ActionItem[] = [
  { id: 'leak_check',         label: 'Recherche de fuites effectuée',         checked: false },
  { id: 'condenser_clean',    label: 'Nettoyage condenseur effectué',          checked: false },
  { id: 'evaporator_clean',   label: 'Nettoyage évaporateur effectué',         checked: false },
  { id: 'charge_top_up',      label: 'Complément de charge effectué',          checked: false },
  { id: 'charge_recovery',    label: 'Récupération de fluide excédentaire',    checked: false },
  { id: 'filter_replace',     label: 'Remplacement filtre déshydrateur',       checked: false },
  { id: 'purge_nc',           label: 'Purge des incondensables',               checked: false },
  { id: 'txv_adjust',         label: 'Réglage détendeur (TXV)',                checked: false },
  { id: 'settings_adjust',    label: 'Réglages paramètres effectués',          checked: false },
  { id: 'electrical_check',   label: 'Contrôle électrique effectué',           checked: false },
  { id: 'fan_check',          label: 'Contrôle ventilateurs',                  checked: false },
  { id: 'pressure_switch',    label: 'Vérification pressostat HP/BP',          checked: false },
  { id: 'compressor_replace', label: 'Remplacement compresseur',               checked: false },
  { id: 'txv_replace',        label: 'Remplacement détendeur',                 checked: false },
];

export interface PassData {
  refrigerant: RefrigerantData | null;
  fluidTable: FluidTable | null;
  cycleResult: CycleResult | null;
  diagnosticResults: DiagnosticResult[];
}

export interface ReportData {
  clientName: string;
  installationRef: string;
  companyName: string;
  technicianName: string;
  interventionDate: Date;
  before: PassData;
  after: PassData | null;
  actions: ActionItem[];
  observations: string;
  techSignature: string | null;
  clientSignature: string | null;
}
