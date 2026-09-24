#!/usr/bin/env python3
"""
generate_tables.py — Génère des tables thermodynamiques haute résolution pour CryoHelper.

Prérequis :
    pip install CoolProp

Usage :
    python scripts/generate_tables.py

Sorties :
    src/data/tables/<id>.json  (un fichier par fluide)
    src/data/tables/index.json (métadonnées de tous les fluides)

Tables générées par fluide :
  • sat  : courbe de saturation, pas 0.1 °C, de t_min à T_crit - 0.1 °C
           colonnes : [P_bar, hL, hV, sL, sV, rhoL, rhoV]
  • sh   : vapeur surchauffée, isobares de P_min à 0.95·P_crit, pas SH_DP bar
           pour chaque isobare : T de T_sat+0.5 à T_sat+SH_OVERHEAD, pas 1 °C
           colonnes : [T_C, h_kJkg, s_kJkgK, rho_kgm3]

Précision de sortie :
  • Pressions   : 4 décimales (bar)
  • Enthalpies  : 3 décimales (kJ/kg)
  • Entropies   : 5 décimales (kJ/kg·K)
  • Masses vol. : 4 décimales (kg/m³)
"""

import json
import math
import os
import sys
import traceback

try:
    import CoolProp.CoolProp as CP
except ImportError:
    print("❌  CoolProp non installé. Lance : pip install CoolProp")
    sys.exit(1)

# ── Chemins de sortie ─────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'tables')
os.makedirs(OUT_DIR, exist_ok=True)

# ── Paramètres de résolution ──────────────────────────────────────────────────

SAT_STEP_C    = 0.1    # pas de la table de saturation (°C)
SH_DP_BAR     = 0.5    # pas des isobares vapeur surchauffée (bar)
SH_DT_C       = 1.0    # pas en température sur chaque isobare (°C)
SH_OVERHEAD_K = 80     # nb de K au-dessus de T_sat à couvrir
SH_P_MIN_BAR  = 0.05   # pression minimale des isobares (bar)

# ── Définitions des fluides ───────────────────────────────────────────────────
# (app_id, coolprop_name, nom_affichage, t_min_C, gwp100, ashrae_class)
# t_min_C : limite basse pratique (°C) — au-dessus du point triple
#
# Blends gérés en pseudo-pur par CoolProp (HEOS) :
#   R410A, R407C, R404A, R507A
# Pour R448A, R449A, R452A, R454B → nécessitent REFPROP (non libre).
# ─────────────────────────────────────────────────────────────────────────────

FLUIDS = [
    # HFC purs
    ("R134a",    "R134a",       "R134a",             -70,  1430, "A1"),
    ("R32",      "R32",         "R32",               -70,   675, "A2L"),
    ("R22",      "R22",         "R22 (HCFC)",        -70,  1810, "A1"),
    # HFC mélanges (pseudo-purs CoolProp)
    ("R410A",    "R410A",       "R410A",             -70,  2088, "A1"),
    ("R407C",    "R407C",       "R407C",             -70,  1774, "A1"),
    ("R404A",    "R404A",       "R404A",             -70,  3922, "A1"),
    ("R507A",    "R507A",       "R507A",             -70,  3985, "A1"),
    # HFO
    ("R1234yf",  "R1234yf",     "R1234yf (HFO)",     -60,     4, "A2L"),
    ("R1234ze",  "R1234ze(E)",  "R1234ze(E) (HFO)",  -50,     7, "A2L"),
    # Naturels
    ("R744",     "CO2",         "R744 (CO₂)",        -55,     1, "A1"),
    ("R290",     "Propane",     "R290 (Propane)",    -70,     3, "A3"),
    ("R600",     "n-Butane",    "R600 (Butane)",     -20,    20, "A3"),
    ("R600a",    "IsoButane",   "R600a (Isobutane)", -40,    20, "A3"),
    ("R717",     "Ammonia",     "R717 (NH₃)",        -60,     0, "B2L"),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def r(v: float, dec: int) -> float:
    """Arrondi sécurisé — retourne None si invalide."""
    if v is None or math.isnan(v) or math.isinf(v):
        return None
    return round(v, dec)


def props(output: str, in1: str, v1: float, in2: str, v2: float, fluid: str):
    """PropsSI avec gestion d'erreur silencieuse → None si échec."""
    try:
        val = CP.PropsSI(output, in1, v1, in2, v2, fluid)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    except Exception:
        return None


def pa_to_bar(pa: float) -> float:
    return pa / 1e5


def j_to_kj(j: float) -> float:
    return j / 1000.0

# ── Saturation table ──────────────────────────────────────────────────────────

def build_sat_table(cp_name: str, t_min_c: float) -> dict:
    """
    Construit la table de saturation de t_min_c à T_crit - 0.1 °C, pas 0.1 °C.
    Retourne un dict avec tMinC, tStepC, et rows[][7].
    Colonnes : [P_bar, hL_kJkg, hV_kJkg, sL_kJkgK, sV_kJkgK, rhoL_kgm3, rhoV_kgm3]
    """
    # Bornes critiques
    T_crit_K = CP.PropsSI('Tcrit', cp_name)
    t_crit_c = T_crit_K - 273.15

    # Vérifier le point triple pour ajuster t_min
    try:
        T_triple_K = CP.PropsSI('Ttriple', cp_name)
        t_triple_c = T_triple_K - 273.15
        t_min_c = max(t_min_c, t_triple_c + 0.2)
    except Exception:
        pass

    t_max_c = t_crit_c - 0.1
    n = int(round((t_max_c - t_min_c) / SAT_STEP_C)) + 1

    rows = []
    for i in range(n):
        t_c = t_min_c + i * SAT_STEP_C
        T_K = t_c + 273.15

        P   = props('P',    'T', T_K, 'Q', 0, cp_name)
        hL  = props('H',    'T', T_K, 'Q', 0, cp_name)
        hV  = props('H',    'T', T_K, 'Q', 1, cp_name)
        sL  = props('S',    'T', T_K, 'Q', 0, cp_name)
        sV  = props('S',    'T', T_K, 'Q', 1, cp_name)
        rL  = props('D',    'T', T_K, 'Q', 0, cp_name)
        rV  = props('D',    'T', T_K, 'Q', 1, cp_name)

        if any(v is None for v in [P, hL, hV, sL, sV, rL, rV]):
            continue  # point invalide → on saute

        rows.append([
            r(pa_to_bar(P),    4),
            r(j_to_kj(hL),     3),
            r(j_to_kj(hV),     3),
            r(j_to_kj(sL),     5),
            r(j_to_kj(sV),     5),
            r(rL,              4),
            r(rV,              4),
        ])

    return {
        "tMinC":  round(t_min_c, 1),
        "tStepC": SAT_STEP_C,
        "cols":   ["P_bar","hL_kJkg","hV_kJkg","sL_kJkgK","sV_kJkgK","rhoL_kgm3","rhoV_kgm3"],
        "rows":   rows,
    }

# ── Superheated vapor table ───────────────────────────────────────────────────

def build_sh_table(cp_name: str) -> list:
    """
    Construit les isobares de vapeur surchauffée.
    Retourne une liste de dicts : { pBar, tSatC, tMinC, tStepC, rows[][4] }
    Colonnes : [T_C, h_kJkg, s_kJkgK, rho_kgm3]
    """
    P_crit_Pa = CP.PropsSI('Pcrit', cp_name)
    P_crit_bar = pa_to_bar(P_crit_Pa)
    P_max_bar  = 0.95 * P_crit_bar

    isobars = []
    P_bar = SH_P_MIN_BAR

    while P_bar <= P_max_bar:
        P_Pa = P_bar * 1e5

        # T_sat à cette pression
        T_sat_K = props('T', 'P', P_Pa, 'Q', 1, cp_name)
        if T_sat_K is None:
            P_bar = round(P_bar + SH_DP_BAR, 4)
            continue
        t_sat_c = T_sat_K - 273.15

        # Points de la surchauffe : T_sat + 0.5 K à T_sat + SH_OVERHEAD K
        n   = int(SH_OVERHEAD_K / SH_DT_C)
        rows = []
        for i in range(n + 1):
            t_c = t_sat_c + 0.5 + i * SH_DT_C
            T_K = t_c + 273.15

            h   = props('H', 'P', P_Pa, 'T', T_K, cp_name)
            s   = props('S', 'P', P_Pa, 'T', T_K, cp_name)
            rho = props('D', 'P', P_Pa, 'T', T_K, cp_name)

            if any(v is None for v in [h, s, rho]):
                break  # fin de la région valide pour cette isobare

            rows.append([
                r(t_c,           2),
                r(j_to_kj(h),    3),
                r(j_to_kj(s),    5),
                r(rho,           4),
            ])

        if len(rows) >= 5:  # isobare valide seulement si on a assez de points
            isobars.append({
                "pBar":   r(P_bar, 4),
                "tSatC":  r(t_sat_c, 3),
                "tMinC":  r(t_sat_c + 0.5, 3),
                "tStepC": SH_DT_C,
                "cols":   ["T_C","h_kJkg","s_kJkgK","rho_kgm3"],
                "rows":   rows,
            })

        P_bar = round(P_bar + SH_DP_BAR, 4)

    return isobars

# ── Génération principale ─────────────────────────────────────────────────────

def generate_fluid(app_id: str, cp_name: str, display_name: str,
                   t_min_c: float, gwp: int, ashrae: str) -> dict | None:
    print(f"  ├─ saturation...", end='', flush=True)
    try:
        sat = build_sat_table(cp_name, t_min_c)
    except Exception as e:
        print(f"\n  ✗ Saturation échouée : {e}")
        traceback.print_exc()
        return None
    print(f" {len(sat['rows'])} points", end='', flush=True)

    print(f"  ├─ surchauffe...", end='', flush=True)
    try:
        sh = build_sh_table(cp_name)
    except Exception as e:
        print(f"\n  ✗ Surchauffe échouée : {e}")
        traceback.print_exc()
        return None
    print(f" {len(sh)} isobares", end='', flush=True)

    # Propriétés critiques
    T_crit_K   = CP.PropsSI('Tcrit',  cp_name)
    P_crit_Pa  = CP.PropsSI('Pcrit',  cp_name)
    M          = CP.PropsSI('M',      cp_name) * 1000  # kg/mol → g/mol

    data = {
        "id":                 app_id,
        "name":               display_name,
        "coolpropName":       cp_name,
        "molarMass":          r(M, 2),
        "criticalTempC":      r(T_crit_K - 273.15, 2),
        "criticalPressureBar":r(pa_to_bar(P_crit_Pa), 3),
        "gwp100":             gwp,
        "ashraeClass":        ashrae,
        "sat":                sat,
        "sh":                 sh,
    }
    return data


def main():
    print(f"\n🧊  CryoHelper — Génération des tables thermodynamiques")
    print(f"    Répertoire de sortie : {os.path.abspath(OUT_DIR)}\n")
    print(f"    Résolution : saturation {SAT_STEP_C}°C | isobares Δ{SH_DP_BAR} bar | "
          f"surchauffe Δ{SH_DT_C}°C (+{SH_OVERHEAD_K} K)\n")

    index = []
    ok, fail = 0, 0

    for (app_id, cp_name, display_name, t_min_c, gwp, ashrae) in FLUIDS:
        print(f"\n▶  {display_name} ({cp_name})")
        data = generate_fluid(app_id, cp_name, display_name, t_min_c, gwp, ashrae)

        if data is None:
            print(f"  ✗ IGNORÉ")
            fail += 1
            continue

        # Écriture JSON (séparation compacte pour minimiser la taille)
        out_path = os.path.join(OUT_DIR, f"{app_id}.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'), ensure_ascii=False)

        size_kb = os.path.getsize(out_path) / 1024
        print(f"  ✓  → {app_id}.json ({size_kb:.0f} KB)")

        index.append({
            "id":                  app_id,
            "name":                display_name,
            "coolpropName":        cp_name,
            "molarMass":           data["molarMass"],
            "criticalTempC":       data["criticalTempC"],
            "criticalPressureBar": data["criticalPressureBar"],
            "gwp100":              gwp,
            "ashraeClass":         ashrae,
            "satPoints":           len(data["sat"]["rows"]),
            "shIsobars":           len(data["sh"]),
        })
        ok += 1

    # Index global
    index_path = os.path.join(OUT_DIR, 'index.json')
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    total_kb = sum(
        os.path.getsize(os.path.join(OUT_DIR, f))
        for f in os.listdir(OUT_DIR)
        if f.endswith('.json')
    ) / 1024

    print(f"\n{'─'*60}")
    print(f"✅  {ok} fluides générés, {fail} échoués")
    print(f"    Taille totale : {total_kb:.0f} KB ({total_kb/1024:.1f} MB)")
    print(f"    Index : {index_path}")
    print(f"\n⚠️   R448A, R449A, R452A, R454B nécessitent REFPROP (non libre).")
    print(f"    Pour les ajouter : acheter REFPROP + utiliser le backend CoolProp REFPROP.\n")


if __name__ == '__main__':
    main()
