export const APP_VERSION = '1.0.0';
export const APP_DATE = 'Avril 2026';
export const APP_DEVELOPER = 'François Carlier';
export const APP_CONTACT = 'fc.carlier@gmail.com';
export const APP_LOCATION = 'Liège, Belgique';
export const APP_COPYRIGHT = `© 2026 ${APP_DEVELOPER} — Tous droits réservés`;

export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  sections: LegalSection[];
}

export const ABOUT: LegalDocument = {
  id: 'about',
  title: 'À propos',
  sections: [
    {
      title: 'CryoHelper',
      content: `Version ${APP_VERSION} — ${APP_DATE}\n\nApplication d'assistance terrain pour frigoristes. Calculs offline, sans collecte de données.`,
    },
    {
      title: 'Développeur',
      content: `${APP_DEVELOPER}\n${APP_LOCATION}\n${APP_CONTACT}\n\n${APP_COPYRIGHT}`,
    },
    {
      title: 'Modules V1',
      content:
        '• Bilan thermique simplifié (mode rapide & détaillé)\n• Diagramme P-h enthalpique (R134a, R410A, R32, R290)\n• Calculs rapides (conversions + utilitaires)',
    },
    {
      title: 'Données fluides',
      content:
        "Les propriétés thermodynamiques sont des approximations basées sur les tables ASHRAE / NIST, adaptées à un usage terrain. Pour des calculs de précision scientifique, utiliser CoolProp ou des tables certifiées.",
    },
  ],
};

export const DISCLAIMER: LegalDocument = {
  id: 'disclaimer',
  title: 'Avertissement',
  sections: [
    {
      title: 'Usage professionnel',
      content:
        "CryoHelper est un outil d'aide à la décision sur chantier. Les résultats fournis sont des estimations calculées à partir de modèles simplifiés. Ils ne remplacent pas une étude thermique complète ni le jugement d'un professionnel qualifié.",
    },
    {
      title: 'Responsabilité',
      content:
        "L'auteur décline toute responsabilité pour des décisions techniques prises uniquement sur la base des calculs de cette application. Tout dimensionnement définitif doit être validé par un bureau d'études ou un technicien certifié.",
    },
    {
      title: 'Données fluides',
      content:
        'Les propriétés thermodynamiques des fluides frigorigènes sont des approximations. Les valeurs exactes peuvent varier selon les sources et les conditions de mesure.',
    },
    {
      title: 'Réglementation',
      content:
        "L'utilisation des fluides frigorigènes est soumise à réglementation (attestation de capacité, F-Gas, etc.). Cette application ne traite pas des aspects réglementaires.",
    },
  ],
};

export const CGU: LegalDocument = {
  id: 'cgu',
  title: 'CGU',
  sections: [
    {
      title: 'Art. 1 — Objet',
      content:
        "CryoHelper est une application mobile à usage professionnel, destinée à assister les techniciens frigoristes dans leurs calculs de terrain. Elle est fournie à titre gratuit, sans garantie d'exactitude.",
    },
    {
      title: 'Art. 2 — Utilisation',
      content:
        "L'application est réservée à un usage professionnel par des personnes ayant les qualifications requises pour l'installation et la maintenance de systèmes frigorifiques.",
    },
    {
      title: 'Art. 3 — Propriété intellectuelle',
      content: `Le code, le design et les données de l'application sont la propriété exclusive de ${APP_DEVELOPER}.\n\n${APP_COPYRIGHT}\n\nToute reproduction, redistribution ou utilisation commerciale est interdite sans autorisation écrite préalable.`,
    },
    {
      title: 'Art. 4 — Limitation de responsabilité',
      content:
        "L'auteur ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation de l'application, y compris les erreurs de calcul ou les décisions techniques basées sur ses résultats.",
    },
    {
      title: 'Art. 5 — Modifications',
      content:
        "L'auteur se réserve le droit de modifier l'application et les présentes conditions à tout moment, sans préavis.",
    },
  ],
};

export const PRIVACY: LegalDocument = {
  id: 'privacy',
  title: 'Confidentialité',
  sections: [
    {
      title: 'Aucune collecte de données',
      content:
        "CryoHelper ne collecte, ne transmet et ne stocke aucune donnée personnelle sur des serveurs distants. L'application fonctionne entièrement hors ligne.",
    },
    {
      title: 'Stockage local',
      content:
        "Les préférences (thème) sont stockées localement sur votre appareil via AsyncStorage. Ces données ne quittent jamais l'appareil et peuvent être supprimées en désinstallant l'application.",
    },
    {
      title: 'Feedback',
      content: `Si vous utilisez la fonction de feedback, votre message est transmis via le client email de votre appareil à ${APP_CONTACT}. Aucune donnée n'est transmise automatiquement.`,
    },
    {
      title: 'RGPD',
      content:
        "En l'absence de collecte de données personnelles, aucun traitement RGPD n'est applicable. L'application est conforme au principe de minimisation des données.",
    },
  ],
};

export const ALL_DOCUMENTS: LegalDocument[] = [ABOUT, DISCLAIMER, CGU, PRIVACY];
