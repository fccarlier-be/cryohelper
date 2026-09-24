#!/usr/bin/env python3
"""
generate_tables.py — Génère les tables thermodynamiques de CryoHelper avec CoolProp.

Prérequis :
    pip install CoolProp        (testé avec CoolProp 8.0)

Usage :
    python scripts/generate_tables.py                 # régénère les 23 fluides
    python scripts/generate_tables.py --only R454B,R32
    python scripts/generate_tables.py --check         # compare avec les tables actuelles, n'écrit rien
    python scripts/generate_tables.py --out /tmp/tables

Sorties (format lu par src/services/fluidTableLoader.ts) :
    <out>/<id>.bin   JSON compact, un fichier par fluide
    <out>/index.bin  métadonnées de tous les fluides

Deux formats de table de saturation (voir src/types/fluidTable.ts) :
  • Fluides purs et pseudo-purs — indexés en température, pas de 0,1 °C :
        colonnes [P_bar, hL, hV, sL, sV, rhoL, rhoV]
  • Mélanges zéotropiques — indexés en pression, pas de 0,01 bar :
        colonnes [P_bar, Tbub_C, Tdew_C, hL, hV, sL, sV, rhoL, rhoV]
    hL/sL/rhoL sont pris au point de bulle, hV/sV/rhoV au point de rosée.
    Chaque point est calculé par un flash exact (P, Q) ; là où CoolProp ne
    converge pas (haute pression), on interpole l'enveloppe de phase, qui
    couvre tout le dôme jusqu'à la zone critique.

Vapeur surchauffée (commun) : isobares tous les 0,5 bar, de 0,05 bar à
0,95 × P_max, chacune de T_sat + 0,5 K à T_sat + 80,5 K par pas de 1 K
(T_sat = T_rosée pour un mélange). Colonnes [T_C, h, s, rho].

Unités : bar absolu, °C, kJ/kg, kJ/kg·K, kg/m³. État de référence IIR
(h = 200 kJ/kg, s = 1 kJ/kg·K pour le liquide saturé à 0 °C), celui de CoolProp.

Après une régénération, lancer `npm test` : les tests vérifient les tables
contre des valeurs de référence. Tout nouveau fluide doit aussi être déclaré
dans fluidTableLoader.ts, constants/fluidCatalog.ts et le type RefrigerantId.
"""

import argparse
import json
import math
import os
import sys

try:
    import CoolProp
    import CoolProp.CoolProp as CP
except ImportError:
    print("❌  CoolProp non installé. Lance : pip install CoolProp")
    sys.exit(1)

import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'tables'))

# ── Paramètres de résolution ──────────────────────────────────────────────────

SAT_STEP_C    = 0.1    # pas de la table de saturation, fluides purs (°C)
ZEO_P_MIN_BAR = 0.1    # début de la table de saturation, mélanges (bar)
ZEO_P_STEP    = 0.01   # pas de la table de saturation, mélanges (bar)
SH_DP_BAR     = 0.5    # pas entre isobares de vapeur surchauffée (bar)
SH_DT_C       = 1.0    # pas en température sur chaque isobare (°C)
SH_OVERHEAD_K = 80     # étendue de chaque isobare au-dessus de T_sat (K)
SH_P_MIN_BAR  = 0.05   # pression de la première isobare (bar)

# ── Fluides ───────────────────────────────────────────────────────────────────
# (id app, fluide CoolProp, nom affiché, type, t_min °C, GWP100, classe ASHRAE)
#
# type 'pure'  : fluide pur ou pseudo-pur CoolProp → table indexée en T.
#                R410A, R407C, R404A et R507A sont des modèles pseudo-purs :
#                leur glissement est ignoré (≈ 0,1 K pour R410A, mais ≈ 7 K
#                pour R407C). Pour traiter R407C en vrai mélange, remplacer
#                par ('R407C', 'R407C.mix', …, 'blend', …).
# type 'blend' : mélange zéotropique (définition CoolProp *.mix, fractions
#                massiques normalisées) → table indexée en P.
# t_min est relevé automatiquement au-dessus du point triple.

FLUIDS = [
    # HFC / HCFC
    ("R134a",   "R134a",      "R134a",                 "pure",  -70, 1430, "A1"),
    ("R32",     "R32",        "R32",                   "pure",  -70,  675, "A2L"),
    ("R22",     "R22",        "R22 (HCFC)",            "pure",  -70, 1810, "A1"),
    # Mélanges HFC (pseudo-purs)
    ("R410A",   "R410A",      "R410A",                 "pure",  -70, 2088, "A1"),
    ("R407C",   "R407C",      "R407C",                 "pure",  -70, 1774, "A1"),
    ("R404A",   "R404A",      "R404A",                 "pure",  -70, 3922, "A1"),
    ("R507A",   "R507A",      "R507A",                 "pure",  -70, 3985, "A1"),
    # HFO
    ("R1234yf", "R1234yf",    "R1234yf (HFO)",         "pure",  -60,    4, "A2L"),
    ("R1234ze", "R1234ze(E)", "R1234ze(E) (HFO)",      "pure",  -50,    7, "A2L"),
    # Naturels
    ("R744",    "CO2",        "R744 (CO₂)",            "pure",  -55,    1, "A1"),
    ("R290",    "Propane",    "R290 (Propane)",        "pure",  -70,    3, "A3"),
    ("R600",    "n-Butane",   "R600 (Butane)",         "pure",  -20,   20, "A3"),
    ("R600a",   "IsoButane",  "R600a (Isobutane)",     "pure",  -40,   20, "A3"),
    ("R717",    "Ammonia",    "R717 (NH₃)",            "pure",  -60,    0, "B2L"),
    # Mélanges zéotropiques HFO / HFC
    ("R448A",   "R448A.mix",  "R448A (Solstice N40)",  "blend", None, 1274, "A1"),
    ("R449A",   "R449A.mix",  "R449A (HFO)",           "blend", None, 2376, "A1"),
    ("R452A",   "R452A.mix",  "R452A (HFO)",           "blend", None, 2140, "A1"),
    ("R452B",   "R452B.mix",  "R452B (HFO)",           "blend", None,  698, "A2L"),
    ("R454A",   "R454A.mix",  "R454A (HFO)",           "blend", None,  238, "A2L"),
    ("R454B",   "R454B.mix",  "R454B (HFO)",           "blend", None,  466, "A2L"),
    ("R454C",   "R454C.mix",  "R454C (HFO)",           "blend", None,  148, "A2L"),
    ("R455A",   "R455A.mix",  "R455A (Solstice L40X)", "blend", None,  145, "A2L"),
    # Eau (cycles vapeur)
    ("R718",    "Water",      "R718 (Eau / Water)",    "pure",  0.5,    0, "A1"),
]

SAT_COLS_PURE = ["P_bar", "hL_kJkg", "hV_kJkg", "sL_kJkgK", "sV_kJkgK", "rhoL_kgm3", "rhoV_kgm3"]
SAT_COLS_ZEO  = ["P_bar", "Tbub_C", "Tdew_C", "hL_kJkg", "hV_kJkg", "sL_kJkgK", "sV_kJkgK", "rhoL_kgm3", "rhoV_kgm3"]
SH_COLS       = ["T_C", "h_kJkg", "s_kJkgK", "rho_kgm3"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def rnd(v, dec):
    return None if v is None or math.isnan(v) or math.isinf(v) else round(v, dec)


def finite(*vals):
    return all(v is not None and not math.isnan(v) and not math.isinf(v) for v in vals)


def props(output, in1, v1, in2, v2, fluid):
    """PropsSI qui renvoie None au lieu de lever une exception."""
    try:
        val = CP.PropsSI(output, in1, v1, in2, v2, fluid)
        return val if finite(val) else None
    except Exception:
        return None

# ── Fluides purs ──────────────────────────────────────────────────────────────

def build_sat_pure(cp_name, t_min_c):
    t_crit_c = CP.PropsSI('Tcrit', cp_name) - 273.15
    try:
        t_min_c = max(t_min_c, CP.PropsSI('Ttriple', cp_name) - 273.15 + 0.2)
    except Exception:
        pass
    t_min_c = round(t_min_c, 1)
    n = int(round((t_crit_c - 0.1 - t_min_c) / SAT_STEP_C)) + 1

    rows = []
    for i in range(n):
        T = t_min_c + i * SAT_STEP_C + 273.15
        vals = [props(o, 'T', T, 'Q', q, cp_name)
                for o, q in (('P', 0), ('H', 0), ('H', 1), ('S', 0), ('S', 1), ('D', 0), ('D', 1))]
        if not finite(*vals):
            if rows:
                break  # the table must stay on a regular temperature grid
            t_min_c = round(t_min_c + SAT_STEP_C, 1)
            continue
        P, hL, hV, sL, sV, dL, dV = vals
        rows.append([rnd(P / 1e5, 4), rnd(hL / 1e3, 3), rnd(hV / 1e3, 3),
                     rnd(sL / 1e3, 5), rnd(sV / 1e3, 5), rnd(dL, 4), rnd(dV, 4)])

    return {"tMinC": t_min_c, "tStepC": SAT_STEP_C, "cols": SAT_COLS_PURE, "rows": rows}


def build_sh_pure(cp_name):
    p_max_bar = 0.95 * CP.PropsSI('Pcrit', cp_name) / 1e5

    def t_sat(p_pa):
        return props('T', 'P', p_pa, 'Q', 1, cp_name)

    def state(p_pa, T):
        vals = [props(o, 'P', p_pa, 'T', T, cp_name) for o in ('H', 'S', 'D')]
        return vals if finite(*vals) else None

    return build_isobars(p_max_bar, t_sat, state)

# ── Mélanges zéotropiques ─────────────────────────────────────────────────────

class Envelope:
    """Enveloppe de phase CoolProp, interpolée en ln(P) sur chaque branche.

    Sur les deux branches, les colonnes *_vap de CoolProp contiennent les
    propriétés de la phase « mère » (liquide au point de bulle, vapeur au
    point de rosée), c'est-à-dire celles dont la table a besoin.
    """

    def __init__(self, state):
        state.build_phase_envelope("")
        pe = state.get_phase_envelope_data()
        self.molar_mass = state.molar_mass()
        q = np.array(pe.Q)
        p = np.array(pe.p)
        self.branches = {}
        for quality in (0, 1):
            idx = np.flatnonzero(q < 0.5) if quality == 0 else np.flatnonzero(q > 0.5)
            # Keep the monotonic part going from low pressure to the top of the branch
            imax = int(np.argmax(p[idx]))
            idx = idx[:imax + 1] if p[idx[0]] <= p[idx[-1]] else idx[imax:]
            order = np.argsort(p[idx])
            idx = idx[order]
            self.branches[quality] = {
                "lnp": np.log(p[idx]),
                "T": np.array(pe.T)[idx],
                "h": np.array(pe.hmolar_vap)[idx] / self.molar_mass,
                "s": np.array(pe.smolar_vap)[idx] / self.molar_mass,
                "rho": np.array(pe.rhomolar_vap)[idx] * self.molar_mass,
            }
        top = min(b["lnp"][-1] for b in self.branches.values())
        self.p_max = math.exp(top)
        # Approximate critical point by the top of the bubble branch
        bub = self.branches[0]
        self.t_crit = float(bub["T"][-1])
        self.p_crit = math.exp(float(bub["lnp"][-1]))

    def at(self, p_pa, quality):
        b = self.branches[quality]
        x = math.log(p_pa)
        return tuple(float(np.interp(x, b["lnp"], b[k])) for k in ("T", "h", "s", "rho"))


def blend_sat_point(state, env, p_pa, quality):
    """(T, h, s, rho) au point de bulle (0) ou de rosée (1) ; flash exact si possible."""
    try:
        state.update(CoolProp.PQ_INPUTS, p_pa, quality)
        vals = (state.T(), state.hmass(), state.smass(), state.rhomass())
        T_env = env.at(p_pa, quality)[0]
        # Reject spurious convergence far from the envelope
        if finite(*vals) and abs(vals[0] - T_env) < 0.5:
            return vals
    except Exception:
        pass
    return env.at(p_pa, quality)


def build_sat_blend(state, env):
    rows = []
    n = int(math.floor((env.p_max / 1e5 - 0.02 - ZEO_P_MIN_BAR) / ZEO_P_STEP)) + 1
    for i in range(n):
        p_bar = round(ZEO_P_MIN_BAR + i * ZEO_P_STEP, 4)
        Tb, hL, sL, dL = blend_sat_point(state, env, p_bar * 1e5, 0)
        Td, hV, sV, dV = blend_sat_point(state, env, p_bar * 1e5, 1)
        rows.append([p_bar, rnd(Tb - 273.15, 4), rnd(Td - 273.15, 4),
                     rnd(hL / 1e3, 3), rnd(hV / 1e3, 3), rnd(sL / 1e3, 5), rnd(sV / 1e3, 5),
                     rnd(dL, 4), rnd(dV, 4)])
    return {"pMinBar": ZEO_P_MIN_BAR, "pStepBar": ZEO_P_STEP, "isZeotropic": True,
            "cols": SAT_COLS_ZEO, "rows": rows}


def build_sh_blend(state, env):
    def t_sat(p_pa):
        return blend_sat_point(state, env, p_pa, 1)[0]

    def st(p_pa, T):
        try:
            state.specify_phase(CoolProp.iphase_gas)
            state.update(CoolProp.PT_INPUTS, p_pa, T)
            vals = [state.hmass(), state.smass(), state.rhomass()]
            return vals if finite(*vals) else None
        except Exception:
            return None
        finally:
            state.unspecify_phase()

    return build_isobars(0.95 * env.p_max / 1e5, t_sat, st)

# ── Vapeur surchauffée (commun) ───────────────────────────────────────────────

def build_isobars(p_max_bar, t_sat_fn, state_fn):
    isobars = []
    p_bar = SH_P_MIN_BAR
    while p_bar <= p_max_bar:
        p_pa = p_bar * 1e5
        T_sat = t_sat_fn(p_pa)
        if T_sat is not None:
            t_sat_c = T_sat - 273.15
            rows = []
            for i in range(int(SH_OVERHEAD_K / SH_DT_C) + 1):
                t_c = t_sat_c + 0.5 + i * SH_DT_C
                vals = state_fn(p_pa, t_c + 273.15)
                if vals is None:
                    break  # end of the valid region on this isobar
                h, s, rho = vals
                rows.append([rnd(t_c, 2), rnd(h / 1e3, 3), rnd(s / 1e3, 5), rnd(rho, 4)])
            if len(rows) >= 5:
                isobars.append({"pBar": rnd(p_bar, 4), "tSatC": rnd(t_sat_c, 3),
                                "tMinC": rnd(t_sat_c + 0.5, 3), "tStepC": SH_DT_C,
                                "cols": SH_COLS, "rows": rows})
        p_bar = round(p_bar + SH_DP_BAR, 4)
    return isobars

# ── Génération ────────────────────────────────────────────────────────────────

def generate_fluid(app_id, cp_name, display_name, kind, t_min_c, gwp, ashrae):
    if kind == "pure":
        sat = build_sat_pure(cp_name, t_min_c)
        sh = build_sh_pure(cp_name)
        molar_mass = CP.PropsSI('M', cp_name) * 1000
        t_crit_c = CP.PropsSI('Tcrit', cp_name) - 273.15
        p_crit_bar = CP.PropsSI('Pcrit', cp_name) / 1e5
    else:
        state = CoolProp.AbstractState('HEOS', cp_name)
        env = Envelope(state)
        sat = build_sat_blend(state, env)
        sh = build_sh_blend(state, env)
        molar_mass = env.molar_mass * 1000
        t_crit_c = env.t_crit - 273.15
        p_crit_bar = env.p_crit / 1e5

    data = {
        "id": app_id,
        "name": display_name,
        "coolpropName": cp_name,
        "molarMass": rnd(molar_mass, 2),
        "criticalTempC": rnd(t_crit_c, 2),
        "criticalPressureBar": rnd(p_crit_bar, 3),
        "gwp100": gwp,
        "ashraeClass": ashrae,
        "sat": sat,
        "sh": sh,
    }
    if kind == "blend":
        data["isZeotropic"] = True
    return data


def index_entry(data):
    entry = {k: data[k] for k in ("id", "name", "coolpropName", "molarMass", "criticalTempC",
                                  "criticalPressureBar", "gwp100", "ashraeClass")}
    if data.get("isZeotropic"):
        entry["isZeotropic"] = True
    entry["satPoints"] = len(data["sat"]["rows"])
    entry["shIsobars"] = len(data["sh"])
    return entry

# ── Comparaison avec les tables existantes (--check) ─────────────────────────

def compare(new, old):
    """Écarts max sur la plage commune + étendue des deux tables."""
    ns, os_ = new["sat"], old["sat"]
    report = {}
    if ns.get("isZeotropic") and os_.get("isZeotropic"):
        old_rows = {round(r[0], 4): r for r in os_["rows"]}
        pairs = [(r, old_rows[round(r[0], 4)]) for r in ns["rows"] if round(r[0], 4) in old_rows]
        cols = {"Tbub": 1, "Tdew": 2, "hL": 3, "hV": 4}
        report["range"] = f"old ≤ {os_['rows'][-1][0]} bar ({os_['rows'][-1][1]:.1f} °C) · new ≤ {ns['rows'][-1][0]} bar ({ns['rows'][-1][1]:.1f} °C)"
    elif not ns.get("isZeotropic") and not os_.get("isZeotropic"):
        def key(tab, i):
            return round(tab["tMinC"] + i * tab["tStepC"], 1)
        old_rows = {key(os_, i): r for i, r in enumerate(os_["rows"])}
        pairs = [(r, old_rows[key(ns, i)]) for i, r in enumerate(ns["rows"]) if key(ns, i) in old_rows]
        cols = {"P": 0, "hL": 1, "hV": 2}
        report["range"] = f"old {os_['tMinC']}…{key(os_, len(os_['rows']) - 1)} °C · new {ns['tMinC']}…{key(ns, len(ns['rows']) - 1)} °C"
    else:
        return {"range": "format différent (pur ↔ zéotropique)"}
    for name, c in cols.items():
        diffs = [abs(a[c] - b[c]) for a, b in pairs]
        report[name] = max(diffs) if diffs else float('nan')
    return report

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Génère les tables de fluides de CryoHelper (CoolProp).")
    ap.add_argument("--out", default=DEFAULT_OUT_DIR, help="dossier de sortie (défaut : src/data/tables)")
    ap.add_argument("--only", help="liste d'identifiants séparés par des virgules, ex. R454B,R32")
    ap.add_argument("--check", action="store_true",
                    help="compare avec les tables de --out sans rien écrire")
    args = ap.parse_args()

    fluids = FLUIDS
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        unknown = wanted - {f[0] for f in FLUIDS}
        if unknown:
            ap.error(f"fluide(s) inconnu(s) : {', '.join(sorted(unknown))}")
        fluids = [f for f in FLUIDS if f[0] in wanted]

    os.makedirs(args.out, exist_ok=True)
    print(f"\n🧊  CryoHelper — tables thermodynamiques (CoolProp {CoolProp.__version__})")
    print(f"    {'Comparaison avec' if args.check else 'Sortie'} : {os.path.abspath(args.out)}\n")

    generated = {}
    for fluid in fluids:
        app_id, cp_name = fluid[0], fluid[1]
        print(f"▶  {app_id:8} ({cp_name})", end=" ", flush=True)
        try:
            data = generate_fluid(*fluid)
        except Exception as e:  # keep going with the other fluids
            print(f"✗ {e}")
            continue
        print(f"✓ {len(data['sat']['rows'])} pts sat · {len(data['sh'])} isobares · "
              f"Tc {data['criticalTempC']} °C / Pc {data['criticalPressureBar']} bar")
        generated[app_id] = data

        path = os.path.join(args.out, f"{app_id}.bin")
        if args.check:
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    rep = compare(data, json.load(f))
                details = " · ".join(f"Δ{k} max {v:.3f}" for k, v in rep.items() if k != "range")
                print(f"     {rep['range']}\n     {details}")
        else:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

    if args.check:
        return

    # index.bin : keep entries of fluids that were not regenerated, in FLUIDS order
    index_path = os.path.join(args.out, "index.bin")
    existing = {}
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            existing = {e["id"]: e for e in json.load(f)}
    index = []
    for fluid in FLUIDS:
        fid = fluid[0]
        if fid in generated:
            index.append(index_entry(generated[fid]))
        elif fid in existing:
            index.append(existing[fid])
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"\n✅  {len(generated)}/{len(fluids)} fluides générés — index : {index_path}")
    print("    Pense à vérifier constants/fluidCatalog.ts (points critiques) et à lancer `npm test`.\n")


if __name__ == "__main__":
    main()
