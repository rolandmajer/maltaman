// Central Slovak-language constants for the inspection domain.
// These are presets/labels used to seed pickers and translate stored enum values in the UI and PDF.

export const WIZARD_STEPS = [
  { key: "zakladne-udaje", label: "Základné údaje" },
  { key: "ucastnici", label: "Účastníci a podmienky" },
  { key: "miestnosti", label: "Miestnosti" },
  { key: "technicky-stav", label: "Technický stav" },
  { key: "zhrnutie", label: "Zhrnutie zistení" },
  { key: "naklady", label: "Odhad nákladov" },
  { key: "odporucania", label: "Odporúčania" },
  { key: "foto", label: "Fotodokumentácia" },
  { key: "vyhlasenie", label: "Vyhlásenie a podpisy" },
  { key: "export", label: "Kontrola a export" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];

export const ROOM_TYPE_PRESETS = [
  "Obývacia izba",
  "Spálňa",
  "Detská izba",
  "Pracovňa",
  "Kuchyňa",
  "Jedáleň",
  "Kúpeľňa",
  "Samostatné WC",
  "Chodba",
  "Predsieň",
  "Komora",
  "Šatník",
  "Technická miestnosť",
  "Práčovňa",
  "Pivnica",
  "Garáž",
  "Balkón",
  "Lodžia",
  "Terasa",
  "Schodisko",
  "Podkrovie",
  "Iná miestnosť",
] as const;

// Checklist prvky assessed in every room. `key` is stable and stored on Finding.checklistKey,
// `label` is the Slovak display text, `appliesTo` narrows which room types show it by default
// (kitchens/bathrooms get extra plumbing/sanitation rows; all rooms get the rest).
export const ROOM_CHECKLIST_ITEMS: { key: string; label: string; wetRoomOnly?: boolean }[] = [
  { key: "podlaha", label: "Podlaha" },
  { key: "steny", label: "Steny" },
  { key: "strop", label: "Strop" },
  { key: "okna", label: "Okná" },
  { key: "dvere", label: "Dvere" },
  { key: "parapety", label: "Parapety" },
  { key: "elektroinstalacia", label: "Elektroinštalácia" },
  { key: "zasuvky", label: "Zásuvky" },
  { key: "vypinace", label: "Vypínače" },
  { key: "osvetlenie", label: "Osvetlenie" },
  { key: "vykurovanie", label: "Vykurovanie" },
  { key: "radiatory", label: "Radiátory" },
  { key: "chladenie", label: "Chladenie" },
  { key: "vetranie", label: "Vetranie" },
  { key: "vlhkost", label: "Vlhkosť" },
  { key: "plesen", label: "Viditeľná pleseň" },
  { key: "tepelne_mosty", label: "Tepelné mosty" },
  { key: "nabytok", label: "Nábytok a vstavané prvky" },
  { key: "voda_odpady", label: "Voda a odpady", wetRoomOnly: true },
  { key: "sanita", label: "Sanita", wetRoomOnly: true },
  { key: "ine", label: "Iné" },
];

export const WET_ROOM_TYPES = new Set(["Kúpeľňa", "Samostatné WC", "Kuchyňa", "Práčovňa"]);

export const FINDING_STATUS_LABELS: Record<string, string> = {
  OK: "OK – bez zistení",
  V: "V – vada, vyžaduje opravu",
  R: "R – riziko, odporúča sa odborné posúdenie",
  N: "N – neposudzované / neprístupné",
};

export const FINDING_STATUS_SHORT: Record<string, string> = {
  OK: "OK",
  V: "V",
  R: "R",
  N: "N",
};

export const FINDING_SEVERITY_LABELS: Record<string, string> = {
  KRITICKA: "Kritické",
  ZAVAZNA: "Závažné",
  STREDNA: "Stredné",
  DROBNA: "Drobné",
  INFORMATIVNA: "Informatívne",
};

export const PRIORITY_LABELS: Record<string, string> = {
  IMMEDIATE: "Okamžite",
  WITHIN_3_MONTHS: "Do 3 mesiacov",
  WITHIN_1_YEAR: "Do 1 roka",
  LONG_TERM: "Dlhodobé",
  OPTIONAL: "Voliteľné",
};

export const COST_UNIT_LABELS: Record<string, string> = {
  KS: "ks",
  M: "m",
  M2: "m²",
  M3: "m³",
  HOD: "hod.",
  DEN: "deň",
  SUBOR: "súbor",
  PAUSAL: "paušál",
};

export const OVERALL_CONDITION_LABELS: Record<string, string> = {
  VYBORNY: "Výborný",
  DOBRY: "Dobrý",
  PRIEMERNY: "Priemerný",
  ZHORSENY: "Zhoršený",
  ZLY: "Zlý",
};

export const OVERALL_VERDICT_LABELS: Record<string, string> = {
  PURCHASE_NO_OBJECTIONS: "Kúpa bez zásadných výhrad",
  PURCHASE_WITH_DISCOUNT: "Kúpa s vyjednaním zľavy z ceny",
  FURTHER_ASSESSMENT_NEEDED: "Pred rozhodnutím odporúčame ďalšie odborné posúdenie",
  PURCHASE_NOT_RECOMMENDED: "Kúpu v aktuálnom stave neodporúčame",
};

export const RECOMMENDATION_CATEGORY_LABELS: Record<string, string> = {
  IMMEDIATE_SAFETY: "Okamžité bezpečnostné opatrenia",
  REQUIRED_REPAIR: "Nevyhnutné opravy",
  SPECIALIST_ASSESSMENT: "Ďalšie odborné posúdenie",
  REVISIONS_TESTS: "Odporúčané revízie a skúšky",
  DOCUMENTS_TO_REQUEST: "Dokumenty na vyžiadanie",
  MAINTENANCE: "Odporúčania k údržbe",
  NEGOTIATION: "Podklady pre vyjednávanie",
  CONCLUSION: "Celkový záver",
};

export const SIGNATURE_ROLE_LABELS: Record<string, string> = {
  TECHNICIAN: "Poradca (technik)",
  TECHNICIAN2: "Druhý technik",
  CLIENT: "Objednávateľ (klient)",
};

export const DEFAULT_TECHNICAL_CATEGORIES: { name: string; elements: string[] }[] = [
  {
    name: "Základy a nosné konštrukcie",
    elements: ["Základy", "Nosné konštrukcie", "Murivo", "Priečky", "Stropy"],
  },
  {
    name: "Strecha a plášť",
    elements: ["Strecha", "Krov", "Krytina", "Hydroizolácia", "Tepelná izolácia", "Fasáda"],
  },
  {
    name: "Otvorové konštrukcie",
    elements: ["Okná a vonkajšie dvere", "Balkóny, lodžie a terasy", "Schodiská"],
  },
  {
    name: "Komín a požiarna bezpečnosť",
    elements: ["Komín", "Požiarna bezpečnosť"],
  },
  {
    name: "Elektroinštalácia",
    elements: ["Elektroinštalácia", "Rozvádzač", "Bleskozvod"],
  },
  {
    name: "Zdravotechnika a plyn",
    elements: ["Vodovod", "Kanalizácia", "Plyn"],
  },
  {
    name: "Vykurovanie a vzduchotechnika",
    elements: ["Vykurovanie", "Ohrev vody", "Vetranie a rekuperácia", "Klimatizácia"],
  },
  {
    name: "Exteriér a pozemok",
    elements: ["Exteriér a odvodnenie", "Ploty a oporné múry", "Garáž a vedľajšie stavby"],
  },
  {
    name: "Ostatné",
    elements: ["Ostatné technické prvky"],
  },
];

export const DEFAULT_COST_CATEGORIES: string[] = [
  "Prípravné a demontážne práce",
  "Statika",
  "Murárske práce",
  "Opravy stien a stropov",
  "Maľovanie",
  "Podlahy",
  "Obklady a dlažby",
  "Okná",
  "Dvere",
  "Strecha",
  "Hydroizolácia",
  "Tepelná izolácia",
  "Fasáda",
  "Elektroinštalácia",
  "Vodoinštalácia",
  "Kanalizácia",
  "Plyn",
  "Vykurovanie",
  "Chladenie",
  "Vetranie",
  "Sanita",
  "Kuchyňa",
  "Stolárske práce",
  "Zámočnícke práce",
  "Balkón, lodžia alebo terasa",
  "Odstránenie vlhkosti a plesní",
  "Odvoz a likvidácia odpadu",
  "Projektová dokumentácia",
  "Statik",
  "Revízie a odborné posudky",
  "Stavebný dozor",
  "Rezerva na nepredvídané práce",
  "Iné",
];

export const PROPERTY_TYPE_OPTIONS = ["Byt", "Rodinný dom", "Novostavba", "Pozemok", "Iné"];

export const INSPECTION_PURPOSE_OPTIONS = [
  "Kúpa",
  "Predaj",
  "Reklamácia",
  "Kolaudácia",
  "Prevzatie od developera",
  "Poistná udalosť",
  "Iné",
];

// ---------------------------------------------------------------------------
// Room elements — structured checklist (replaces the flat Finding-based one).
// ---------------------------------------------------------------------------

export const ELEMENT_STATUS_LABELS: Record<string, string> = {
  OK: "OK – bez zistení",
  V: "V – vada, vyžaduje opravu",
  R: "R – riziko, odporúča sa odborné posúdenie",
  N: "N – neposudzované alebo neprístupné",
  NEVZTAHUJE_SA: "Nevzťahuje sa",
};

export const ELEMENT_STATUS_SHORT: Record<string, string> = {
  OK: "OK",
  V: "V",
  R: "R",
  N: "N",
  NEVZTAHUJE_SA: "N/A",
};

export const ELEMENT_NA_REASON_LABELS: Record<string, string> = {
  NEPRISTUPNE: "Neprístupné",
  ZAKRYTE_NABYTKOM: "Zakryté nábytkom",
  ZAKRYTE_KONSTRUKCIOU: "Zakryté konštrukciou",
  NEBOLO_MOZNE_BEZPECNE_POSUDIT: "Nebolo možné bezpečne posúdiť",
  MIMO_ROZSAHU_OBHLIADKY: "Mimo rozsahu obhliadky",
  FUNKCNOST_NEBOLO_MOZNE_OVERIT: "Funkčnosť nebolo možné overiť",
  INY_DOVOD: "Iný dôvod – doplniť",
};

export const CONDITION_DEADLINE_LABELS: Record<string, string> = {
  OKAMZITE: "Okamžite",
  DO_1_MESIACA: "Do 1 mesiaca",
  DO_3_MESIACOV: "Do 3 mesiacov",
  DO_1_ROKA: "Do 1 roka",
  PRI_NAJBLIZSEJ_REKONSTRUKCII: "Pri najbližšej rekonštrukcii",
  SLEDOVAT: "Sledovať",
  NIE_JE_POTREBNY: "Nie je potrebný",
};

// General condition-entry dropdown vocabularies (shared by every element; element-specific
// "Typ stavu/poškodenia" options come from CONDITION_TYPE_PRESETS instead — see below).
export const CONDITION_LOCATION_PRESETS = [
  "Celá miestnosť",
  "Pri vstupe",
  "Stred miestnosti",
  "Pri okne",
  "Pri dverách",
  "Pri balkónových dverách",
  "Pri obvodovej stene",
  "Pri vnútornej stene",
  "V rohu miestnosti",
  "Pri strope",
  "Pri podlahe",
  "Pod nábytkom",
  "Za nábytkom",
  "Pri vykurovacom telese",
  "Lokálne miesto",
  "Viac miest",
];

// Extent values ending in "m²" or otherwise numeric are rendered differently in the
// auto-generated description (appended, not used as a leading adverb) — see QUALITATIVE_EXTENTS
// in element-description.ts.
export const CONDITION_EXTENT_PRESETS = [
  "Bodové",
  "Lokálne",
  "Viacnásobné",
  "Rozsiahle",
  "Celoplošné",
  "Do 0,1 m²",
  "0,1–0,5 m²",
  "0,5–1 m²",
  "1–5 m²",
  "Viac ako 5 m²",
  "Nezmerané",
];

export const CONDITION_RECOMMENDED_ACTION_PRESETS = [
  "Bez zásahu",
  "Sledovať vývoj",
  "Vyčistiť",
  "Nastaviť",
  "Utesniť",
  "Lokálne opraviť",
  "Vymeniť poškodenú časť",
  "Vymeniť celý prvok",
  "Vykonať údržbu",
  "Vykonať odborný servis",
  "Vykonať revíziu",
  "Zabezpečiť odborné meranie",
  "Statické posúdenie",
  "Posúdenie elektroinštalácie",
  "Posúdenie vodoinštalácie",
  "Posúdenie vykurovania",
  "Posúdenie vlhkosti",
  "Termovízne meranie",
  "Okamžite odstaviť alebo zabezpečiť",
];

// Fallback "Typ stavu/poškodenia" list, used for elements without a curated
// CONDITION_TYPE_PRESETS entry (e.g. "ine" / custom elements).
export const GENERAL_DEFECT_PRESETS = [
  "Bez viditeľného poškodenia",
  "Bežné opotrebenie",
  "Mechanické poškodenie",
  "Neodborné vyhotovenie",
  "Nedokončené práce",
  "Nefunkčné",
  "Čiastočne funkčné",
  "Netesnosť",
  "Trhlina",
  "Deformácia",
  "Korózia",
  "Vlhkosť",
  "Pleseň",
  "Zatekanie",
  "Chýbajúci prvok",
  "Uvoľnený prvok",
  "Znečistenie",
  "Bezpečnostné riziko",
  "Potrebné odborné posúdenie",
];

export type AttributeFieldConfig = {
  key: string;
  label: string;
  options: string[]; // "Iné – doplniť vlastný údaj" is always appended in the UI, not stored here
  multiSelect?: boolean;
  conditionalOn?: { attributeKey: string; showWhenValueIn: string[] };
};

export type RoomElementConfig = {
  allowMultiple?: boolean; // technician can add further instances (Okno 1, Okno 2, ...)
  attributes: AttributeFieldConfig[];
  locationPresets?: string[]; // appended to CONDITION_LOCATION_PRESETS for this element
};

// Per-element informational dropdowns (Typ/Materiál/Konštrukcia/...). Selecting status OK never
// hides these — they're independent of status. Not every element needs an entry here; elements
// without one just show the condition-entry UI with GENERAL_DEFECT_PRESETS as the defect list.
export const ROOM_ELEMENT_ADDITIONAL_CONFIG: Record<string, RoomElementConfig> = {
  podlaha: {
    attributes: [
      {
        key: "typ_podlahy",
        label: "Typ podlahy",
        options: [
          "Laminátová",
          "Vinylová",
          "Drevená masívna",
          "Drevená viacvrstvová",
          "Parkety",
          "Keramická dlažba",
          "Kamenná dlažba",
          "Koberec",
          "Linoleum",
          "PVC",
          "Liata podlaha",
          "Epoxidová",
          "Betónová",
          "Terazzo",
          "Korok",
          "Kombinovaná",
          "Bez finálnej vrstvy",
        ],
      },
      {
        key: "sposob_ulozenia",
        label: "Spôsob uloženia",
        options: ["Plávajúca", "Lepená", "Klincovaná", "Skrutkovaná", "Uložená do lôžka", "Nezistené"],
      },
    ],
  },
  okna: {
    allowMultiple: true,
    attributes: [
      {
        key: "material_ramu",
        label: "Materiál rámu",
        options: ["Plast", "Drevo", "Hliník", "Drevo-hliník", "Oceľ", "Kombinovaný"],
      },
      {
        key: "typ_okna",
        label: "Typ okna",
        options: [
          "Jednokrídlové",
          "Dvojkrídlové",
          "Viackrídlové",
          "Fixné",
          "Strešné",
          "Francúzske",
          "Posuvné",
          "Sklopné",
          "Otočné",
          "Otočno-sklopné",
        ],
      },
      {
        key: "zasklenie",
        label: "Zasklenie",
        options: ["Jednoduché", "Dvojsklo", "Trojsklo", "Bezpečnostné", "Nezistené"],
      },
    ],
  },
  zasuvky: {
    allowMultiple: true,
    attributes: [
      {
        key: "typ_zasuvky",
        label: "Typ zásuvky",
        options: ["230 V", "400 V", "Dátová", "TV", "Telefónna", "USB", "Exteriérová", "Iná"],
      },
      {
        key: "pocet_zasuviek",
        label: "Počet zásuviek",
        options: ["1", "2", "3", "4", "5", "6+"],
      },
    ],
  },
  steny: {
    attributes: [
      {
        key: "konstrukcia",
        label: "Konštrukcia",
        options: [
          "Tehlové murivo",
          "Pórobetón",
          "Betón",
          "Železobetón",
          "Sadrokartón",
          "Drevená konštrukcia",
          "Kamenné murivo",
          "Zmiešané murivo",
          "Nezistené",
        ],
      },
      {
        key: "povrchova_uprava",
        label: "Povrchová úprava",
        options: [
          "Maľovka",
          "Tapeta",
          "Keramický obklad",
          "Drevený obklad",
          "Kamenný obklad",
          "Dekoratívna omietka",
          "Pohľadový betón",
          "Bez finálnej úpravy",
          "Kombinovaná",
        ],
      },
    ],
  },
  strop: {
    attributes: [
      {
        key: "typ_stropu",
        label: "Typ stropu",
        options: [
          "Omietaný strop",
          "Sadrokartónový podhľad",
          "Kazetový podhľad",
          "Napínaný strop",
          "Drevený obklad",
          "Pohľadový betón",
          "Klenba",
          "Nezistené",
        ],
      },
    ],
  },
  dvere: {
    allowMultiple: true,
    attributes: [
      {
        key: "typ_dveri",
        label: "Typ dverí",
        options: [
          "Interiérové otočné",
          "Posuvné",
          "Skladacie",
          "Bezfalcové",
          "Vchodové",
          "Bezpečnostné",
          "Protipožiarne",
          "Balkónové",
          "Presklené",
        ],
      },
      {
        key: "material_dveri",
        label: "Materiál",
        options: ["Drevo", "Drevotrieska alebo MDF", "Plast", "Hliník", "Oceľ", "Sklo", "Kombinovaný"],
      },
    ],
  },
  parapety: {
    attributes: [
      {
        key: "material_parapetu",
        label: "Materiál",
        options: ["PVC", "Drevo", "Laminovaná drevotrieska", "Kameň", "Umelý kameň", "Keramika", "Hliník", "Oceľ"],
      },
    ],
  },
  elektroinstalacia: {
    attributes: [
      {
        key: "typ_rozvodu",
        label: "Typ rozvodu",
        options: ["Meď", "Hliník", "Kombinovaný", "Nezistené"],
      },
      {
        key: "sposob_vedenia",
        label: "Spôsob vedenia",
        options: ["Pod omietkou", "V podlahe", "V podhľade", "Povrchové vedenie", "Kombinované", "Nezistené"],
      },
      {
        key: "revizna_sprava",
        label: "Revízna správa",
        options: ["Predložená", "Nepredložená", "Neaktuálna", "Nevyžadovaná", "Nezistené"],
      },
    ],
  },
  vypinace: {
    attributes: [
      {
        key: "typ_vypinaca",
        label: "Typ vypínača",
        options: ["Jednoduchý", "Sériový", "Schodiskový", "Krížový", "Tlačidlový", "Stmievač", "Pohybový senzor", "Inteligentný"],
      },
    ],
  },
  osvetlenie: {
    attributes: [
      {
        key: "typ_osvetlenia",
        label: "Typ osvetlenia",
        options: ["Stropné", "Nástenné", "Bodové", "LED pás", "Závesné", "Zabudované", "Núdzové", "Prirodzené"],
      },
      {
        key: "svetelny_zdroj",
        label: "Svetelný zdroj",
        options: ["LED", "Žiarovka", "Halogén", "Žiarivka", "Nezistené"],
      },
    ],
  },
  vykurovanie: {
    attributes: [
      {
        key: "system_vykurovania",
        label: "Systém",
        options: [
          "Centrálne",
          "Lokálne",
          "Teplovodné",
          "Elektrické",
          "Plynové",
          "Podlahové",
          "Teplovzdušné",
          "Krb",
          "Kachle",
          "Tepelné čerpadlo",
          "Kombinované",
          "Bez vykurovania",
          "Nezistené",
        ],
      },
      {
        key: "zdroj_tepla",
        label: "Zdroj tepla",
        options: [
          "Plynový kotol",
          "Elektrický kotol",
          "Kotol na tuhé palivo",
          "Tepelné čerpadlo",
          "Centrálna kotolňa",
          "Krb alebo kachle",
          "Elektrické ohrievače",
          "Nezistené",
        ],
      },
    ],
  },
  radiatory: {
    allowMultiple: true,
    attributes: [
      {
        key: "typ_radiatora",
        label: "Typ radiátora",
        options: ["Panelový", "Článkový", "Rúrkový", "Konvektor", "Elektrický", "Kúpeľňový rebrík"],
      },
    ],
  },
  chladenie: {
    attributes: [
      {
        key: "typ_chladenia",
        label: "Typ chladenia",
        options: ["Nástenná klimatizácia", "Multisplit", "Kanálové chladenie", "Fan-coil", "Mobilná klimatizácia", "Tepelné čerpadlo", "Bez chladenia"],
      },
    ],
  },
  vetranie: {
    attributes: [
      {
        key: "typ_vetrania",
        label: "Typ vetrania",
        options: [
          "Prirodzené oknami",
          "Vetracia mriežka",
          "Odsávací ventilátor",
          "Centrálna rekuperácia",
          "Lokálna rekuperácia",
          "Mechanické vetranie",
          "Bez zjavného vetrania",
        ],
      },
    ],
  },
  vlhkost: {
    attributes: [],
  },
  plesen: {
    locationPresets: ["Roh miestnosti", "Obvodová stena", "Okolie okna", "Kúpeľňa alebo mokrá zóna"],
    attributes: [],
  },
  tepelne_mosty: {
    locationPresets: ["Okenné ostenie", "Nadpražie", "Styk steny a stropu", "Balkónová doska"],
    attributes: [],
  },
  nabytok: {
    allowMultiple: true,
    attributes: [
      {
        key: "typ_nabytku",
        label: "Typ",
        options: [
          "Vstavaná skriňa",
          "Kuchynská linka",
          "Voľne stojaca skriňa",
          "Police",
          "Pracovná doska",
          "Pevne zabudovaný nábytok",
          "Interiérové vybavenie",
        ],
      },
      {
        key: "material_nabytku",
        label: "Materiál",
        options: ["Masívne drevo", "Drevotrieska", "MDF", "Kov", "Sklo", "Plast", "Kombinovaný"],
      },
    ],
  },
  voda_odpady: {
    attributes: [
      {
        key: "privod_vody",
        label: "Prívod vody",
        options: ["Studená voda", "Teplá voda", "Studená aj teplá voda", "Bez prívodu", "Nezistené"],
      },
      {
        key: "material_potrubia",
        label: "Materiál viditeľného potrubia",
        options: ["Plast", "Meď", "Oceľ", "Viacvrstvové potrubie", "Kombinované", "Nezistené"],
      },
      {
        key: "material_odpadu",
        label: "Materiál odpadu",
        options: ["Plast", "Liatina", "Nezistené", "Bez odpadu"],
      },
    ],
  },
  sanita: {
    allowMultiple: true,
    attributes: [
      {
        key: "typ_prvku_sanita",
        label: "Typ prvku",
        options: ["Umývadlo", "WC", "Bidet", "Vaňa", "Sprchovací kút", "Sprchový žľab", "Batéria", "Drez", "Pisoár", "Bojler"],
      },
      {
        key: "material_sanita",
        label: "Materiál",
        options: ["Keramika", "Akrylát", "Smalt", "Nerez", "Kameň alebo kompozit", "Plast"],
      },
    ],
  },
  ine: {
    attributes: [],
  },
};

export type ConditionTypePresetConfig = {
  base: string[]; // shown regardless of any attribute selection
  conditionalOn?: { attributeKey: string; valueToOptions: Record<string, string[]> };
};

// Per-element "Typ stavu/poškodenia" option lists for the condition entry's defect multi-select.
// Falls back to GENERAL_DEFECT_PRESETS for elements not listed here.
export const CONDITION_TYPE_PRESETS: Record<string, ConditionTypePresetConfig> = {
  podlaha: {
    base: [
      "Bez viditeľného poškodenia",
      "Bežné opotrebenie",
      "Chýbajúce časti",
      "Nevhodný prechod medzi materiálmi",
    ],
    conditionalOn: {
      attributeKey: "typ_podlahy",
      valueToOptions: {
        "Keramická dlažba": ["Otvorené škáry", "Prasknutá", "Uvoľnená", "Nerovná", "Poškodené škárovanie"],
        "Kamenná dlažba": ["Otvorené škáry", "Prasknutá", "Uvoľnená", "Nerovná", "Poškodené škárovanie"],
        "Drevená masívna": ["Otvorené škáry", "Vŕzga", "Vydutá", "Stopy vlhkosti", "Biologické poškodenie"],
        "Drevená viacvrstvová": ["Otvorené škáry", "Vŕzga", "Vydutá", "Stopy vlhkosti", "Biologické poškodenie"],
        Parkety: ["Otvorené škáry", "Vŕzga", "Vydutá", "Stopy vlhkosti", "Biologické poškodenie"],
        Laminátová: ["Otvorené škáry", "Vŕzga", "Vydutá", "Stopy vlhkosti", "Biologické poškodenie"],
        Koberec: ["Uvoľnená", "Stopy vlhkosti", "Biologické poškodenie", "Znečistenie"],
      },
    },
  },
  okna: {
    base: [
      "Bez viditeľného poškodenia",
      "Funkčné otváranie",
      "Sťažené otváranie",
      "Nefunkčné kovanie",
      "Netesnosť",
      "Poškodené tesnenie",
      "Poškodený rám",
      "Prasknuté sklo",
      "Kondenzácia",
      "Kondenzácia medzi sklami",
      "Chýbajúce tienenie",
    ],
  },
  zasuvky: {
    base: [
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Bez viditeľného poškodenia",
      "Uvoľnená",
      "Poškodený kryt",
      "Chýbajúci kryt",
      "Stopy prehrievania",
      "Nevhodné umiestnenie",
      "Nedostatočný počet",
    ],
  },
  steny: {
    base: [
      "Bez viditeľného poškodenia",
      "Znečistenie",
      "Odreniny",
      "Poškodenie maľovky",
      "Odlupovanie",
      "Vlasová trhlina",
      "Výrazná trhlina",
      "Vydutie omietky",
      "Opadávanie omietky",
      "Nerovnosť",
      "Stopy vlhkosti",
      "Výkvety",
      "Pleseň",
      "Mechanické poškodenie",
    ],
  },
  strop: {
    base: [
      "Bez viditeľného poškodenia",
      "Trhliny",
      "Priehyb",
      "Nerovnosť",
      "Stopy zatečenia",
      "Odlupovanie náteru",
      "Poškodenie podhľadu",
      "Pleseň",
      "Chýbajúce časti",
    ],
  },
  dvere: {
    base: [
      "Bez viditeľného poškodenia",
      "Funkčné",
      "Drhnú",
      "Nedoliehajú",
      "Nefunkčný zámok",
      "Poškodené kovanie",
      "Poškodené krídlo",
      "Poškodená zárubňa",
      "Netesnosť",
      "Chýbajúci kľúč",
      "Chýbajúce dvere",
    ],
  },
  parapety: {
    base: [
      "Bez viditeľného poškodenia",
      "Poškriabaný",
      "Prasknutý",
      "Uvoľnený",
      "Deformovaný",
      "Nesprávny sklon",
      "Nedostatočné utesnenie",
      "Stopy vlhkosti",
      "Chýba",
    ],
  },
  elektroinstalacia: {
    base: [
      "Bez viditeľných nedostatkov",
      "Novšia inštalácia",
      "Pôvodná inštalácia",
      "Nezakrytované vodiče",
      "Voľné vedenie",
      "Mechanické poškodenie",
      "Stopy prehrievania",
      "Neodborné úpravy",
      "Chýbajúce kryty",
      "Vyžaduje revíziu",
    ],
  },
  vypinace: {
    base: [
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Bez viditeľného poškodenia",
      "Uvoľnený",
      "Poškodený",
      "Chýbajúci kryt",
      "Stopy prehrievania",
    ],
  },
  osvetlenie: {
    base: [
      "Funkčné",
      "Čiastočne funkčné",
      "Nefunkčné",
      "Svietidlo chýba",
      "Poškodené svietidlo",
      "Nezakrytované vodiče",
      "Nedostatočné osvetlenie",
    ],
  },
  vykurovanie: {
    base: [
      "Funkčnosť deklarovaná",
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Funkčné",
      "Čiastočne funkčné",
      "Nefunkčné",
      "Nedostatočný výkon",
      "Nerovnomerné vykurovanie",
      "Vyžaduje servis",
    ],
  },
  radiatory: {
    base: [
      "Bez viditeľného poškodenia",
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Korózia",
      "Únik",
      "Zavzdušnený",
      "Poškodený ventil",
      "Chýbajúca termostatická hlavica",
      "Nedostatočne upevnený",
      "Znečistený",
    ],
  },
  chladenie: {
    base: [
      "Funkčnosť overená",
      "Funkčnosť deklarovaná",
      "Funkčnosť neoverená",
      "Funkčné",
      "Nefunkčné",
      "Hlučné",
      "Znečistené",
      "Viditeľný únik kondenzátu",
      "Vyžaduje servis",
    ],
  },
  vetranie: {
    base: [
      "Dostatočné",
      "Obmedzené",
      "Nefunkčné",
      "Znečistená mriežka",
      "Nefunkčný ventilátor",
      "Nedostatočný prietok",
      "Nadmerná hlučnosť",
      "Vyžaduje vyčistenie",
    ],
  },
  vlhkost: {
    base: [
      "Bez viditeľných prejavov",
      "Zvýšená vlhkosť vzduchu",
      "Vlhká stena",
      "Vlhký strop",
      "Vlhká podlaha",
      "Mapy po zatečení",
      "Výkvety",
      "Kondenzácia",
      "Zápach vlhkosti",
      "Meraním potvrdená vlhkosť",
    ],
  },
  plesen: {
    base: ["Nezistená", "Lokálny výskyt", "Viacnásobný výskyt", "Rozsiahly výskyt", "Podozrenie na skrytý výskyt"],
  },
  tepelne_mosty: {
    base: [
      "Bez viditeľných prejavov",
      "Podozrenie",
      "Povrchová kondenzácia",
      "Lokálna pleseň",
      "Nízka povrchová teplota",
      "Potvrdené termovíziou",
    ],
  },
  nabytok: {
    base: [
      "Bez viditeľného poškodenia",
      "Bežné opotrebenie",
      "Poškriabané",
      "Napučané",
      "Uvoľnené",
      "Nestabilné",
      "Poškodené kovanie",
      "Stopy vlhkosti",
      "Pleseň",
      "Chýbajúce časti",
    ],
  },
  voda_odpady: {
    base: [
      "Bez viditeľného úniku",
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Slabý tlak",
      "Pomalý odtok",
      "Upchatý odtok",
      "Viditeľný únik",
      "Korózia",
      "Nevhodné napojenie",
      "Zápach z odpadu",
    ],
  },
  sanita: {
    base: [
      "Bez viditeľného poškodenia",
      "Funkčnosť overená",
      "Funkčnosť neoverená",
      "Prasknuté",
      "Uvoľnené",
      "Netesné",
      "Poškodený silikón",
      "Poškodené škárovanie",
      "Korózia",
      "Vodný kameň",
      "Nefunkčná batéria",
      "Pomalý odtok",
    ],
  },
};

// Lead-clause builders for the auto-generated element description (one condition-agnostic
// sentence fragment per element, e.g. "Laminátová podlaha, plávajúca montáž"). The rest of the
// sentence (per-condition clauses) is assembled generically by src/lib/element-description.ts —
// this is the one genuinely element-specific piece of phrasing per element.
type AttributeValueLookup = (attributeKey: string) => string | undefined;

const SPOSOB_ULOZENIA_PHRASES: Record<string, string> = {
  Plávajúca: "plávajúca montáž",
  Lepená: "lepená montáž",
  Klincovaná: "klincovaná montáž",
  Skrutkovaná: "skrutkovaná montáž",
  "Uložená do lôžka": "uložená do lôžka",
  Nezistené: "spôsob uloženia nezistený",
};

export const DESCRIPTION_TEMPLATES: Record<string, (get: AttributeValueLookup) => string> = {
  podlaha: (get) => {
    const typ = get("typ_podlahy");
    const sposob = get("sposob_ulozenia");
    const parts = [typ ? `${typ} podlaha` : "Podlaha"];
    if (sposob) parts.push(SPOSOB_ULOZENIA_PHRASES[sposob] ?? sposob.toLowerCase());
    return parts.join(", ");
  },
  okna: (get) => {
    const material = get("material_ramu");
    const typ = get("typ_okna");
    const zasklenie = get("zasklenie");
    const parts: string[] = [];
    parts.push([typ, material ? `rám ${material.toLowerCase()}` : null].filter(Boolean).join(" – ") || "Okno");
    if (zasklenie) parts.push(zasklenie.toLowerCase());
    return parts.join(", ");
  },
  zasuvky: (get) => {
    const typ = get("typ_zasuvky");
    const pocet = get("pocet_zasuviek");
    const parts = [typ ? `Zásuvka ${typ}` : "Zásuvka"];
    if (pocet) parts.push(`počet: ${pocet}`);
    return parts.join(", ");
  },
  steny: (get) => {
    const konstrukcia = get("konstrukcia");
    const povrch = get("povrchova_uprava");
    const parts = [konstrukcia ? `Steny — ${konstrukcia.toLowerCase()}` : "Steny"];
    if (povrch) parts.push(povrch.toLowerCase());
    return parts.join(", ");
  },
  strop: (get) => {
    const typ = get("typ_stropu");
    return typ ? `Strop — ${typ.toLowerCase()}` : "Strop";
  },
  dvere: (get) => {
    const typ = get("typ_dveri");
    const material = get("material_dveri");
    const parts = [typ ? `Dvere — ${typ.toLowerCase()}` : "Dvere"];
    if (material) parts.push(material.toLowerCase());
    return parts.join(", ");
  },
  parapety: (get) => {
    const material = get("material_parapetu");
    return material ? `Parapet — ${material.toLowerCase()}` : "Parapet";
  },
  elektroinstalacia: (get) => {
    const typ = get("typ_rozvodu");
    const vedenie = get("sposob_vedenia");
    const parts = [typ ? `Elektroinštalácia — rozvod ${typ.toLowerCase()}` : "Elektroinštalácia"];
    if (vedenie) parts.push(vedenie.toLowerCase());
    return parts.join(", ");
  },
  vypinace: (get) => {
    const typ = get("typ_vypinaca");
    return typ ? `Vypínač — ${typ.toLowerCase()}` : "Vypínač";
  },
  osvetlenie: (get) => {
    const typ = get("typ_osvetlenia");
    const zdroj = get("svetelny_zdroj");
    const parts = [typ ? `Osvetlenie — ${typ.toLowerCase()}` : "Osvetlenie"];
    if (zdroj) parts.push(`zdroj ${zdroj}`);
    return parts.join(", ");
  },
  vykurovanie: (get) => {
    const system = get("system_vykurovania");
    const zdroj = get("zdroj_tepla");
    const parts = [system ? `Vykurovanie — ${system.toLowerCase()}` : "Vykurovanie"];
    if (zdroj) parts.push(zdroj.toLowerCase());
    return parts.join(", ");
  },
  radiatory: (get) => {
    const typ = get("typ_radiatora");
    return typ ? `Radiátor — ${typ.toLowerCase()}` : "Radiátor";
  },
  chladenie: (get) => {
    const typ = get("typ_chladenia");
    return typ ? `Chladenie — ${typ.toLowerCase()}` : "Chladenie";
  },
  vetranie: (get) => {
    const typ = get("typ_vetrania");
    return typ ? `Vetranie — ${typ.toLowerCase()}` : "Vetranie";
  },
  vlhkost: () => "Vlhkosť",
  plesen: () => "Viditeľná pleseň",
  tepelne_mosty: () => "Tepelné mosty",
  nabytok: (get) => {
    const typ = get("typ_nabytku");
    const material = get("material_nabytku");
    const parts = [typ ? `${typ}` : "Nábytok a vstavané prvky"];
    if (material) parts.push(material.toLowerCase());
    return parts.join(", ");
  },
  voda_odpady: (get) => {
    const privod = get("privod_vody");
    return privod ? `Voda a odpady — ${privod.toLowerCase()}` : "Voda a odpady";
  },
  sanita: (get) => {
    const typ = get("typ_prvku_sanita");
    const material = get("material_sanita");
    const parts = [typ ? typ : "Sanita"];
    if (material) parts.push(material.toLowerCase());
    return parts.join(", ");
  },
};

// Room-type → default attribute pre-fill, applied when a room of that type is created (a
// "Štandardná spálňa"/"Kúpeľňa"/"Kuchyňa" template). Purely additive to the base OK-status
// seed — a room type without an entry here just gets the plain unattributed checklist.
export const ROOM_TEMPLATES: Record<string, { elementKey: string; attributes: Record<string, string> }[]> = {};
