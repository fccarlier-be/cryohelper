/**
 * Business constants for simplified thermal balance calculations.
 * All values are engineering approximations suitable for field estimates.
 */

import type { InsulationLevel, InternalLoads, RoomType } from '../types/thermal';

// ─── Envelope U-values (W/m²·K) ─────────────────────────────────────────────
// Overall heat-transfer coefficient for the combined envelope (walls + roof).
// Approximate values that account for thermal bridges and typical construction.

export const U_VALUES: Record<InsulationLevel, number> = {
  low:    0.90, // Old construction, no dedicated insulation
  medium: 0.45, // Standard cold-room insulation ~80 mm polyurethane
  good:   0.22, // High-performance insulation ~120 mm+ polyurethane
};

/** Floor U-value is halved relative to wall U-value (ground coupling) */
export const FLOOR_U_FACTOR = 0.5;

// ─── Internal heat loads (W/m² of floor area) ───────────────────────────────

export const INTERNAL_LOAD_W_PER_M2: Record<InternalLoads, number> = {
  low:    5,  // Empty storage, minimal activity
  medium: 15, // Normal occupancy / light process equipment
  high:   35, // High density racking, forklifts, significant occupancy
};

// ─── Infiltration factor ─────────────────────────────────────────────────────
// Expressed as a fraction of envelope heat gain.
// Accounts for door opening, air curtains, and structural leakage.

export const INFILTRATION_FACTOR: Record<RoomType, number> = {
  cold_storage:    0.20,
  freezer:         0.15, // Fewer door openings, better sealing
  air_conditioning:0.15,
  server_room:     0.05, // Sealed environment with dedicated fresh-air handling
  food_processing: 0.25, // Frequent door activity
};

// ─── Safety margins ──────────────────────────────────────────────────────────
// Applied on top of base calculation to size the equipment.
// Margin is given as a decimal (0.10 = 10%).

export const SAFETY_MARGIN: Record<RoomType, number> = {
  cold_storage:    0.15,
  freezer:         0.20, // Defrost cycles add to peak demand
  air_conditioning:0.10,
  server_room:     0.25, // Uptime criticality
  food_processing: 0.20,
};

// ─── Room type display labels ─────────────────────────────────────────────────

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  cold_storage:    'Chambre froide',
  freezer:         'Congélateur / surgélateur',
  air_conditioning:'Climatisation',
  server_room:     'Salle serveurs',
  food_processing: 'Local de production alimentaire',
};

// ─── COSTIC simplified method — comfort AC (T_int = 24 °C) ──────────────────
// Source: Méthode simplifiée COSTIC / COFRETH, application confort seulement
// Facteurs en W/m², W/personne ou W/m.lin selon l'élément
// Colonnes : T_ext = [28, 32, 36, 40] °C

export const COSTIC_T_EXT = [28, 32, 36, 40] as const;

export const COSTIC_FACTORS = {
  // Fenêtres vitrées (W/m²) — par orientation
  fenetresSE:      [100, 132, 165, 198] as const, // S, SE
  fenetresSO:      [109, 142, 175, 210] as const, // SO
  fenetresO:       [121, 159, 195, 235] as const, // O
  fenetresN:       [ 48,  63,  77,  94] as const, // N, NE, NO
  fenetresNord:    [ 16,  28,  40,  52] as const, // Non exposées (façade nord)
  // Murs (W/m²)
  mursLeger:       [ 44,  58,  72,  88] as const, // Exposés — construction légère
  mursLourd:       [ 36,  48,  60,  74] as const, // Exposés — construction lourde
  mursNonExposes:  [ 20,  38,  56,  74] as const, // Non exposés
  cloisons:        [ 14,  24,  34,  43] as const, // Cloisons intérieures
  // Plafond / toiture (W/m²)
  plafondLocalNc:  [ 16,  26,  35,  44] as const, // Local non climatisé au-dessus
  plafondMansarde: [  9,  13,  16,  20] as const, // Mansarde / toit incliné exposé
  plafondTerrasse: [ 16,  22,  28,  35] as const, // Terrasse
  toitureNi:       [ 28,  38,  48,  58] as const, // Toiture non isolée
  // Plancher (W/m²)
  plancher:        [  5,   9,  12,  15] as const, // Sur local non climatisé
  // Apports internes
  occupants:       [ 80,  80,  80,  80] as const, // W / personne (sensible)
  appareils:       [1.0, 1.0, 1.0, 1.0] as const, // × wattage installé (W)
  portes:          [100, 150, 200, 250] as const, // W / m linéaire de porte ouverte
} as const;

export const COSTIC_DEFAULTS: import('../types/thermal').COSTICInput = {
  tExtC: 36,
  fenetresSE_m2: 0,
  fenetresSO_m2: 0,
  fenetresO_m2: 0,
  fenetresN_m2: 0,
  fenetresNord_m2: 0,
  mursLeger_m2: 0,
  mursLourd_m2: 0,
  mursNonExposes_m2: 0,
  cloisons_m2: 0,
  plafondLocalNc_m2: 0,
  plafondMansarde_m2: 0,
  plafondTerrasse_m2: 0,
  toitureNi_m2: 0,
  plancher_m2: 0,
  occupants: 0,
  appareilsW: 0,
  portesM: 0,
};

// ─── Default form values ─────────────────────────────────────────────────────

export const THERMAL_DEFAULTS = {
  quick: {
    surfaceM2: 20,
    heightM: 3,
    deltaT: 30,
    insulationLevel: 'medium' as InsulationLevel,
  },
  detailed: {
    surfaceM2: 20,
    heightM: 3,
    tempInteriorC: 4,
    tempExteriorC: 35,
    insulationLevel: 'medium' as InsulationLevel,
    internalLoads: 'medium' as InternalLoads,
    roomType: 'cold_storage' as RoomType,
  },
};
