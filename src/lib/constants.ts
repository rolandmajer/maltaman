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
