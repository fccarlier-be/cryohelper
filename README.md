# CryoHelper

**Application mobile d'assistance terrain pour frigoristes.**

CryoHelper réunit sur smartphone et tablette les outils dont un technicien frigoriste a besoin sur une intervention :
- bilan thermique d'un local ;
- diagramme enthalpique P-h et calcul de cycle pour 23 fluides frigorigènes ;
- conversions et tables de saturation ;
- diagnostic de panne guidé à partir des mesures du manomètre ;
- rapport d'intervention PDF signé, avec comparatif avant / après ;
- assistant IA optionnel (« Boreas »).

Tous les calculs se font **hors ligne**, sur l'appareil. L'application ne collecte aucune donnée.

> Application React Native / Expo (SDK 57), écrite en TypeScript, pour Android et iOS. Interface en français.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Fluides frigorigènes pris en charge](#fluides-frigorigènes-pris-en-charge)
- [Installer et tester l'application](#installer-et-tester-lapplication)
- [Développement](#développement)
- [Architecture du code](#architecture-du-code)
- [Moteur thermodynamique](#moteur-thermodynamique)
- [Assistant Boreas (IA locale)](#assistant-boreas-ia-locale)
- [Données et confidentialité](#données-et-confidentialité)
- [Limites et avertissements](#limites-et-avertissements)
- [Points connus / pistes d'amélioration](#points-connus--pistes-damélioration)
- [Auteur et licence](#auteur-et-licence)

---

## Fonctionnalités

L'application est organisée en 7 onglets.

### 🌡️ Bilan — bilan thermique

Estimation de la puissance frigorifique nécessaire pour un local, avec une plage de puissance recommandée qui inclut une marge de sécurité. Trois modes :

| Mode | Entrées | Modèle |
|---|---|---|
| **Rapide** | Surface, hauteur, ΔT, niveau d'isolation | Déperditions par l'enveloppe (plan carré supposé) + 15 % d'infiltrations, marge de 15 % |
| **Détaillé** | + températures int./ext., type de local (chambre froide, congélateur, clim, salle serveurs, production alimentaire), apports internes | Enveloppe + infiltrations et marge propres au type de local + apports internes en W/m² |
| **COSTIC** | Surfaces vitrées par orientation, parois, plafond/toiture, plancher, occupants, appareils, portes ouvertes ; T ext. de base 28/32/36/40 °C | Méthode simplifiée COSTIC/COFRETH (confort, T int. = 24 °C), marge de 10 % |

Le résultat détaille les apports (enveloppe, infiltrations, apports internes, ou poste par poste en mode COSTIC).

### 📈 Diagramme P-h — cycle frigorifique

- **Paramètres :** fluide, températures d'évaporation et de condensation, surchauffe, sous-refroidissement, rendement isentropique. On peut aussi saisir une température de refoulement mesurée, qui remplace alors le modèle de compression.
- **Diagramme dessiné :** cloche de saturation, isothermes, isochores, isobares BP/HP et les 4 points du cycle. Le plein écran passe l'appareil en paysage.
- **Résultats :** COP, taux de compression, débit massique par kW, effet frigorifique (h₁ − h₄), travail de compression (h₂ − h₁), chaleur rejetée au condenseur (h₂ − h₃), détail des 4 points (P, T, h).
- **Préréglages :** chaque fluide a des valeurs par défaut adaptées à son usage (climatisation, froid commercial, basse température, ménager, NH₃, CO₂ sous-critique…).
- **Mélanges zéotropiques :** ils sont gérés correctement. La surchauffe est comptée depuis la température de rosée et le glissement est pris en compte.

### 🧮 Calculs — conversions et utilitaires

- **Pression :** bar absolu ↔ bar relatif ↔ PSI ↔ kPa ↔ MPa
- **Température :** °C ↔ K ↔ °F
- **Puissance :** W ↔ kW ↔ ch ↔ BTU/h
- **Calculs rapides :**
  - puissance frigorifique à partir d'un débit d'air et d'un ΔT (ρ = 1,2 kg/m³, Cp = 1006 J/kg·K) ;
  - écart de température ;
  - surchauffe et sous-refroidissement, avec indicateur de plage nominale.
- **P ↔ T° :** table de saturation interactive, pour chaque fluide et dans les deux sens (pression → température ou température → pression). Elle donne la pression absolue, relative et en psi, les enthalpies liquide et vapeur et la chaleur latente. Pour les mélanges zéotropiques, elle donne en plus la température de bulle, la température de rosée et le glissement.

### 🩺 Diagnostic — assistant de dépannage

Un assistant en 5 étapes, pensé pour une saisie directe depuis le manomètre (pressions en bar relatif) :

1. Fluide
2. Basse pression (BP)
3. Haute pression (HP)
4. Température en sortie de condenseur
5. Température en sortie d'évaporateur

L'application en déduit les températures de saturation, la surchauffe et le sous-refroidissement. Elle calcule le cycle, trace le diagramme P-h, puis attribue un score à **8 pannes types** et affiche les 3 plus probables avec leurs symptômes et une recommandation d'action :

- manque de frigorigène
- surcharge de frigorigène
- évaporateur encrassé ou givré
- condenseur encrassé
- détendeur sous-alimenté
- détendeur sur-alimenté
- défaillance du compresseur
- présence d'incondensables

Après l'intervention, le bouton **« Mesure après intervention »** lance une seconde série de mesures. Le rapport compare alors l'état avant et après.

### 📄 Rapport — rapport d'intervention PDF

- **Contenu :** société, technicien, client, référence de l'installation, date.
- **Diagnostics :** les diagnostics avant et après sont repris automatiquement.
- **Actions réalisées :** liste à cocher (14 actions types : recherche de fuites, nettoyages, complément de charge, remplacement du filtre, purge, réglage du détendeur…).
- **Observations et préconisations :** texte libre.
- **Signatures :** celles du technicien et du client, tracées au doigt.
- **Génération :** PDF A4 avec diagrammes P-h vectoriels, comparatif avant/après, synthèse pour le client et fiches de panne. Il est partagé via le menu natif (mail, WhatsApp, Drive…) ou imprimé.
- **Historique :** chaque rapport alimente l'historique des interventions.

### 🌬️ Boreas — assistant IA

Un chat avec un modèle de langage **auto-hébergé** via [Ollama](https://ollama.com). Voir [Assistant Boreas](#assistant-boreas-ia-locale).

### ⚙️ Réglages

- **Identification :** nom du technicien et de la société, qui pré-remplissent les rapports.
- **Apparence :** thème sombre, intermédiaire ou clair.
- **Boreas :** configuration du serveur Ollama et du modèle.
- **Historique des interventions :** les 50 dernières, avec comparatif avant/après des métriques clés.
- **Feedback :** bug, suggestion ou erreur de données, envoyé par mail avec la version et la plateforme.
- **Mentions légales.**

---

## Fluides frigorigènes pris en charge

23 fluides, avec des tables thermodynamiques haute résolution calculées avec CoolProp (saturation au pas de 0,1 °C, vapeur surchauffée par isobares).

| Famille | Fluides |
|---|---|
| HFC / HCFC | R134a, R32, R22 |
| Mélanges HFC (quasi-azéotropiques) | R410A, R407C, R404A, R507A |
| HFO | R1234yf, R1234ze(E) |
| Mélanges HFO / HFC (zéotropiques) | R448A, R449A, R452A, R452B, R454A, R454B, R454C, R455A |
| Naturels | R744 (CO₂), R290 (propane), R600 (butane), R600a (isobutane), R717 (NH₃), R718 (eau) |

Chaque fluide est affiché avec son GWP₁₀₀, sa classe de sécurité ASHRAE et son point critique.

---

## Installer et tester l'application

Plusieurs méthodes, selon l'appareil.

### Android : APK via GitHub Actions (recommandé, sans compte)

Le workflow [`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml) compile une APK installable à chaque push sur `main` ou sur une branche `claude/*`. On peut aussi le lancer à la main : onglet **Actions**, puis **Android APK**, puis **Run workflow**.

1. Ouvrir la dernière exécution réussie et télécharger l'artefact **`cryohelper-apk`**, un zip contenant `app-release.apk`.
2. Copier l'APK sur l'appareil et l'ouvrir. Autoriser l'installation depuis cette source si Android le demande.

- **Compatibilité :** Android 7.0 (API 24) ou plus récent, processeurs ARM.
- **Signature :** l'APK est signée avec la clé de debug. Elle convient à l'installation directe, pas au Play Store.

### Android : build EAS

Depuis [expo.dev](https://expo.dev), lancer **Start a build from GitHub** avec :
- **Platform :** Android
- **EAS Build profile :** `preview` (ce champ doit être rempli, sinon c'est `production`, qui produit un `.aab` pour le Play Store)

Le profil `development` ne convient pas : il nécessite `expo-dev-client`, absent du projet.

### iPhone : Expo Go (sans compte Apple Developer)

L'application tourne dans [Expo Go](https://expo.dev/go). Expo Go ne prend en charge que le **SDK le plus récent**, actuellement 57.

- **Sans ligne de commande :** le workflow EAS [`.eas/workflows/publish-update.yml`](.eas/workflows/publish-update.yml) publie une mise à jour (EAS Update, branche `preview`) à chaque push. Sur expo.dev, ouvrir **Updates**, puis la dernière mise à jour, et scanner son QR code avec Expo Go. Il faut être connecté dans Expo Go avec le compte propriétaire du projet.
- **Avec un ordinateur :** `npx expo start`, puis scanner le QR code.

> Un build iOS installable (`.ipa`) nécessite un compte Apple Developer payant et la configuration des certificats de signature. Sans cela, les builds iOS échouent avec *« Credentials are not set up »*.

---

## Développement

### Prérequis

- Node.js 20 ou plus (testé avec Node 22)
- npm
- Python 3 et `pip install CoolProp`, uniquement pour régénérer les tables de fluides

### Commandes

```bash
npm install          # installer les dépendances
npx expo start       # serveur de développement (QR code pour Expo Go)
npm run type-check   # vérification TypeScript (tsc --noEmit)
npm run lint         # ESLint (configuration eslint-config-expo)
npm test             # tests unitaires Jest (src/**/__tests__)
npx expo-doctor      # contrôle de cohérence du projet Expo
npx expo install --fix   # réaligner les dépendances sur le SDK Expo
```

Build natif local (nécessite le SDK Android) :

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Les dossiers `android/` et `ios/` sont **générés** par `expo prebuild` et ne sont pas versionnés.

### Tests et intégration continue

Les tests (`src/__tests__/`) couvrent la logique de calcul, sans interface :
- conversions d'unités ;
- bilans thermiques (modes rapide, détaillé et COSTIC) ;
- interpolation dans les tables de fluides, vérifiée contre des valeurs de référence CoolProp/NIST ;
- calcul du cycle frigorifique ;
- moteur de diagnostic.

Ils lisent les tables `.bin` directement sur le disque.

Le workflow [`.github/workflows/checks.yml`](.github/workflows/checks.yml) lance `type-check`, `lint` et `test` à chaque push et sur chaque pull request.

ESLint signale encore des avertissements (`react-hooks/refs`, `react-hooks/set-state-in-effect`). Ces règles visent le React Compiler, que le projet n'active pas ; elles sont volontairement rétrogradées en avertissements dans `eslint.config.js`.

### Mettre à jour le SDK Expo

Monter d'une version majeure à la fois :

```bash
npm install expo@^58.0.0
npx expo install --fix
npx expo-doctor
npm run type-check
```

Consulter ensuite les notes de version d'Expo pour les changements incompatibles.

### Configuration

| Fichier | Rôle |
|---|---|
| `app.json` | Configuration Expo : nom, identifiants `be.cryohelper.app`, icônes, splash, thème sombre, EAS Update (`runtimeVersion` basé sur le SDK) |
| `eas.json` | Profils de build EAS : `development`, `preview`, `production` |
| `metro.config.js` | Déclare `.bin` comme extension d'asset : les tables de fluides ne sont pas intégrées au bundle JS |
| `babel.config.js` | `babel-preset-expo` |
| `tsconfig.json` | TypeScript strict (hérite de `expo/tsconfig.base`) |

---

## Architecture du code

```
App.tsx                      Racine : error boundary, gestures, safe area, providers, navigation
index.js                     Point d'entrée (registerRootComponent)
src/
├── navigation/
│   └── AppNavigator.tsx     7 onglets (bottom tabs) + pile Réglages (native stack)
├── features/                Un dossier par écran / module métier
│   ├── thermal/             Bilan thermique : Rapide, Détaillé, COSTIC
│   ├── enthalpy/            Diagramme P-h : DiagramCanvas (SVG), plein écran, résultats de cycle
│   ├── calculations/        Conversions, calculs rapides, table P ↔ T
│   ├── diagnostic/          Assistant en 5 étapes, résultats, passe avant/après
│   ├── report/              Formulaire de rapport, signatures, génération PDF
│   ├── copilot/             Chat Boreas
│   ├── history/             Historique des interventions
│   └── settings/            Réglages, feedback, mentions légales
├── services/                Logique métier pure (sans UI)
│   ├── thermalCalculator.ts     Modèles de bilan thermique
│   ├── fluidTableLoader.ts      Chargement à la demande + cache des tables .bin
│   ├── fluidInterpolator.ts     Interpolation saturation / surchauffe / isentropique
│   ├── enthalpyCalculator.ts    Calcul du cycle 4 points + préréglages par fluide
│   ├── diagnosticEngine.ts      Validation + classement des pannes (score ≥ 30, top 3)
│   ├── diagnosticRules.ts       Règles de score par panne
│   ├── reportGenerator.ts       HTML → PDF (expo-print), diagrammes SVG, partage
│   ├── copilotService.ts        Client Ollama en streaming (XHR)
│   ├── copilotContextBuilder.ts Prompt système : tables de référence + mesures en cours
│   ├── fluidAdapter.ts          Table haute résolution → format RefrigerantData (rapport)
│   ├── thermoUtils.ts           Interpolation sur RefrigerantData
│   ├── unitConverter.ts         Conversions d'unités
│   └── *Storage.ts              Persistance AsyncStorage (historique, identité, Boreas)
├── context/
│   ├── ThemeContext.tsx     Thème (sombre / intermédiaire / clair), persisté
│   ├── ReportContext.tsx    Mesures avant/après partagées entre Diagnostic, Rapport, Boreas
│   └── KeypadContext.tsx    Pavé numérique intégré (remplace le clavier système)
├── components/              UI réutilisable : NumericInput, NumericKeypad, RefrigerantPicker,
│                            SegmentedControl, SignaturePad, Card, ResultRow…
├── constants/               Constantes métier (U, marges, facteurs COSTIC, pannes, catalogue fluides)
├── types/                   Types TypeScript du domaine
├── data/
│   ├── tables/              23 tables thermodynamiques (.bin = JSON compact) + index.bin
│   └── legal.ts             Textes légaux, version, contact
├── theme/                   Palette, typographie, espacements
└── utils/feedback.ts        Envoi de feedback par mail
scripts/
└── generate_tables.py       Génération des tables avec CoolProp
```

**Flux principal d'une intervention :**

1. **Diagnostic** calcule le cycle et le diagnostic, puis les enregistre dans `ReportContext` (passe « avant »).
2. On relance éventuellement une passe « après ».
3. **Rapport** génère le PDF à partir de ce contexte et ajoute une entrée à l'historique.
4. **Boreas** lit le même contexte pour répondre sur l'installation en cours.

---

## Moteur thermodynamique

### Tables de fluides

Les fichiers `src/data/tables/<fluide>.bin` sont du **JSON compact** produit avec CoolProp. L'extension `.bin` les fait traiter comme des assets par Metro : ils sont chargés à la demande via `expo-asset` puis mis en cache en mémoire, au lieu d'alourdir le bundle JS. Ils pèsent environ 9 Mo au total.

Deux structures de table de saturation coexistent (types dans `src/types/fluidTable.ts`) :

| Type de fluide | Indexation | Colonnes |
|---|---|---|
| Purs et quasi-azéotropiques | Par température, pas de 0,1 °C | `P, hL, hV, sL, sV, ρL, ρV` |
| Mélanges zéotropiques | Par pression | `P, T_bulle, T_rosée, hL, hV, sL, sV, ρL, ρV` |

La vapeur surchauffée est décrite par une série d'isobares : `T, h, s, ρ`, de T_sat à T_sat + 80 K, au pas de 1 °C.

### Calcul du cycle (`enthalpyCalculator.ts`)

| Point | État | Calcul |
|---|---|---|
| 1 | Aspiration compresseur | Vapeur surchauffée à P_évap, T = T_sat (T_rosée pour un zéotrope) + surchauffe |
| 2 | Refoulement | Compression isentropique (recherche de s₁ sur l'isobare HP), puis h₂ = h₁ + (h₂s − h₁)/η_is. T₂ par dichotomie. Si une T de refoulement mesurée est fournie, elle remplace ce modèle. |
| 3 | Sortie condenseur | Liquide saturé à T_cond − sous-refroidissement |
| 4 | Sortie détendeur | Détente isenthalpique, h₄ = h₃ |

On en déduit : COP = (h₁ − h₄)/(h₂ − h₁), le taux de compression P_HP/P_BP et le débit massique par kW.

### Régénérer les tables

```bash
pip install CoolProp
python scripts/generate_tables.py                  # les 23 fluides → src/data/tables/*.bin + index.bin
python scripts/generate_tables.py --only R454B,R32 # quelques fluides seulement
python scripts/generate_tables.py --check          # compare avec les tables actuelles, sans rien écrire
```

Le script produit directement les fichiers `.bin` lus par l'application :
- **fluides purs et pseudo-purs :** table indexée en température ;
- **mélanges zéotropiques :** table indexée en pression, avec températures de bulle et de rosée. Elle est obtenue par un calcul exact de bulle/rosée, complété par l'enveloppe de phase CoolProp près du point critique.

Tout nouveau fluide doit aussi être déclaré dans `fluidTableLoader.ts`, `fluidCatalog.ts` et le type `RefrigerantId`. Lancer ensuite `npm test`.

---

## Assistant Boreas (IA locale)

Boreas est un chat qui s'appuie sur un serveur **[Ollama](https://ollama.com)** que vous hébergez vous-même : PC, serveur, NAS… Aucune API cloud n'est utilisée.

1. Installer Ollama sur une machine joignable depuis le téléphone, puis télécharger un modèle, par exemple `ollama pull qwen2.5:14b` (le modèle par défaut).
2. Rendre Ollama accessible sur le réseau, par exemple avec `OLLAMA_HOST=0.0.0.0`.
3. Dans **Réglages → Copilot IA**, saisir l'URL du serveur (ex. `http://192.168.1.10:11434`) et le nom du modèle.

Pour limiter les erreurs du modèle, le prompt système contient :
- des **tables P→T et T→P de référence** pour les 23 fluides, calculées depuis les tables embarquées, afin que le modèle lise une valeur au lieu de l'inventer ;
- les **mesures de l'intervention en cours**, avant et après : pressions, températures, COP, pannes détectées ;
- une **table de saturation ciblée** lorsque la question mentionne un fluide et une pression ou une température.

Les réponses sont affichées en streaming avec une température d'échantillonnage de 0.

---

## Données et confidentialité

- Tous les calculs sont faits **localement**. L'application fonctionne sans connexion, sauf Boreas, qui a besoin de joindre votre serveur Ollama.
- Sont stockés sur l'appareil uniquement (AsyncStorage) : le thème, l'identité du technicien et de la société, la configuration de Boreas, et l'historique des 50 dernières interventions.
- Les rapports PDF ne sont transmis que par le partage que vous déclenchez.
- Le feedback passe par votre client mail.

---

## Limites et avertissements

CryoHelper est un **outil d'aide à la décision sur le terrain**. Il ne remplace ni une étude thermique réglementaire, ni le jugement du technicien.

- **Bilans thermiques :** ce sont des approximations d'ingénieur (plan carré supposé, coefficients U globaux, facteurs forfaitaires). La méthode COSTIC ne s'applique qu'au confort, avec une température intérieure de 24 °C.
- **Diagnostic :** il repose sur des règles heuristiques. Le score indique une piste probable, pas une certitude.
- **Cycle calculé :** il ne tient pas compte des pertes de charge. Le point 3 est approché par le liquide saturé à la température sous-refroidie.
- **Tables des mélanges :** elles sont générées avec les modèles de mélange de CoolProp 8 (définitions `*.mix`). Près du point critique, les valeurs sont interpolées sur l'enveloppe de phase.
- **R407C :** il est traité comme un fluide pseudo-pur, donc son glissement (environ 7 K) est ignoré. R410A, R404A et R507A sont dans le même cas, mais leur glissement est négligeable.

---

## Points connus / pistes d'amélioration

- **Heuristiques du diagnostic à calibrer :**
  - une installation de climatisation saine (taux de compression d'environ 3) peut ressortir « détendeur sur-alimenté » à environ 34 % ;
  - un condenseur sain à 40 °C peut ressortir « encrassé » à environ 31 %.

  Dans les deux cas, le score dépasse le seuil de 30 % surtout grâce aux bonus « BP / HP normale », et non à cause d'un vrai symptôme.
- **Couverture de tests :** seule la logique de calcul est testée. Les écrans ne le sont pas.

---

## Auteur et licence

Développé par **François Carlier**, Liège (Belgique). Contact : fc.carlier@gmail.com

© 2026 François Carlier — Tous droits réservés. Aucune licence open source n'est accordée.
