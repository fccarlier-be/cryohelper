import type { FaultId } from '../types/diagnostic';

export interface FaultDefinition {
  label: string;
  description: string;
  recommendation: string;
}

export const FAULT_DEFINITIONS: Record<FaultId, FaultDefinition> = {
  LOW_REFRIGERANT: {
    label: 'Manque de frigorigène',
    description: 'Charge insuffisante : la BP est anormalement basse, la surchauffe est élevée et le sous-refroidissement est faible.',
    recommendation: 'Contrôler l\'étanchéité du circuit, rechercher les fuites (détecteur + UV), recharger après réparation.',
  },
  REFRIGERANT_OVERCHARGE: {
    label: 'Surcharge de frigorigène',
    description: 'Charge excessive : la HP est anormalement haute, le sous-refroidissement est élevé et la BP peut être légèrement haute.',
    recommendation: 'Récupérer le surplus de frigorigène jusqu\'à retrouver un sous-refroidissement nominal (4–8 K).',
  },
  POOR_EVAPORATOR: {
    label: 'Évaporateur encrassé / givré',
    description: 'Échange thermique dégradé à l\'évaporateur : BP basse malgré une surchauffe élevée, la condensation est normale.',
    recommendation: 'Vérifier le givre, nettoyer l\'évaporateur, contrôler le ventilateur et la charge de givre.',
  },
  POOR_CONDENSER: {
    label: 'Condenseur encrassé / obstrué',
    description: 'Échange thermique dégradé au condenseur : HP élevée avec un écart condTempC − T_ambiante important.',
    recommendation: 'Nettoyer le condenseur (air comprimé, brosse), vérifier le débit d\'air et le ventilateur.',
  },
  TXV_UNDERFEEDING: {
    label: 'Détendeur sous-alimenté (TXV)',
    description: 'Le détendeur ouvre insuffisamment : BP très basse, surchauffe excessive (> 15 K), débit frigorigène réduit.',
    recommendation: 'Vérifier le bulbe de thermostat, le réglage du détendeur, l\'absence de bouchon humide ou filtre colmaté.',
  },
  TXV_OVERFEEDING: {
    label: 'Détendeur sur-alimenté (TXV)',
    description: 'Le détendeur ouvre trop : BP haute, surchauffe nulle ou très faible, risque de retour de liquide au compresseur.',
    recommendation: 'Régler le détendeur (augmenter la surchauffe de consigne), vérifier le bulbe et la charge du bulbe.',
  },
  COMPRESSOR_FAULT: {
    label: 'Défaillance compresseur',
    description: 'Taux de compression faible : l\'écart HP/BP est insuffisant, indiquant des clapets défaillants ou une usure interne.',
    recommendation: 'Mesurer les pressions à l\'arrêt et en régime, tester les clapets, envisager le remplacement du compresseur.',
  },
  NON_CONDENSABLE: {
    label: 'Incondensables dans le circuit',
    description: 'Présence d\'air ou de gaz non condensables : HP anormalement élevée avec sous-refroidissement faible, irrégularités de HP.',
    recommendation: 'Récupérer le frigorigène, purger le circuit côté HP à l\'arrêt, vérifier l\'étanchéité avant de recharger.',
  },
};

/** Surchauffe nominale acceptable (K) */
export const NOMINAL_SUPERHEAT = { min: 4, max: 10 };
/** Sous-refroidissement nominal acceptable (K) */
export const NOMINAL_SUBCOOLING = { min: 4, max: 8 };
/** Écart condTempC − T_ambiante normal pour un condenseur propre (K) */
export const NOMINAL_COND_APPROACH = { min: 8, max: 18 };
/** Taux de compression minimal acceptable */
export const MIN_COMPRESSION_RATIO = 2.5;
