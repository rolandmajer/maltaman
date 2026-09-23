import { z } from "zod";
import type { PropertyPricingType } from "@/lib/quotation-calculations";

export const websiteIntakeSchema = z.object({
  intakeId: z.string().trim().min(8).max(100),
  name: z.string().trim().min(2, "Zadajte meno a priezvisko").max(150),
  email: z.string().trim().email("Zadajte platný e-mail").max(200),
  phone: z.string().trim().min(6, "Zadajte telefónne číslo").max(50),
  service: z.enum(["byt", "dom", "novostavba"]),
  location: z.string().trim().min(2, "Zadajte lokalitu nehnuteľnosti").max(300),
  message: z.string().trim().max(3000).default(""),
  consent: z.literal(true),
  botField: z.string().max(0).optional().default(""),
});

export type WebsiteIntake = z.infer<typeof websiteIntakeSchema>;

const PROPERTY_TYPES: Record<WebsiteIntake["service"], PropertyPricingType> = {
  byt: "APARTMENT",
  dom: "HOUSE",
  novostavba: "SHELL",
};

export function propertyTypeForWebsiteService(service: WebsiteIntake["service"]) {
  return PROPERTY_TYPES[service];
}

export function isAllowedWebsiteOrigin(origin: string | null) {
  if (!origin) return false;
  const configured = process.env.MALTAMAN_WEBSITE_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean);
  const allowed = configured?.length
    ? configured
    : ["https://maltaman.sk", "https://www.maltaman.sk"];
  if (process.env.NODE_ENV !== "production") allowed.push("http://localhost:3000", "http://localhost:8888");
  return allowed.includes(origin);
}
