import "dotenv/config";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { db } from "../src/lib/db";
import { createInspection } from "../src/lib/inspection-service";
import { DEFAULT_COST_CATEGORIES } from "../src/lib/constants";
import { savePhotoFile } from "../src/lib/storage";

async function placeholderPhoto(label: string, color: string) {
  const svg = `<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="48" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  return savePhotoFile(buffer);
}

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? "MALTAMAN";
  const userName = process.env.SEED_USER_NAME ?? "Ján Technik";
  const userEmail = process.env.SEED_USER_EMAIL ?? "technik@maltaman.sk";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "maltaman123";

  console.log("Seeding organisation, settings and user...");
  const organisation = await db.organisation.upsert({
    where: { id: "seed-org" },
    update: { name: orgName },
    create: { id: "seed-org", name: orgName },
  });

  await db.appSettings.upsert({
    where: { organisationId: organisation.id },
    update: {},
    create: {
      organisationId: organisation.id,
      companyName: "MALTAMAN",
      companyTagline: "Nezávislé stavebné poradenstvo",
      companyAddress: "Priemyselná 5, 811 09 Bratislava",
      companyIco: "12345678",
      companyDic: "2023456789",
      companyPhone: "+421 900 123 456",
      companyEmail: "info@maltaman.sk",
      companyWeb: "www.maltaman.sk",
      costCategoryPresets: JSON.stringify(DEFAULT_COST_CATEGORIES),
      roomTypePresets: JSON.stringify([]),
    },
  });

  const passwordHash = await bcrypt.hash(userPassword, 10);
  const user = await db.user.upsert({
    where: { email: userEmail },
    update: { passwordHash, name: userName, organisationId: organisation.id },
    create: {
      email: userEmail,
      name: userName,
      passwordHash,
      organisationId: organisation.id,
      role: "ADMIN",
      registrationNumber: "SKP-2019-0451",
    },
  });

  console.log(`Seed login: ${userEmail} / ${userPassword}`);

  // Avoid piling up duplicate demo inspections on repeated `npm run db:seed` runs.
  const existingDemo = await db.inspection.findFirst({ where: { organisationId: organisation.id } });
  if (existingDemo) {
    console.log("Demo inspection already exists, skipping creation.");
    await db.$disconnect();
    return;
  }

  console.log("Creating demo inspection...");
  const inspection = await createInspection({
    organisationId: organisation.id,
    createdById: user.id,
    propertyType: "Byt",
    purpose: "Kúpa",
    inspectionDate: new Date("2026-07-18"),
  });

  await db.inspection.update({
    where: { id: inspection.id },
    data: {
      startTime: "09:00",
      endTime: "11:30",
      generalNote:
        "Byt 4-izbový v tehlovej bytovke, obhliadka pred kúpou nehnuteľnosti. Pôvodné rozvody čiastočne vymenené pri rekonštrukcii.",
      overallConditionRating: "PRIEMERNY",
      mainRisks: "Vlhkosť v kúpeľni a viditeľné trhliny v obývacej izbe pri okne.",
      immediateActions: "Preveriť príčinu vlhkosti v kúpeľni pred podpisom zmluvy.",
      followUpInspections: "Odporúčame posúdenie stavu stúpačiek revíznym technikom.",
      overallVerdict: "PURCHASE_WITH_DISCOUNT",
      recommendedDiscountAmount: 3500,
      verdictJustification:
        "Nehnuteľnosť je vo funkčnom stave, no vyžaduje opravy v kúpeľni a pri oknách. Odporúčame zohľadniť náklady na opravy pri vyjednávaní ceny.",
      contingencyPercent: 10,
      status: "COMPLETED",
      completedAt: new Date("2026-07-18T12:00:00"),
    },
  });

  await db.property.update({
    where: { inspectionId: inspection.id },
    data: {
      address: "Ružová dolina 12",
      apartmentNumber: "24",
      floor: "3. poschodie z 8",
      municipality: "Bratislava - Ružinov",
      postalCode: "821 09",
      district: "Bratislava II",
      cadastralArea: "Ružinov",
      parcelNumber: "1234/56",
      landRegistryNumber: "LV č. 4521",
      constructionYear: 1978,
      lastRenovationYear: 2015,
      totalFloorAreaM2: 82.5,
      occupancyStatus: "Obývaná",
      administratorName: "Správcovská spoločnosť Ružinov s.r.o.",
      ownerName: "Ing. Peter Novák",
      ownerContact: "+421 905 111 222, peter.novak@example.sk",
    },
  });

  await db.inspectionConditions.update({
    where: { inspectionId: inspection.id },
    data: {
      weather: "Jasno, slnečno",
      outdoorTemperatureC: 24,
      occupancy: "Obývaná, prítomný vlastník",
      accessibility: "Všetky miestnosti prístupné",
      lighting: "Dostatočné denné svetlo vo všetkých miestnostiach",
      equipmentCondition: "Zariadenie funkčné, primerane opotrebované",
      limitations: "Strecha a spoločné priestory bytového domu neboli súčasťou obhliadky",
      measuringDevices: "Vlhkomer Trotec T3000, laserový diaľkomer, termokamera Flir E4",
      notes: "Obhliadka prebehla bez obmedzení zo strany vlastníka.",
    },
  });

  await db.participant.createMany({
    data: [
      {
        inspectionId: inspection.id,
        fullName: "Ing. Peter Novák",
        organisation: "",
        role: "Predávajúci / vlastník",
        phone: "+421 905 111 222",
        email: "peter.novak@example.sk",
        presentFrom: "09:00",
        presentTo: "11:30",
        order: 0,
      },
      {
        inspectionId: inspection.id,
        fullName: "Mgr. Zuzana Kráľová",
        organisation: "",
        role: "Kupujúca (objednávateľka)",
        phone: "+421 907 333 444",
        email: "zuzana.kralova@example.sk",
        presentFrom: "09:00",
        presentTo: "11:30",
        order: 1,
      },
      {
        inspectionId: inspection.id,
        fullName: userName,
        organisation: "MALTAMAN",
        role: "Poradca (vykonal obhliadku)",
        phone: "+421 900 123 456",
        email: userEmail,
        presentFrom: "09:00",
        presentTo: "11:30",
        order: 2,
      },
    ],
  });

  console.log("Creating rooms with checklist findings...");

  const roomsData: {
    name: string;
    type: string;
    lengthM: number;
    widthM: number;
    heightM: number;
    findings: { checklistKey: string; label: string; status: "OK" | "V" | "R" | "N"; description?: string; severity?: string }[];
  }[] = [
    {
      name: "Obývacia izba",
      type: "Obývacia izba",
      lengthM: 5.2,
      widthM: 4.1,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        {
          checklistKey: "steny",
          label: "Steny",
          status: "V",
          description: "Viditeľná trhlina cca 40 cm dĺžky pri okne, pravdepodobne od sadania stavby.",
          severity: "STREDNA",
        },
        { checklistKey: "strop", label: "Strop", status: "OK" },
        { checklistKey: "okna", label: "Okná", status: "OK", description: "Plastové okná, rok výmeny 2015, tesnenia funkčné." },
        { checklistKey: "dvere", label: "Dvere", status: "OK" },
        { checklistKey: "elektroinstalacia", label: "Elektroinštalácia", status: "OK" },
        { checklistKey: "osvetlenie", label: "Osvetlenie", status: "OK" },
        { checklistKey: "vykurovanie", label: "Vykurovanie", status: "OK" },
        { checklistKey: "vlhkost", label: "Vlhkosť", status: "OK" },
      ],
    },
    {
      name: "Spálňa 1",
      type: "Spálňa",
      lengthM: 3.6,
      widthM: 3.2,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        { checklistKey: "steny", label: "Steny", status: "OK" },
        { checklistKey: "okna", label: "Okná", status: "OK" },
        {
          checklistKey: "vlhkost",
          label: "Vlhkosť",
          status: "N",
          description: "Roh za skriňou neprístupný pre nábytok.",
        },
      ],
    },
    {
      name: "Spálňa 2",
      type: "Spálňa",
      lengthM: 3.4,
      widthM: 3.0,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        { checklistKey: "steny", label: "Steny", status: "OK" },
        { checklistKey: "okna", label: "Okná", status: "OK" },
        { checklistKey: "elektroinstalacia", label: "Elektroinštalácia", status: "OK" },
      ],
    },
    {
      name: "Spálňa 3 / Detská izba",
      type: "Detská izba",
      lengthM: 3.0,
      widthM: 2.8,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        {
          checklistKey: "steny",
          label: "Steny",
          status: "V",
          description: "Odlupujúca sa maľovka pri parapete, pravdepodobne od príležitostného kondenzu.",
          severity: "DROBNA",
        },
        { checklistKey: "okna", label: "Okná", status: "OK" },
      ],
    },
    {
      name: "Kuchyňa",
      type: "Kuchyňa",
      lengthM: 3.8,
      widthM: 2.9,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        { checklistKey: "steny", label: "Steny", status: "OK" },
        {
          checklistKey: "voda_odpady",
          label: "Voda a odpady",
          status: "V",
          description: "Mierne skorodované pripojenie pod drezom, badateľné stopy po staršom presakovaní.",
          severity: "STREDNA",
        },
        { checklistKey: "elektroinstalacia", label: "Elektroinštalácia", status: "OK" },
        { checklistKey: "vetranie", label: "Vetranie", status: "OK", description: "Digestor funkčný, odvetranie do fasády." },
      ],
    },
    {
      name: "Kúpeľňa",
      type: "Kúpeľňa",
      lengthM: 2.4,
      widthM: 1.8,
      heightM: 2.6,
      findings: [
        {
          checklistKey: "vlhkost",
          label: "Vlhkosť",
          status: "R",
          description: "Zvýšená vlhkosť nameraná pri rohu vane (18 %), odporúčame odborné posúdenie hydroizolácie.",
          severity: "ZAVAZNA",
        },
        {
          checklistKey: "plesen",
          label: "Viditeľná pleseň",
          status: "V",
          description: "Drobné ložiská plesne v škárach obkladu pri vani.",
          severity: "STREDNA",
        },
        { checklistKey: "sanita", label: "Sanita", status: "OK" },
        { checklistKey: "voda_odpady", label: "Voda a odpady", status: "OK" },
        { checklistKey: "vetranie", label: "Vetranie", status: "OK" },
      ],
    },
    {
      name: "Samostatné WC",
      type: "Samostatné WC",
      lengthM: 1.2,
      widthM: 0.9,
      heightM: 2.6,
      findings: [
        { checklistKey: "sanita", label: "Sanita", status: "OK" },
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
      ],
    },
    {
      name: "Chodba",
      type: "Chodba",
      lengthM: 4.5,
      widthM: 1.4,
      heightM: 2.6,
      findings: [
        { checklistKey: "podlaha", label: "Podlaha", status: "OK" },
        { checklistKey: "elektroinstalacia", label: "Elektroinštalácia", status: "OK" },
      ],
    },
    {
      name: "Balkón",
      type: "Balkón",
      lengthM: 3.0,
      widthM: 1.2,
      heightM: 0,
      findings: [
        {
          checklistKey: "ine",
          label: "Zábradlie a kotvenie",
          status: "V",
          description: "Skorodované kotvenie zábradlia, odporúčame kontrolu statikom pred ďalším používaním.",
          severity: "ZAVAZNA",
        },
        { checklistKey: "ine", label: "Dlažba a izolácia", status: "OK" },
      ],
    },
  ];

  const roomIdByName = new Map<string, string>();
  const findingIdByKey = new Map<string, string>();

  for (let i = 0; i < roomsData.length; i++) {
    const r = roomsData[i];
    const room = await db.room.create({
      data: {
        inspectionId: inspection.id,
        name: r.name,
        type: r.type,
        floorLevel: "3. poschodie",
        lengthM: r.lengthM,
        widthM: r.widthM || null,
        heightM: r.heightM || null,
        generalCondition: "Primerané opotrebovaniu veku stavby",
        accessibility: "Plne prístupné",
        order: i,
      },
    });
    roomIdByName.set(r.name, room.id);

    for (let j = 0; j < r.findings.length; j++) {
      const f = r.findings[j];
      const finding = await db.finding.create({
        data: {
          inspectionId: inspection.id,
          roomId: room.id,
          checklistKey: f.checklistKey,
          label: f.label,
          status: f.status,
          description: f.description ?? "",
          severity: (f.severity as never) ?? null,
          order: j,
          urgency: f.status === "R" ? "WITHIN_3_MONTHS" : f.status === "V" ? "WITHIN_1_YEAR" : null,
        },
      });
      findingIdByKey.set(`${r.name}:${f.checklistKey}`, finding.id);
    }
  }

  console.log("Adding placeholder photos...");
  const photoDefs: { room: string; label: string; color: string; caption: string }[] = [
    { room: "Obývacia izba", label: "Obývacia izba", color: "#2f6f4f", caption: "Celkový pohľad na obývaciu izbu" },
    { room: "Obývacia izba", label: "Trhlina pri okne", color: "#8a4b2f", caption: "Detail trhliny pri okne" },
    { room: "Kúpeľňa", label: "Kúpeľňa - roh vane", color: "#2f5f8a", caption: "Zvýšená vlhkosť pri vani" },
    { room: "Kuchyňa", label: "Kuchyňa - drez", color: "#8a7a2f", caption: "Pripojenie vody pod drezom" },
    { room: "Balkón", label: "Balkón - zábradlie", color: "#5f2f8a", caption: "Skorodované kotvenie zábradlia" },
    { room: "Spálňa 3 / Detská izba", label: "Spálňa 3", color: "#2f8a7a", caption: "Odlupujúca sa maľovka pri parapete" },
  ];

  for (let i = 0; i < photoDefs.length; i++) {
    const def = photoDefs[i];
    const { storageKey, thumbnailKey } = await placeholderPhoto(def.label, def.color);
    const roomId = roomIdByName.get(def.room);
    await db.photo.create({
      data: {
        inspectionId: inspection.id,
        roomId,
        caption: def.caption,
        storageKey,
        thumbnailKey,
        order: i,
        isCover: i === 0,
        capturedAt: new Date("2026-07-18T10:00:00"),
      },
    });
  }

  console.log("Adding cost estimate items...");
  const costCategories = await db.costCategory.findMany({ where: { inspectionId: inspection.id } });
  const catId = (name: string) => costCategories.find((c) => c.name === name)?.id ?? costCategories[0].id;

  const costItems: {
    category: string;
    room?: string;
    name: string;
    description: string;
    quantity: number;
    unit: "KS" | "M" | "M2" | "M3" | "HOD" | "DEN" | "SUBOR" | "PAUSAL";
    unitPrice: number;
    priority: "IMMEDIATE" | "WITHIN_3_MONTHS" | "WITHIN_1_YEAR" | "LONG_TERM" | "OPTIONAL";
  }[] = [
    {
      category: "Odstránenie vlhkosti a plesní",
      room: "Kúpeľňa",
      name: "Odborné posúdenie hydroizolácie kúpeľne",
      description: "Diagnostika príčiny vlhkosti pri vani, odborný posudok",
      quantity: 1,
      unit: "SUBOR",
      unitPrice: 250,
      priority: "IMMEDIATE",
    },
    {
      category: "Odstránenie vlhkosti a plesní",
      room: "Kúpeľňa",
      name: "Sanácia plesne v škárach obkladu",
      description: "Odstránenie plesne, prespárovanie, protiplesňový náter",
      quantity: 3,
      unit: "M2",
      unitPrice: 45,
      priority: "WITHIN_3_MONTHS",
    },
    {
      category: "Vodoinštalácia",
      room: "Kuchyňa",
      name: "Výmena pripojenia drezu",
      description: "Výmena skorodovaného pripojenia vody pod drezom",
      quantity: 1,
      unit: "KS",
      unitPrice: 90,
      priority: "WITHIN_3_MONTHS",
    },
    {
      category: "Opravy stien a stropov",
      room: "Obývacia izba",
      name: "Oprava trhliny v stene",
      description: "Vysprávkovanie trhliny, výstužná páska, stierka",
      quantity: 1,
      unit: "KS",
      unitPrice: 180,
      priority: "WITHIN_1_YEAR",
    },
    {
      category: "Maľovanie",
      room: "Obývacia izba",
      name: "Maľovanie po oprave trhliny",
      description: "Lokálne premaľovanie steny",
      quantity: 12,
      unit: "M2",
      unitPrice: 6,
      priority: "WITHIN_1_YEAR",
    },
    {
      category: "Maľovanie",
      room: "Spálňa 3 / Detská izba",
      name: "Oprava a maľovanie pri parapete",
      description: "Odstránenie odlupujúcej sa maľovky, penetrácia, maľba",
      quantity: 4,
      unit: "M2",
      unitPrice: 8,
      priority: "OPTIONAL",
    },
    {
      category: "Zámočnícke práce",
      room: "Balkón",
      name: "Kontrola a oprava kotvenia zábradlia",
      description: "Statická kontrola, prípadná výmena kotviacich prvkov",
      quantity: 1,
      unit: "SUBOR",
      unitPrice: 320,
      priority: "IMMEDIATE",
    },
    {
      category: "Revízie a odborné posudky",
      name: "Revízia elektroinštalácie",
      description: "Odborná prehliadka a revízna správa elektroinštalácie bytu",
      quantity: 1,
      unit: "SUBOR",
      unitPrice: 150,
      priority: "WITHIN_1_YEAR",
    },
    {
      category: "Revízie a odborné posudky",
      name: "Kontrola stúpačiek bytového domu",
      description: "Posúdenie stavu spoločných rozvodov vody a kanalizácie",
      quantity: 1,
      unit: "SUBOR",
      unitPrice: 200,
      priority: "OPTIONAL",
    },
    {
      category: "Podlahy",
      name: "Vyrovnanie a ošetrenie podláh",
      description: "Preventívne ošetrenie drevených podláh v celom byte",
      quantity: 65,
      unit: "M2",
      unitPrice: 4,
      priority: "OPTIONAL",
    },
    {
      category: "Tesnenia okien",
      room: "Obývacia izba",
      name: "Kontrola tesnení okien",
      description: "Servisná kontrola a nastavenie kovania okien",
      quantity: 4,
      unit: "KS",
      unitPrice: 25,
      priority: "OPTIONAL",
    },
    {
      category: "Elektroinštalácia",
      name: "Výmena poistkovej skrine",
      description: "Preventívna výmena zastaraného ističového rozvádzača",
      quantity: 1,
      unit: "KS",
      unitPrice: 380,
      priority: "LONG_TERM",
    },
    {
      category: "Sanita",
      room: "Kúpeľňa",
      name: "Výmena silikónových škár",
      description: "Kompletná výmena silikónu okolo vane a umývadla",
      quantity: 1,
      unit: "SUBOR",
      unitPrice: 60,
      priority: "WITHIN_3_MONTHS",
    },
    {
      category: "Odvoz a likvidácia odpadu",
      name: "Odvoz stavebného odpadu",
      description: "Odvoz a likvidácia odpadu po drobných opravách",
      quantity: 1,
      unit: "PAUSAL",
      unitPrice: 80,
      priority: "OPTIONAL",
    },
    {
      category: "Stavebný dozor",
      name: "Stavebný dozor pri realizácii opráv",
      description: "Odborný dohľad nad realizáciou odporúčaných prác",
      quantity: 8,
      unit: "HOD",
      unitPrice: 35,
      priority: "OPTIONAL",
    },
    {
      category: "Rezerva na nepredvídané práce",
      name: "Rezerva na nepredvídané práce",
      description: "Odporúčaná rezerva na skryté vady zistené počas realizácie",
      quantity: 1,
      unit: "PAUSAL",
      unitPrice: 400,
      priority: "OPTIONAL",
    },
  ];

  for (let i = 0; i < costItems.length; i++) {
    const c = costItems[i];
    await db.costItem.create({
      data: {
        inspectionId: inspection.id,
        categoryId: catId(c.category),
        roomId: c.room ? roomIdByName.get(c.room) : undefined,
        name: c.name,
        description: c.description,
        quantity: c.quantity,
        unit: c.unit,
        unitPrice: c.unitPrice,
        vatRatePercent: 23,
        priority: c.priority,
        source: "Odhad poradcu",
        order: i,
      },
    });
  }

  console.log("Adding recommendations...");
  await db.recommendation.createMany({
    data: [
      {
        inspectionId: inspection.id,
        category: "IMMEDIATE_SAFETY",
        text: "Pred ďalším používaním balkóna odporúčame statickú kontrolu kotvenia zábradlia.",
        order: 0,
      },
      {
        inspectionId: inspection.id,
        category: "SPECIALIST_ASSESSMENT",
        text: "Odporúčame odborné posúdenie hydroizolácie v kúpeľni špecializovanou firmou.",
        order: 1,
      },
      {
        inspectionId: inspection.id,
        category: "REVISIONS_TESTS",
        text: "Zabezpečiť revíznu správu elektroinštalácie, ak nie je k dispozícii aktuálna.",
        order: 2,
      },
      {
        inspectionId: inspection.id,
        category: "DOCUMENTS_TO_REQUEST",
        text: "Vyžiadať si od predávajúceho poslednú revíznu správu elektroinštalácie a doklad o rekonštrukcii z roku 2015.",
        order: 3,
      },
      {
        inspectionId: inspection.id,
        category: "MAINTENANCE",
        text: "Štvrťročne kontrolovať silikónové škáry a vetranie v kúpeľni na prevenciu vzniku plesne.",
        order: 4,
      },
      {
        inspectionId: inspection.id,
        category: "NEGOTIATION",
        text: "Zistené vady odporúčame zohľadniť pri vyjednávaní kúpnej ceny (odhad cca 3 500 €).",
        order: 5,
      },
      {
        inspectionId: inspection.id,
        category: "CONCLUSION",
        text: "Nehnuteľnosť je vhodná na kúpu s vyjednaním zľavy zodpovedajúcej rozsahu zistených vád.",
        order: 6,
      },
    ],
  });

  console.log("Adding signatures...");
  await db.signature.createMany({
    data: [
      {
        inspectionId: inspection.id,
        role: "TECHNICIAN",
        fullName: userName,
        organisationName: "MALTAMAN",
        registrationNumber: "SKP-2019-0451",
        place: "Bratislava",
        signedAt: new Date("2026-07-18T12:00:00"),
        imageDataUrl: null,
      },
      {
        inspectionId: inspection.id,
        role: "CLIENT",
        fullName: "Mgr. Zuzana Kráľová",
        place: "Bratislava",
        signedAt: new Date("2026-07-18T12:00:00"),
        imageDataUrl: null,
      },
    ],
  });

  console.log("Creating a second, in-progress draft inspection...");
  const draft = await createInspection({
    organisationId: organisation.id,
    createdById: user.id,
    propertyType: "Rodinný dom",
    purpose: "Kúpa",
    inspectionDate: new Date("2026-07-22"),
  });
  await db.property.update({
    where: { inspectionId: draft.id },
    data: { address: "Záhradná 8", municipality: "Pezinok", postalCode: "902 01" },
  });
  await db.room.create({
    data: { inspectionId: draft.id, name: "Obývacia izba", type: "Obývacia izba", order: 0 },
  });

  console.log("Seed complete.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
