import "dotenv/config";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { db } from "../src/lib/db";
import { createInspection } from "../src/lib/inspection-service";
import { seedRoomElements } from "../src/lib/room-element-service";
import { DEFAULT_COST_CATEGORIES } from "../src/lib/constants";
import { generateElementDescription } from "../src/lib/element-description";
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

  console.log("Creating rooms with structured room-element checklists...");

  type ConditionOverride = {
    defectTypes: string[];
    location?: string;
    extent?: string;
    severity?: "KRITICKA" | "ZAVAZNA" | "STREDNA" | "DROBNA" | "INFORMATIVNA";
    cause?: string;
    recommendedAction?: string;
    deadline?: "OKAMZITE" | "DO_1_MESIACA" | "DO_3_MESIACOV" | "DO_1_ROKA" | "PRI_NAJBLIZSEJ_REKONSTRUKCII" | "SLEDOVAT" | "NIE_JE_POTREBNY";
    note?: string;
  };

  type ElementOverride = {
    elementKey: string;
    status?: "OK" | "V" | "R" | "N" | "NEVZTAHUJE_SA";
    naReason?: "NEPRISTUPNE" | "ZAKRYTE_NABYTKOM" | "ZAKRYTE_KONSTRUKCIOU" | "NEBOLO_MOZNE_BEZPECNE_POSUDIT" | "MIMO_ROZSAHU_OBHLIADKY" | "FUNKCNOST_NEBOLO_MOZNE_OVERIT" | "INY_DOVOD";
    naReasonNote?: string;
    attributes?: Record<string, string>;
    conditions?: ConditionOverride[];
  };

  const roomsData: {
    name: string;
    type: string;
    lengthM: number;
    widthM: number;
    heightM: number;
    elements?: ElementOverride[];
  }[] = [
    {
      name: "Obývacia izba",
      type: "Obývacia izba",
      lengthM: 5.2,
      widthM: 4.1,
      heightM: 2.6,
      elements: [
        {
          // The spec's worked example: two separate, structured condition entries synthesized
          // into one auto-generated description, rather than a single free-text finding.
          elementKey: "podlaha",
          status: "V",
          attributes: { typ_podlahy: "Laminátová", sposob_ulozenia: "Plávajúca" },
          conditions: [
            {
              defectTypes: ["Škáry"],
              location: "Pri vstupe",
              extent: "Lokálne",
              severity: "DROBNA",
              cause: "Mechanické opotrebenie",
              recommendedAction: "Sledovať vývoj",
              deadline: "SLEDOVAT",
              note: "Lokálne poškriabaná pri vstupe.",
            },
            {
              defectTypes: ["Stopy vlhkosti"],
              location: "Pri balkónových dverách",
              extent: "0,1–0,5 m²",
              severity: "STREDNA",
              cause: "Pravdepodobný kondenz alebo drobné zatekanie",
              recommendedAction: "Posúdenie vlhkosti",
              deadline: "DO_1_MESIACA",
              note: "So stopami vlhkosti pri balkónových dverách.",
            },
          ],
        },
        {
          elementKey: "steny",
          status: "V",
          attributes: { konstrukcia: "Tehlové murivo", povrchova_uprava: "Maľovka" },
          conditions: [
            {
              defectTypes: ["Výrazná trhlina"],
              location: "Pri okne",
              extent: "Lokálne",
              severity: "STREDNA",
              cause: "Pravdepodobne sadanie stavby",
              recommendedAction: "Lokálne opraviť",
              deadline: "DO_3_MESIACOV",
              note: "Viditeľná trhlina cca 40 cm dĺžky pri okne, pravdepodobne od sadania stavby.",
            },
          ],
        },
        { elementKey: "strop", status: "OK", attributes: { typ_stropu: "Omietaný strop" } },
        { elementKey: "okna", status: "OK", attributes: { material_ramu: "Plast", zasklenie: "Dvojsklo" } },
        { elementKey: "dvere", status: "OK", attributes: { typ_dveri: "Interiérové otočné", material_dveri: "Drevo" } },
        { elementKey: "elektroinstalacia", status: "OK", attributes: { revizna_sprava: "Predložená" } },
        { elementKey: "osvetlenie", status: "OK" },
        { elementKey: "vykurovanie", status: "OK", attributes: { system_vykurovania: "Centrálne" } },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
        { elementKey: "vlhkost", status: "OK" },
      ],
    },
    {
      name: "Spálňa 1",
      type: "Spálňa",
      lengthM: 3.6,
      widthM: 3.2,
      heightM: 2.6,
      elements: [
        { elementKey: "podlaha", status: "OK", attributes: { typ_podlahy: "Laminátová" } },
        { elementKey: "steny", status: "OK" },
        { elementKey: "okna", status: "OK" },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
        {
          elementKey: "vlhkost",
          status: "N",
          naReason: "ZAKRYTE_NABYTKOM",
          naReasonNote: "Roh za veľkou skriňou neprístupný pre nábytok.",
        },
      ],
    },
    {
      name: "Spálňa 2",
      type: "Spálňa",
      lengthM: 3.4,
      widthM: 3.0,
      heightM: 2.6,
      elements: [
        { elementKey: "podlaha", status: "OK" },
        { elementKey: "steny", status: "OK" },
        { elementKey: "okna", status: "OK" },
        { elementKey: "elektroinstalacia", status: "OK" },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
      ],
    },
    {
      name: "Spálňa 3 / Detská izba",
      type: "Detská izba",
      lengthM: 3.0,
      widthM: 2.8,
      heightM: 2.6,
      elements: [
        { elementKey: "podlaha", status: "OK" },
        {
          elementKey: "steny",
          status: "V",
          conditions: [
            {
              defectTypes: ["Odlupovanie"],
              location: "Pri okne",
              extent: "Bodové",
              severity: "DROBNA",
              cause: "Príležitostný kondenz",
              recommendedAction: "Vyčistiť",
              deadline: "SLEDOVAT",
              note: "Odlupujúca sa maľovka pri parapete, pravdepodobne od príležitostného kondenzu.",
            },
          ],
        },
        { elementKey: "okna", status: "OK" },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
      ],
    },
    {
      name: "Kuchyňa",
      type: "Kuchyňa",
      lengthM: 3.8,
      widthM: 2.9,
      heightM: 2.6,
      elements: [
        { elementKey: "podlaha", status: "OK", attributes: { typ_podlahy: "Keramická dlažba" } },
        { elementKey: "steny", status: "OK" },
        {
          elementKey: "voda_odpady",
          status: "V",
          attributes: { privod_vody: "Studená aj teplá voda", material_potrubia: "Meď" },
          conditions: [
            {
              defectTypes: ["Korózia"],
              location: "Pod nábytkom",
              extent: "Bodové",
              severity: "STREDNA",
              cause: "Staršie presakovanie",
              recommendedAction: "Vymeniť poškodenú časť",
              deadline: "DO_3_MESIACOV",
              note: "Mierne skorodované pripojenie pod drezom, badateľné stopy po staršom presakovaní.",
            },
          ],
        },
        { elementKey: "elektroinstalacia", status: "OK" },
        { elementKey: "vetranie", status: "OK", attributes: { typ_vetrania: "Odsávací ventilátor" } },
      ],
    },
    {
      name: "Kúpeľňa",
      type: "Kúpeľňa",
      lengthM: 2.4,
      widthM: 1.8,
      heightM: 2.6,
      elements: [
        {
          elementKey: "vlhkost",
          status: "R",
          conditions: [
            {
              defectTypes: ["Meraním potvrdená vlhkosť"],
              location: "Pri podlahe",
              extent: "0,5–1 m²",
              severity: "ZAVAZNA",
              cause: "Nezistená príčina, podozrenie na hydroizoláciu",
              recommendedAction: "Zabezpečiť odborné meranie",
              deadline: "DO_1_MESIACA",
              note: "Zvýšená vlhkosť nameraná pri rohu vane, odporúčame odborné posúdenie hydroizolácie.",
            },
          ],
        },
        {
          elementKey: "plesen",
          status: "V",
          conditions: [
            {
              defectTypes: ["Lokálny výskyt"],
              location: "Kúpeľňa alebo mokrá zóna",
              extent: "Do 0,1 m²",
              severity: "STREDNA",
              cause: "Nedostatočné vetranie",
              recommendedAction: "Sanácia plesne v škárach obkladu",
              deadline: "DO_3_MESIACOV",
              note: "Drobné ložiská plesne v škárach obkladu pri vani.",
            },
          ],
        },
        { elementKey: "sanita", status: "OK", attributes: { typ_prvku_sanita: "Vaňa", material_sanita: "Akrylát" } },
        { elementKey: "voda_odpady", status: "OK" },
        { elementKey: "vetranie", status: "OK", attributes: { typ_vetrania: "Odsávací ventilátor" } },
      ],
    },
    {
      name: "Samostatné WC",
      type: "Samostatné WC",
      lengthM: 1.2,
      widthM: 0.9,
      heightM: 2.6,
      elements: [
        { elementKey: "sanita", status: "OK", attributes: { typ_prvku_sanita: "WC" } },
        { elementKey: "podlaha", status: "OK" },
      ],
    },
    {
      name: "Chodba",
      type: "Chodba",
      lengthM: 4.5,
      widthM: 1.4,
      heightM: 2.6,
      elements: [
        { elementKey: "podlaha", status: "OK" },
        { elementKey: "elektroinstalacia", status: "OK" },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
      ],
    },
    {
      name: "Balkón",
      type: "Balkón",
      lengthM: 3.0,
      widthM: 1.2,
      heightM: 0,
      elements: [
        {
          elementKey: "ine",
          status: "V",
          conditions: [
            {
              defectTypes: ["Korózia"],
              location: "Iné – doplniť",
              extent: "Lokálne",
              severity: "ZAVAZNA",
              cause: "Dlhodobé pôsobenie poveternostných vplyvov",
              recommendedAction: "Statické posúdenie",
              deadline: "OKAMZITE",
              note: "Skorodované kotvenie zábradlia, odporúčame kontrolu statikom pred ďalším používaním.",
            },
          ],
        },
        { elementKey: "vykurovanie", status: "NEVZTAHUJE_SA" },
        { elementKey: "chladenie", status: "NEVZTAHUJE_SA" },
        { elementKey: "vlhkost", status: "NEVZTAHUJE_SA" },
      ],
    },
  ];

  const roomIdByName = new Map<string, string>();
  // Keyed "<room name>:<elementKey>" / "<room name>:<elementKey>:<condition index>" — lets
  // photoDefs/costItems below attach to a specific RoomElement/ElementCondition, demonstrating
  // the "grouped under the correct condition" PDF requirement rather than only room-level tagging.
  const elementIdByKey = new Map<string, string>();
  const conditionIdByKey = new Map<string, string>();

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

    // Seeds the full 19-21 element catalog at status OK (wet-room gating handled internally),
    // exactly like the room-creation API route does — then the loop below applies this room's
    // specific overrides on top.
    await seedRoomElements(db, room.id, r.type);
    const seededElements = await db.roomElement.findMany({ where: { roomId: room.id } });

    for (const override of r.elements ?? []) {
      const element = seededElements.find((e) => e.elementKey === override.elementKey);
      if (!element) continue;
      elementIdByKey.set(`${r.name}:${override.elementKey}`, element.id);

      const attributeEntries = Object.entries(override.attributes ?? {});
      if (attributeEntries.length > 0) {
        await db.elementAttribute.createMany({
          data: attributeEntries.map(([attributeKey, value]) => ({ roomElementId: element.id, attributeKey, value })),
        });
      }

      const description = generateElementDescription(
        override.elementKey,
        attributeEntries.map(([attributeKey, value]) => ({ attributeKey, value })),
        (override.conditions ?? []).map((c) => ({ defectTypes: JSON.stringify(c.defectTypes), location: c.location ?? "", extent: c.extent ?? "" }))
      );

      await db.roomElement.update({
        where: { id: element.id },
        data: {
          status: override.status ?? "OK",
          naReason: override.naReason ?? null,
          naReasonNote: override.naReasonNote ?? "",
          description,
          descriptionIsManual: false,
        },
      });

      for (let k = 0; k < (override.conditions ?? []).length; k++) {
        const c = override.conditions![k];
        const condition = await db.elementCondition.create({
          data: {
            roomElementId: element.id,
            defectTypes: JSON.stringify(c.defectTypes),
            location: c.location ?? "",
            extent: c.extent ?? "",
            severity: c.severity ?? null,
            cause: c.cause ?? "",
            recommendedAction: c.recommendedAction ?? "",
            deadline: c.deadline ?? null,
            note: c.note ?? "",
            order: k,
          },
        });
        conditionIdByKey.set(`${r.name}:${override.elementKey}:${k}`, condition.id);
      }
    }
  }

  console.log("Adding placeholder photos...");
  const photoDefs: { room: string; conditionKey?: string; label: string; color: string; caption: string }[] = [
    { room: "Obývacia izba", label: "Obývacia izba", color: "#2f6f4f", caption: "Celkový pohľad na obývaciu izbu" },
    { room: "Obývacia izba", conditionKey: "steny:0", label: "Trhlina pri okne", color: "#8a4b2f", caption: "Detail trhliny pri okne" },
    { room: "Kúpeľňa", conditionKey: "vlhkost:0", label: "Kúpeľňa - roh vane", color: "#2f5f8a", caption: "Zvýšená vlhkosť pri vani" },
    { room: "Kuchyňa", conditionKey: "voda_odpady:0", label: "Kuchyňa - drez", color: "#8a7a2f", caption: "Pripojenie vody pod drezom" },
    { room: "Balkón", conditionKey: "ine:0", label: "Balkón - zábradlie", color: "#5f2f8a", caption: "Skorodované kotvenie zábradlia" },
    { room: "Spálňa 3 / Detská izba", conditionKey: "steny:0", label: "Spálňa 3", color: "#2f8a7a", caption: "Odlupujúca sa maľovka pri parapete" },
  ];

  for (let i = 0; i < photoDefs.length; i++) {
    const def = photoDefs[i];
    const { storageKey, thumbnailKey } = await placeholderPhoto(def.label, def.color);
    const roomId = roomIdByName.get(def.room);
    const elementConditionId = def.conditionKey ? conditionIdByKey.get(`${def.room}:${def.conditionKey}`) : undefined;
    await db.photo.create({
      data: {
        inspectionId: inspection.id,
        roomId,
        elementConditionId,
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
    conditionKey?: string;
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
      conditionKey: "vlhkost:0",
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
      conditionKey: "plesen:0",
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
      conditionKey: "voda_odpady:0",
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
      conditionKey: "steny:0",
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
      conditionKey: "ine:0",
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
    const elementKey = c.conditionKey?.split(":")[0];
    const roomElementId = c.room && elementKey ? elementIdByKey.get(`${c.room}:${elementKey}`) : undefined;
    const elementConditionId = c.room && c.conditionKey ? conditionIdByKey.get(`${c.room}:${c.conditionKey}`) : undefined;
    await db.costItem.create({
      data: {
        inspectionId: inspection.id,
        categoryId: catId(c.category),
        roomId: c.room ? roomIdByName.get(c.room) : undefined,
        roomElementId,
        elementConditionId,
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
  const draftRoom = await db.room.create({
    data: { inspectionId: draft.id, name: "Obývacia izba", type: "Obývacia izba", order: 0 },
  });
  await seedRoomElements(db, draftRoom.id, draftRoom.type);

  console.log("Seed complete.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
