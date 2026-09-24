import type { PassData } from '../types/report';
import { loadFluidTable } from './fluidTableLoader';
import { satFromTemp, satFromPressure } from './fluidInterpolator';
import { FLUID_CATALOG } from '../constants/fluidCatalog';

// ─── Query-time saturation lookup ────────────────────────────────────────────

// Sort longest-first to avoid partial matches (R600a before R600, R1234yf before R134a…)
const SORTED_IDS = FLUID_CATALOG.map(f => f.id).sort((a, b) => b.length - a.length);
const FLUID_RE   = new RegExp(`\\b(${SORTED_IDS.join('|')})\\b`, 'i');
const PRESS_RE   = /(\d+(?:[.,]\d+)?)\s*bar/i;
const TEMP_RE    = /([+-]?\d+(?:[.,]\d+)?)\s*°?\s*[cC]/;

export async function computeSatNote(text: string): Promise<string> {
  const fluidMatch = FLUID_RE.exec(text);
  if (!fluidMatch) return '';
  const fluidId = FLUID_CATALOG.find(f => f.id.toLowerCase() === fluidMatch[1].toLowerCase())?.id;
  if (!fluidId) return '';

  const pressMatch = PRESS_RE.exec(text);
  const tempMatch  = TEMP_RE.exec(text);
  if (!pressMatch && !tempMatch) return '';

  try {
    const table = await loadFluidTable(fluidId);
    const parts: string[] = [];

    if (pressMatch) {
      const p = parseFloat(pressMatch[1].replace(',', '.'));
      const pt = satFromPressure(table, p);
      if (pt.tempDewC !== undefined) {
        parts.push(`${fluidId} à ${p} bar abs : T_bulle=${pt.tempC.toFixed(1)}°C, T_rosée=${pt.tempDewC.toFixed(1)}°C`);
      } else {
        // Pure fluid: mini-table ±2 bar so the model sees a consistent trend
        const pSteps = [-2, -1, 0, 1, 2]
          .map(d => Math.max(0.5, Math.round((p + d) * 10) / 10))
          .filter((v, i, a) => a.indexOf(v) === i);
        const entries: string[] = [];
        for (const pRef of pSteps) {
          try {
            const ptRef = satFromPressure(table, pRef);
            entries.push(`${pRef}bar→${ptRef.tempC.toFixed(1)}°C${pRef === p ? '*' : ''}`);
          } catch { /* hors plage */ }
        }
        parts.push(`${fluidId} table : ${entries.join(' | ')}  (* = valeur à utiliser)`);
      }
    }

    if (tempMatch) {
      const t = parseFloat(tempMatch[1].replace(',', '.'));
      const pt = satFromTemp(table, t);
      if (pt.tempDewC !== undefined) {
        parts.push(`${fluidId} à T_bulle=${t}°C : P_sat=${pt.pressureBar.toFixed(2)} bar abs`);
      } else {
        parts.push(`${fluidId} à ${t}°C : P_sat=${pt.pressureBar.toFixed(2)} bar abs`);
      }
    }

    if (!parts.length) return '';
    return parts.join('\n');
  } catch {
    return '';
  }
}

// ─── Fluid reference tables ───────────────────────────────────────────────────

const REFERENCE_FLUIDS = FLUID_CATALOG.map(f => f.id);

// Common field pressures for P→T lookup (avoids model interpolation errors)
const REF_PRESSURES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 40, 50];
const REF_TEMPS     = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50];

async function fluidRefLine(id: string): Promise<string | null> {
  try {
    const table = await loadFluidTable(id);

    // P → T  (direct lookup — model must NOT interpolate, just read)
    const pPts: string[] = [];
    for (const p of REF_PRESSURES) {
      try {
        const pt = satFromPressure(table, p);
        if (pt.tempC > -90 && pt.tempC < 250) {
          const entry = pt.tempDewC != null
            ? `${p}bar:bulle=${pt.tempC.toFixed(1)}°C rosée=${pt.tempDewC.toFixed(1)}°C`
            : `${p}bar:${pt.tempC.toFixed(1)}°C`;
          pPts.push(entry);
        }
      } catch { /* outside range */ }
    }

    // T → P  (secondary reference)
    const tPts: string[] = [];
    for (const t of REF_TEMPS) {
      try {
        const pt = satFromTemp(table, t);
        if (pt.pressureBar > 0.05 && pt.pressureBar < 200) {
          tPts.push(`${t}°C:${pt.pressureBar.toFixed(2)}bar`);
        }
      } catch { /* outside range */ }
    }

    if (!pPts.length && !tPts.length) return null;
    const lines = [`### ${id}`];
    if (pPts.length) lines.push(`P→T: ${pPts.join(', ')}`);
    if (tPts.length) lines.push(`T→P: ${tPts.join(', ')}`);
    return lines.join('\n');
  } catch {
    return null;
  }
}

// Call once when the copilot screen mounts — results are cached by fluidTableLoader.
export async function loadFluidReferences(): Promise<string> {
  const results = await Promise.allSettled(REFERENCE_FLUIDS.map(id => fluidRefLine(id)));
  return results
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean)
    .join('\n');
}

// ─── Installation context ─────────────────────────────────────────────────────

function fmt(v: number, d = 2): string { return v.toFixed(d); }

function passToText(pass: PassData, label: string): string {
  const c = pass.cycleResult;
  const r = pass.refrigerant;
  if (!c || !r) return '';

  const bp = c.points[0].pressureBar;
  const hp = c.points[2].pressureBar;
  const t1 = c.points[0].temperatureC;
  const t2 = c.points[1].temperatureC;
  const t3 = c.points[2].temperatureC;

  const lines = [
    `## Mesures ${label}`,
    `Fluide : ${r.name} (GWP ${r.gwp})`,
    `BP : ${fmt(bp)} bar abs | HP : ${fmt(hp)} bar abs | Taux compression : ${fmt(c.compressionRatio)}`,
    `T aspiration : ${fmt(t1, 1)} °C | T refoulement : ${fmt(t2, 1)} °C | T sortie cond : ${fmt(t3, 1)} °C`,
    `COP : ${fmt(c.cop)} | Effet frigorifique : ${fmt(c.refrigeratingEffect, 1)} kJ/kg`,
  ];

  if (pass.diagnosticResults.length > 0) {
    lines.push(`Diagnostics :`);
    for (const d of pass.diagnosticResults) {
      lines.push(`  - ${d.label} : ${d.score}% → ${d.recommendation}`);
    }
  }

  return lines.join('\n');
}

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(
  before: PassData,
  after: PassData | null,
  satData: string = '',
): string {
  const contextBlocks: string[] = [];
  const beforeText = passToText(before, 'avant intervention');
  const afterText  = after ? passToText(after, 'après intervention') : '';
  if (beforeText) contextBlocks.push(beforeText);
  if (afterText)  contextBlocks.push(afterText);

  const installContext = contextBlocks.length > 0
    ? `\n${contextBlocks.join('\n\n')}`
    : '\nAucune mesure chargée.';

  const dataSection = satData
    ? `\n\n# VALEURS CALCULÉES LOCALEMENT — PRIORITÉ ABSOLUE\n${satData}\nRègle : ta réponse DOIT utiliser exactement ces valeurs. Ne recalcule pas.`
    : '';

  return `Tu es Boreas, assistant technique spécialisé en froid et climatisation. Soigne l'orthographe et la grammaire française.

# CE QUE TU SAIS FAIRE
- Tables de saturation et propriétés de tous les fluides frigorigènes courants
- Diagnostic à partir de symptômes décrits (bruit, givre, surchauffe, disjonction HP…)
- Choix de fluide de substitution, compatibilité huiles, réglementation F-Gas
- Dimensionnement indicatif : puissance, débit, taille échangeurs
- Composants : TXV, détendeur électronique, pressostats, déshydrateur
- Calculs : bar/psi/°C/°F, COP, taux de compression, sous-refroidissement, surchauffe
- Bonnes pratiques : tirage au vide, récupération, charge par pesée

# STYLE
- Réponds uniquement à ce qui est demandé, rien de plus
- Pas d'introduction, pas de conclusion, pas de reformulation de la question
- Valeurs numériques précises, jamais "environ" si la donnée est connue
- Toujours en français

# CONTEXTE INSTALLATION ACTUELLE (optionnel)${installContext}${dataSection}`;
}
