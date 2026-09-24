import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import NumericInput from '../../components/NumericInput';
import RefrigerantPicker from '../../components/RefrigerantPicker';
import ResultRow from '../../components/ResultRow';
import SectionTitle from '../../components/SectionTitle';
import SegmentedControl from '../../components/SegmentedControl';
import NumericKeypad from '../../components/NumericKeypad';
import { useKeypadContext, KEYPAD_HEIGHT } from '../../context/KeypadContext';
import { loadFluidTable } from '../../services/fluidTableLoader';
import { satFromPressure, satFromTemp, satFromTempDew } from '../../services/fluidInterpolator';
import type { FluidTable } from '../../types/fluidTable';
import type { SatPoint } from '../../services/fluidInterpolator';
import * as UC from '../../services/unitConverter';

// ─── Sub-section types ────────────────────────────────────────────────────────

type CalcSection = 'pressure' | 'temperature' | 'power' | 'quick' | 'saturation';

const SECTION_OPTIONS: Array<{ value: CalcSection; label: string }> = [
  { value: 'pressure', label: 'Pression' },
  { value: 'temperature', label: 'Temp.' },
  { value: 'power', label: 'Puiss.' },
  { value: 'quick', label: 'Calculs' },
  { value: 'saturation', label: 'P ↔ T°' },
];

// ─── Generic converter component ─────────────────────────────────────────────

interface ConvertResult {
  label: string;
  value: string;
  unit: string;
}

function ConversionCard({
  title,
  inputLabel,
  inputUnit,
  inputValue,
  onInputChange,
  results,
}: {
  title: string;
  inputLabel: string;
  inputUnit: string;
  inputValue: string;
  onInputChange: (v: string) => void;
  results: ConvertResult[];
}): React.JSX.Element {
  const { colors, spacing } = useAppTheme();

  const separator = useMemo(
    () =>
      StyleSheet.create({
        sep: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
      }),
    [colors, spacing],
  );

  return (
    <Card style={{ marginBottom: 16 }}>
      <SectionTitle title={title} />
      <NumericInput
        label={inputLabel}
        value={inputValue}
        onChangeText={onInputChange}
        unit={inputUnit}
      />
      <View style={separator.sep} />
      {results.map((r) => (
        <ResultRow key={r.label} label={r.label} value={r.value} unit={r.unit} />
      ))}
    </Card>
  );
}

// ─── Pressure section ────────────────────────────────────────────────────────

function PressureSection(): React.JSX.Element {
  const [barValue, setBarValue] = useState('1');

  const n = parseFloat(barValue) || 0;
  const results: ConvertResult[] = [
    { label: 'bar → PSI', value: UC.barToPsi(n).toFixed(3), unit: 'psi' },
    { label: 'bar → kPa', value: UC.barToKpa(n).toFixed(1), unit: 'kPa' },
    { label: 'bar → MPa', value: UC.barToMpa(n).toFixed(4), unit: 'MPa' },
    { label: 'Relatif (man.)', value: UC.absToGauge(n).toFixed(3), unit: 'bar rel.' },
  ];

  const [psiValue, setPsiValue] = useState('14.5');
  const n2 = parseFloat(psiValue) || 0;
  const results2: ConvertResult[] = [
    { label: 'PSI → bar (abs)', value: UC.psiToBar(n2).toFixed(3), unit: 'bar' },
  ];

  return (
    <>
      <ConversionCard
        title="bar absolu → autres"
        inputLabel="Pression"
        inputUnit="bar abs"
        inputValue={barValue}
        onInputChange={setBarValue}
        results={results}
      />
      <ConversionCard
        title="PSI → bar"
        inputLabel="Pression"
        inputUnit="psi"
        inputValue={psiValue}
        onInputChange={setPsiValue}
        results={results2}
      />
    </>
  );
}

// ─── Temperature section ─────────────────────────────────────────────────────

function TemperatureSection(): React.JSX.Element {
  const [celsiusValue, setCelsiusValue] = useState('20');
  const n = parseFloat(celsiusValue) || 0;

  const results: ConvertResult[] = [
    { label: '°C → K', value: UC.celsiusToKelvin(n).toFixed(2), unit: 'K' },
    { label: '°C → °F', value: UC.celsiusToFahrenheit(n).toFixed(1), unit: '°F' },
  ];

  const [kValue, setKValue] = useState('293');
  const n2 = parseFloat(kValue) || 0;
  const results2: ConvertResult[] = [
    { label: 'K → °C', value: UC.kelvinToCelsius(n2).toFixed(2), unit: '°C' },
    { label: 'K → °F', value: UC.kelvinToFahrenheit(n2).toFixed(1), unit: '°F' },
  ];

  return (
    <>
      <ConversionCard
        title="Celsius → autres"
        inputLabel="Température"
        inputUnit="°C"
        inputValue={celsiusValue}
        onInputChange={setCelsiusValue}
        results={results}
      />
      <ConversionCard
        title="Kelvin → autres"
        inputLabel="Température"
        inputUnit="K"
        inputValue={kValue}
        onInputChange={setKValue}
        results={results2}
      />
    </>
  );
}

// ─── Power section ────────────────────────────────────────────────────────────

function PowerSection(): React.JSX.Element {
  const [wValue, setWValue] = useState('1000');
  const n = parseFloat(wValue) || 0;
  const results: ConvertResult[] = [
    { label: 'W → kW', value: UC.wToKw(n).toFixed(3), unit: 'kW' },
    { label: 'W → ch (HP)', value: UC.wToHp(n).toFixed(3), unit: 'hp' },
    { label: 'W → BTU/h', value: UC.wToBtuH(n).toFixed(1), unit: 'BTU/h' },
  ];

  const [kwValue, setKwValue] = useState('3.5');
  const n2 = parseFloat(kwValue) || 0;
  const results2: ConvertResult[] = [
    { label: 'kW → W', value: UC.kwToW(n2).toFixed(0), unit: 'W' },
    { label: 'kW → BTU/h', value: UC.kwToBtuH(n2).toFixed(0), unit: 'BTU/h' },
    { label: 'kW → HP', value: UC.wToHp(n2 * 1000).toFixed(2), unit: 'hp' },
  ];

  return (
    <>
      <ConversionCard
        title="Watts → autres"
        inputLabel="Puissance"
        inputUnit="W"
        inputValue={wValue}
        onInputChange={setWValue}
        results={results}
      />
      <ConversionCard
        title="kW → autres"
        inputLabel="Puissance"
        inputUnit="kW"
        inputValue={kwValue}
        onInputChange={setKwValue}
        results={results2}
      />
    </>
  );
}

// ─── Quick calculations section ───────────────────────────────────────────────

function QuickCalcSection(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  // Air cooling power
  const [flow, setFlow] = useState('1000');
  const [dt1, setDt1] = useState('10');

  // Delta T
  const [t1, setT1] = useState('20');
  const [t2, setT2] = useState('4');

  // Superheat / Subcooling
  const [tGas, setTGas] = useState('10');
  const [tSatEvap, setTSatEvap] = useState('0');
  const [tLiq, setTLiq] = useState('38');
  const [tSatCond, setTSatCond] = useState('45');

  const airPower = UC.airCoolingPower(parseFloat(flow) || 0, parseFloat(dt1) || 0);
  const dT = UC.deltaT(parseFloat(t1) || 0, parseFloat(t2) || 0);
  const sh = UC.computeSuperheat(parseFloat(tGas) || 0, parseFloat(tSatEvap) || 0);
  const sc = UC.computeSubcooling(parseFloat(tSatCond) || 0, parseFloat(tLiq) || 0);

  const badgeStyle = (v: number, min: number, max: number) => {
    if (v < min) return colors.orange;
    if (v > max) return colors.red;
    return colors.green;
  };

  const badgeStyles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: radius.pill,
          alignSelf: 'flex-start',
          marginTop: 4,
        },
        badgeText: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
        },
      }),
    [spacing, radius, typography],
  );

  function ShBadge({ value, min, max }: { value: number; min: number; max: number }) {
    const c = badgeStyle(value, min, max);
    return (
      <View style={[badgeStyles.badge, { backgroundColor: c + '22' }]}>
        <Text style={[badgeStyles.badgeText, { color: c }]}>
          {value.toFixed(1)} K
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Air cooling power */}
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle title="Puissance via débit d'air" />
        <NumericInput
          label="Débit volumique"
          value={flow}
          onChangeText={setFlow}
          unit="m³/h"
        />
        <NumericInput
          label="ΔT air (soufflage − reprise)"
          value={dt1}
          onChangeText={setDt1}
          unit="K"
        />
        <ResultRow
          label="Puissance frigorifique"
          value={airPower >= 1000 ? (airPower / 1000).toFixed(2) : airPower.toFixed(0)}
          unit={airPower >= 1000 ? 'kW' : 'W'}
          highlighted
          valueColor="accent"
        />
      </Card>

      {/* Delta T */}
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle title="Delta T" />
        <NumericInput label="T1" value={t1} onChangeText={setT1} unit="°C" />
        <NumericInput label="T2" value={t2} onChangeText={setT2} unit="°C" />
        <ResultRow label="|T1 − T2|" value={dT.toFixed(1)} unit="K" highlighted />
      </Card>

      {/* Superheat / Subcooling */}
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle title="Surchauffe & sous-refroidissement" />

        <NumericInput
          label="T° gaz aspiration (mesurée)"
          value={tGas}
          onChangeText={setTGas}
          unit="°C"
        />
        <NumericInput
          label="T° saturation évaporation"
          value={tSatEvap}
          onChangeText={setTSatEvap}
          unit="°C"
        />
        <ResultRow label="Surchauffe" value={sh.toFixed(1)} unit="K" />
        <ShBadge value={sh} min={4} max={12} />

        <View style={{ height: spacing.md }} />

        <NumericInput
          label="T° saturation condensation"
          value={tSatCond}
          onChangeText={setTSatCond}
          unit="°C"
        />
        <NumericInput
          label="T° liquide sortie condenseur"
          value={tLiq}
          onChangeText={setTLiq}
          unit="°C"
        />
        <ResultRow label="Sous-refroidissement" value={sc.toFixed(1)} unit="K" />
        <ShBadge value={sc} min={3} max={10} />
      </Card>
    </>
  );
}

// ─── Saturation lookup section ────────────────────────────────────────────────

type SatMode = 'P2T' | 'T2P';

const SAT_MODE_OPTIONS: Array<{ value: SatMode; label: string }> = [
  { value: 'P2T', label: 'Pression → T°' },
  { value: 'T2P', label: 'T° → Pression' },
];

function SaturationSection(): React.JSX.Element {
  const { colors, spacing } = useAppTheme();

  const [fluidId, setFluidId] = useState('R134a');
  const [fluidTable, setFluidTable] = useState<FluidTable | null>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [mode, setSatMode] = useState<SatMode>('P2T');

  const [pressureStr, setPressureStr] = useState('5');
  const [tempStr, setTempStr] = useState('0');

  const [satPoint, setSatPoint] = useState<SatPoint | null>(null);
  const [dewPoint, setDewPoint] = useState<SatPoint | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingTable(true);
    setFluidTable(null);
    setSatPoint(null);
    setDewPoint(null);
    loadFluidTable(fluidId)
      .then((t) => { if (!cancelled) { setFluidTable(t); setLoadingTable(false); } })
      .catch(() => { if (!cancelled) setLoadingTable(false); });
    return () => { cancelled = true; };
  }, [fluidId]);

  useEffect(() => {
    if (!fluidTable) return;
    try {
      if (mode === 'P2T') {
        const p = parseFloat(pressureStr);
        if (isNaN(p) || p <= 0) { setSatPoint(null); setDewPoint(null); return; }
        setSatPoint(satFromPressure(fluidTable, p));
        setDewPoint(null);
        setLookupError(null);
      } else {
        const t = parseFloat(tempStr);
        if (isNaN(t)) { setSatPoint(null); setDewPoint(null); return; }
        const bub = satFromTemp(fluidTable, t);
        const dew = fluidTable.sat.isZeotropic ? satFromTempDew(fluidTable, t) : null;
        setSatPoint(bub);
        setDewPoint(dew);
        setLookupError(null);
      }
    } catch {
      setSatPoint(null);
      setDewPoint(null);
      setLookupError('Valeur hors plage de la table');
    }
  }, [fluidTable, mode, pressureStr, tempStr]);

  const isZeo = !!fluidTable?.sat.isZeotropic;

  const sep = useMemo(
    () => StyleSheet.create({ s: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm } }),
    [colors, spacing],
  );

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle title="Température ↔ Pression de saturation" />
        <RefrigerantPicker value={fluidId} onChange={setFluidId} label="Fluide" />
        <View style={{ height: spacing.md }} />
        <SegmentedControl options={SAT_MODE_OPTIONS} value={mode} onChange={setSatMode} />
        <View style={{ height: spacing.md }} />

        {mode === 'P2T' ? (
          <NumericInput
            label="Pression"
            value={pressureStr}
            onChangeText={setPressureStr}
            unit="bar abs"
          />
        ) : (
          <NumericInput
            label={isZeo ? 'T° bulle (Tbub)' : 'Température de saturation'}
            value={tempStr}
            onChangeText={setTempStr}
            unit="°C"
            signed
          />
        )}

        {loadingTable && (
          <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.accent} />
        )}

        {lookupError && (
          <Text style={{ color: colors.red, fontSize: 12, marginTop: spacing.xs }}>{lookupError}</Text>
        )}

        {satPoint && !lookupError && (
          <>
            <View style={sep.s} />
            {mode === 'P2T' ? (
              <>
                {isZeo ? (
                  <>
                    <ResultRow label="T° bulle (Tbub)" value={satPoint.tempC.toFixed(2)} unit="°C" highlighted valueColor="accent" />
                    <ResultRow label="T° rosée (Tdew)" value={(satPoint.tempDewC ?? satPoint.tempC).toFixed(2)} unit="°C" highlighted valueColor="accent" />
                    <ResultRow label="Glissement (ΔT glide)" value={((satPoint.tempDewC ?? satPoint.tempC) - satPoint.tempC).toFixed(2)} unit="K" />
                  </>
                ) : (
                  <ResultRow label="T° saturation" value={satPoint.tempC.toFixed(2)} unit="°C" highlighted valueColor="accent" />
                )}
                <ResultRow label="Pression relative" value={UC.absToGauge(satPoint.pressureBar).toFixed(3)} unit="bar rel." />
                <ResultRow label="Pression" value={UC.barToPsi(satPoint.pressureBar).toFixed(2)} unit="psi" />
              </>
            ) : (
              <>
                <ResultRow label={isZeo ? 'P (côté bulle)' : 'Pression de saturation'} value={satPoint.pressureBar.toFixed(3)} unit="bar abs" highlighted valueColor="accent" />
                {dewPoint && (
                  <ResultRow label="P (côté rosée)" value={dewPoint.pressureBar.toFixed(3)} unit="bar abs" highlighted valueColor="accent" />
                )}
                <ResultRow label="Pression relative" value={UC.absToGauge(satPoint.pressureBar).toFixed(3)} unit="bar rel." />
                <ResultRow label="Pression" value={UC.barToPsi(satPoint.pressureBar).toFixed(2)} unit="psi" />
              </>
            )}
            <View style={sep.s} />
            <ResultRow label="Enthalpie liquide (hL)" value={satPoint.hLiq_kJkg.toFixed(1)} unit="kJ/kg" />
            <ResultRow label="Enthalpie vapeur (hV)" value={satPoint.hVap_kJkg.toFixed(1)} unit="kJ/kg" />
            <ResultRow label="Chaleur latente" value={(satPoint.hVap_kJkg - satPoint.hLiq_kJkg).toFixed(1)} unit="kJ/kg" />
          </>
        )}
      </Card>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CalculationsScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useAppTheme();
  const { activeField } = useKeypadContext();
  const [section, setSection] = useState<CalcSection>('pressure');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        container: { flex: 1 },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        },
        title: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        subtitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
        },
        tabs: { marginTop: spacing.md },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
      }),
    [colors, spacing, typography],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: activeField ? KEYPAD_HEIGHT : 0 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Calculs rapides</Text>
          <Text style={styles.subtitle}>Conversions & utilitaires terrain</Text>
          <SegmentedControl
            options={SECTION_OPTIONS}
            value={section}
            onChange={setSection}
            style={styles.tabs}
          />
        </View>

        <View style={styles.content}>
          {section === 'pressure' && <PressureSection />}
          {section === 'temperature' && <TemperatureSection />}
          {section === 'power' && <PowerSection />}
          {section === 'quick' && <QuickCalcSection />}
          {section === 'saturation' && <SaturationSection />}
        </View>
      </ScrollView>
      <NumericKeypad />
    </SafeAreaView>
  );
}
