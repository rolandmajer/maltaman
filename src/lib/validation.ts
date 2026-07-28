import { z } from "zod";

// HTML inputs submit "" for an empty optional number/date field, which z.coerce would otherwise
// try (and fail) to coerce into NaN / Invalid Date — that failure invalidates the *whole* RHF form
// and silently blocks autosave for every field, not just the empty one. This preprocesses "" to
// undefined first. Explicit `null` (sent by inline editors to deliberately clear a field) is left
// untouched so it still reaches Prisma as a real NULL rather than being dropped as "no change".
const emptyStringToUndefined = (val: unknown) => (val === "" ? undefined : val);
const optionalNumber = () => z.preprocess(emptyStringToUndefined, z.coerce.number().optional());
const nullableNumber = () => z.preprocess(emptyStringToUndefined, z.coerce.number().nullable().optional());
const nullableDate = () => z.preprocess(emptyStringToUndefined, z.coerce.date().nullable().optional());

// Shared enums (mirrors prisma/schema.prisma string-backed enums)
export const findingStatusSchema = z.enum(["OK", "V", "R", "N"]);
export const findingSeveritySchema = z.enum(["KRITICKA", "ZAVAZNA", "STREDNA", "DROBNA", "INFORMATIVNA"]);
export const prioritySchema = z.enum(["IMMEDIATE", "WITHIN_3_MONTHS", "WITHIN_1_YEAR", "LONG_TERM", "OPTIONAL"]);
export const costUnitSchema = z.enum(["KS", "M", "M2", "M3", "HOD", "DEN", "SUBOR", "PAUSAL"]);
export const overallConditionSchema = z.enum(["VYBORNY", "DOBRY", "PRIEMERNY", "ZHORSENY", "ZLY"]);
export const overallVerdictSchema = z.enum([
  "PURCHASE_NO_OBJECTIONS",
  "PURCHASE_WITH_DISCOUNT",
  "FURTHER_ASSESSMENT_NEEDED",
  "PURCHASE_NOT_RECOMMENDED",
]);
export const recommendationCategorySchema = z.enum([
  "IMMEDIATE_SAFETY",
  "REQUIRED_REPAIR",
  "SPECIALIST_ASSESSMENT",
  "REVISIONS_TESTS",
  "DOCUMENTS_TO_REQUEST",
  "MAINTENANCE",
  "NEGOTIATION",
  "CONCLUSION",
]);
export const signatureRoleSchema = z.enum(["TECHNICIAN", "TECHNICIAN2", "CLIENT"]);
export const inspectionStatusSchema = z.enum(["DRAFT", "COMPLETED"]);
export const elementStatusSchema = z.enum(["OK", "V", "R", "N", "NEVZTAHUJE_SA"]);
export const elementNAReasonSchema = z.enum([
  "NEPRISTUPNE",
  "ZAKRYTE_NABYTKOM",
  "ZAKRYTE_KONSTRUKCIOU",
  "NEBOLO_MOZNE_BEZPECNE_POSUDIT",
  "MIMO_ROZSAHU_OBHLIADKY",
  "FUNKCNOST_NEBOLO_MOZNE_OVERIT",
  "INY_DOVOD",
]);
export const conditionDeadlineSchema = z.enum([
  "OKAMZITE",
  "DO_1_MESIACA",
  "DO_3_MESIACOV",
  "DO_1_ROKA",
  "PRI_NAJBLIZSEJ_REKONSTRUKCII",
  "SLEDOVAT",
  "NIE_JE_POTREBNY",
]);

// ---------------------------------------------------------------------------
// Inspection root
// ---------------------------------------------------------------------------

export const inspectionCreateSchema = z.object({
  propertyType: z.string().optional(),
  purpose: z.string().optional(),
  inspectionDate: nullableDate(),
});

export const inspectionUpdateSchema = z.object({
  protocolNumber: z.string().min(1).optional(),
  status: inspectionStatusSchema.optional(),
  inspectionDate: nullableDate(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  generalNote: z.string().optional(),
  overallConditionRating: overallConditionSchema.nullable().optional(),
  mainRisks: z.string().optional(),
  immediateActions: z.string().optional(),
  followUpInspections: z.string().optional(),
  overallVerdict: overallVerdictSchema.nullable().optional(),
  recommendedDiscountAmount: nullableNumber(),
  verdictJustification: z.string().optional(),
  contingencyPercent: optionalNumber(),
  costsIncludeVat: z.boolean().optional(),
  costsEnteredInclVat: z.boolean().optional(),
});

export const propertyUpdateSchema = z.object({
  address: z.string().optional(),
  apartmentNumber: z.string().optional(),
  floor: z.string().optional(),
  municipality: z.string().optional(),
  postalCode: z.string().optional(),
  district: z.string().optional(),
  cadastralArea: z.string().optional(),
  parcelNumber: z.string().optional(),
  landRegistryNumber: z.string().optional(),
  constructionYear: nullableNumber(),
  lastRenovationYear: nullableNumber(),
  totalFloorAreaM2: nullableNumber(),
  occupancyStatus: z.string().optional(),
  administratorName: z.string().optional(),
  ownerName: z.string().optional(),
  ownerContact: z.string().optional(),
});

export const conditionsUpdateSchema = z.object({
  weather: z.string().optional(),
  outdoorTemperatureC: nullableNumber(),
  occupancy: z.string().optional(),
  accessibility: z.string().optional(),
  lighting: z.string().optional(),
  equipmentCondition: z.string().optional(),
  limitations: z.string().optional(),
  measuringDevices: z.string().optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

export const participantSchema = z.object({
  fullName: z.string().min(1, "Meno je povinné"),
  organisation: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Neplatný e-mail").or(z.literal("")).optional(),
  presentFrom: z.string().optional(),
  presentTo: z.string().optional(),
  note: z.string().optional(),
  order: z.number().int().optional(),
});
export const participantUpdateSchema = participantSchema.partial();

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export const roomSchema = z.object({
  name: z.string().min(1, "Názov miestnosti je povinný"),
  type: z.string().min(1),
  floorLevel: z.string().optional(),
  lengthM: z.coerce.number().positive().nullable().optional(),
  widthM: z.coerce.number().positive().nullable().optional(),
  heightM: z.coerce.number().positive().nullable().optional(),
  areaOverrideM2: z.coerce.number().positive().nullable().optional(),
  generalCondition: z.string().optional(),
  generalConditionIsManual: z.boolean().optional(),
  accessibility: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().int().optional(),
});
export const roomUpdateSchema = roomSchema.partial();

// ---------------------------------------------------------------------------
// Technical categories/elements
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().optional(),
  isCustom: z.boolean().optional(),
});
export const categoryUpdateSchema = categorySchema.partial();

export const elementSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().optional(),
  isCustom: z.boolean().optional(),
});
export const elementUpdateSchema = elementSchema.partial();

// ---------------------------------------------------------------------------
// Findings & measurements
// ---------------------------------------------------------------------------

export const findingSchema = z.object({
  roomId: z.string().nullable().optional(),
  elementId: z.string().nullable().optional(),
  checklistKey: z.string().nullable().optional(),
  label: z.string().min(1),
  status: findingStatusSchema.default("OK"),
  defectTypes: z.string().optional(),
  description: z.string().optional(),
  severity: findingSeveritySchema.nullable().optional(),
  location: z.string().optional(),
  recommendedAction: z.string().optional(),
  recommendedSpecialist: z.string().optional(),
  urgency: prioritySchema.nullable().optional(),
  isPositiveObservation: z.boolean().optional(),
  includeInSummary: z.boolean().optional(),
  order: z.number().int().optional(),
});
export const findingUpdateSchema = findingSchema.partial();

export const measurementSchema = z.object({
  label: z.string().min(1),
  value: z.coerce.number(),
  unit: z.string().min(1),
  note: z.string().optional(),
  order: z.number().int().optional(),
});
export const measurementUpdateSchema = measurementSchema.partial();

// ---------------------------------------------------------------------------
// Room elements — structured checklist (RoomElement / ElementAttribute / ElementCondition)
// ---------------------------------------------------------------------------

export const roomElementSchema = z.object({
  elementKey: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().optional(),
});

export const roomElementUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  status: elementStatusSchema.optional(),
  naReason: elementNAReasonSchema.nullable().optional(),
  naReasonNote: z.string().optional(),
  description: z.string().optional(),
  descriptionIsManual: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const elementAttributeSchema = z.object({
  attributeKey: z.string().min(1),
  value: z.string(),
});

export const elementConditionSchema = z.object({
  // JSON-encoded string[] — opaque at the API layer, same convention as Photo.annotationsJson
  // (the client stringifies/parses; see src/lib/element-description.ts's json-array helpers).
  defectTypes: z.string().optional(),
  location: z.string().optional(),
  extent: z.string().optional(),
  severity: findingSeveritySchema.nullable().optional(),
  cause: z.string().optional(),
  recommendedAction: z.string().optional(),
  deadline: conditionDeadlineSchema.nullable().optional(),
  note: z.string().optional(),
  includeInSummary: z.boolean().optional(),
  excludeFromReport: z.boolean().optional(),
  order: z.number().int().optional(),
});
export const elementConditionUpdateSchema = elementConditionSchema.partial();

export const customPresetValueSchema = z.object({
  category: z.string().min(1),
  value: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Photos (metadata only — binary upload handled via multipart/form-data)
// ---------------------------------------------------------------------------

export const photoUpdateSchema = z.object({
  roomId: z.string().nullable().optional(),
  findingId: z.string().nullable().optional(),
  elementId: z.string().nullable().optional(),
  roomElementId: z.string().nullable().optional(),
  elementConditionId: z.string().nullable().optional(),
  caption: z.string().optional(),
  rotationDegrees: z.number().int().optional(),
  annotationsJson: z.string().optional(),
  isCover: z.boolean().optional(),
  excludeFromReport: z.boolean().optional(),
  order: z.number().int().optional(),
  gpsLat: z.number().nullable().optional(),
  gpsLng: z.number().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Cost estimate
// ---------------------------------------------------------------------------

export const costCategorySchema = z.object({
  name: z.string().min(1),
  order: z.number().int().optional(),
  isCustom: z.boolean().optional(),
});
export const costCategoryUpdateSchema = costCategorySchema.partial();

export const costItemSchema = z.object({
  categoryId: z.string().min(1),
  roomId: z.string().nullable().optional(),
  findingId: z.string().nullable().optional(),
  elementId: z.string().nullable().optional(),
  roomElementId: z.string().nullable().optional(),
  elementConditionId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.coerce.number().nonnegative().default(1),
  unit: costUnitSchema.default("KS"),
  unitPrice: z.coerce.number().nonnegative().default(0),
  laborCost: z.coerce.number().nonnegative().default(0),
  materialCost: z.coerce.number().nonnegative().default(0),
  otherCost: z.coerce.number().nonnegative().default(0),
  vatRatePercent: z.coerce.number().min(0).max(100).default(23),
  minEstimate: z.coerce.number().nonnegative().nullable().optional(),
  expectedEstimate: z.coerce.number().nonnegative().nullable().optional(),
  maxEstimate: z.coerce.number().nonnegative().nullable().optional(),
  priority: prioritySchema.default("OPTIONAL"),
  completionHorizon: z.string().optional(),
  supplier: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  included: z.boolean().optional(),
  order: z.number().int().optional(),
});
export const costItemUpdateSchema = costItemSchema.partial();

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export const recommendationSchema = z.object({
  category: recommendationCategorySchema,
  // No min-length: a recommendation card is created as an empty placeholder first, then the
  // technician fills in the text inline — same pattern as signatureSchema.fullName below.
  text: z.string().optional().default(""),
  relatedRoomId: z.string().nullable().optional(),
  relatedFindingId: z.string().nullable().optional(),
  order: z.number().int().optional(),
});
export const recommendationUpdateSchema = recommendationSchema.partial();

// ---------------------------------------------------------------------------
// Signatures
// ---------------------------------------------------------------------------

export const signatureSchema = z.object({
  role: signatureRoleSchema,
  // No min-length: a signature card is created as an empty placeholder first, then the
  // technician fills in the name inline — unlike participants, which get a non-empty default.
  fullName: z.string().optional().default(""),
  organisationName: z.string().optional(),
  registrationNumber: z.string().optional(),
  place: z.string().optional(),
  signedAt: z.coerce.date().nullable().optional(),
  imageDataUrl: z.string().nullable().optional(),
});
export const signatureUpdateSchema = signatureSchema.partial();

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const appSettingsUpdateSchema = z.object({
  companyName: z.string().optional(),
  companyTagline: z.string().optional(),
  companyAddress: z.string().optional(),
  companyIco: z.string().optional(),
  companyDic: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  companyWeb: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  protocolNumberPrefix: z.string().optional(),
  defaultVatRatePercent: optionalNumber(),
  defaultContingencyPercent: optionalNumber(),
  gpsCaptureEnabled: z.boolean().optional(),
  dataRetentionMonths: nullableNumber(),
  legalVisualNonDestructive: z.string().optional(),
  legalNotAReplacement: z.string().optional(),
  legalHiddenDefects: z.string().optional(),
  legalLimitedByAccess: z.string().optional(),
  legalCostsIndicative: z.string().optional(),
  legalClientOnly: z.string().optional(),
  costCategoryPresets: z.array(z.string()).optional(),
  roomTypePresets: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// User management (admin only)
// ---------------------------------------------------------------------------

export const userRoleSchema = z.enum(["ADMIN", "TECHNICIAN"]);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Zadajte meno"),
  email: z.string().trim().email("Zadajte platný e-mail"),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov"),
  role: userRoleSchema.default("TECHNICIAN"),
  registrationNumber: z.string().trim().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Zadajte súčasné heslo"),
  newPassword: z.string().min(8, "Nové heslo musí mať aspoň 8 znakov"),
});
