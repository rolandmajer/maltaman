"use client";

import { useInspectionContext } from "@/lib/inspection-context";
import { useAutosaveForm } from "@/lib/use-autosave-form";
import { apiPatch } from "@/lib/offline/api-client";
import { inspectionUpdateSchema, propertyUpdateSchema } from "@/lib/validation";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { TextField, TextAreaField, SelectField } from "@/components/wizard/form-fields";
import { PROPERTY_TYPE_OPTIONS, INSPECTION_PURPOSE_OPTIONS } from "@/lib/constants";
import type { z } from "zod";
import type { FullInspection } from "@/types/inspection";

type InspectionFormValues = z.infer<typeof inspectionUpdateSchema>;
type PropertyFormValues = z.infer<typeof propertyUpdateSchema>;

function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function StepZakladneUdaje() {
  const { inspection, applyAndSave } = useInspectionContext();

  const inspectionForm = useAutosaveForm<InspectionFormValues>({
    schema: inspectionUpdateSchema,
    defaultValues: {
      protocolNumber: inspection.protocolNumber,
      inspectionDate: toDateInputValue(inspection.inspectionDate) as unknown as Date,
      startTime: inspection.startTime ?? "",
      endTime: inspection.endTime ?? "",
      propertyType: inspection.propertyType ?? "",
      purpose: inspection.purpose ?? "",
      generalNote: inspection.generalNote ?? "",
    },
    onSave: async (values) => {
      await applyAndSave(
        (prev) => ({ ...prev, ...values }) as FullInspection,
        () => apiPatch(`/api/inspections/${inspection.id}`, values, "Základné údaje")
      );
    },
  });

  const propertyForm = useAutosaveForm<PropertyFormValues>({
    schema: propertyUpdateSchema,
    defaultValues: {
      address: inspection.property?.address ?? "",
      apartmentNumber: inspection.property?.apartmentNumber ?? "",
      floor: inspection.property?.floor ?? "",
      municipality: inspection.property?.municipality ?? "",
      postalCode: inspection.property?.postalCode ?? "",
      district: inspection.property?.district ?? "",
      cadastralArea: inspection.property?.cadastralArea ?? "",
      parcelNumber: inspection.property?.parcelNumber ?? "",
      landRegistryNumber: inspection.property?.landRegistryNumber ?? "",
      constructionYear: inspection.property?.constructionYear ?? undefined,
      lastRenovationYear: inspection.property?.lastRenovationYear ?? undefined,
      totalFloorAreaM2: inspection.property?.totalFloorAreaM2 ?? undefined,
      occupancyStatus: inspection.property?.occupancyStatus ?? "",
      administratorName: inspection.property?.administratorName ?? "",
      ownerName: inspection.property?.ownerName ?? "",
      ownerContact: inspection.property?.ownerContact ?? "",
    },
    onSave: async (values) => {
      await applyAndSave(
        (prev) => ({ ...prev, property: { ...prev.property!, ...values } }) as FullInspection,
        () => apiPatch(`/api/inspections/${inspection.id}/property`, values, "Údaje o nehnuteľnosti")
      );
    },
  });

  return (
    <div>
      <StepPageHeader
        title="Základné údaje"
        description="Identifikácia protokolu a nehnuteľnosti. Zmeny sa ukladajú automaticky."
      />

      <StepSection title="Protokol">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={inspectionForm} name="protocolNumber" label="Číslo protokolu" />
          <TextField form={inspectionForm} name="inspectionDate" label="Dátum obhliadky" type="date" />
          <TextField form={inspectionForm} name="startTime" label="Čas začiatku" type="time" />
          <TextField form={inspectionForm} name="endTime" label="Čas ukončenia" type="time" />
          <SelectField
            form={inspectionForm}
            name="propertyType"
            label="Typ nehnuteľnosti"
            options={PROPERTY_TYPE_OPTIONS.map((v) => ({ value: v, label: v }))}
            allowEmpty
          />
          <SelectField
            form={inspectionForm}
            name="purpose"
            label="Účel obhliadky"
            options={INSPECTION_PURPOSE_OPTIONS.map((v) => ({ value: v, label: v }))}
            allowEmpty
          />
        </div>
        <TextAreaField form={inspectionForm} name="generalNote" label="Všeobecná poznámka" />
      </StepSection>

      <StepSection title="Adresa a identifikácia nehnuteľnosti">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={propertyForm} name="address" label="Adresa" />
          <TextField form={propertyForm} name="apartmentNumber" label="Číslo bytu" />
          <TextField form={propertyForm} name="floor" label="Poschodie" />
          <TextField form={propertyForm} name="municipality" label="Obec" />
          <TextField form={propertyForm} name="postalCode" label="PSČ" />
          <TextField form={propertyForm} name="district" label="Okres" />
          <TextField form={propertyForm} name="cadastralArea" label="Katastrálne územie" />
          <TextField form={propertyForm} name="parcelNumber" label="Parcelné číslo" />
          <TextField form={propertyForm} name="landRegistryNumber" label="List vlastníctva" />
          <TextField form={propertyForm} name="constructionYear" label="Rok výstavby" type="number" />
          <TextField form={propertyForm} name="lastRenovationYear" label="Rok poslednej rekonštrukcie" type="number" />
          <TextField form={propertyForm} name="totalFloorAreaM2" label="Celková podlahová plocha (m²)" type="number" step="0.1" />
          <TextField form={propertyForm} name="occupancyStatus" label="Stav obývanosti" />
          <TextField form={propertyForm} name="administratorName" label="Správca / spoločenstvo" />
        </div>
      </StepSection>

      <StepSection title="Objednávateľ / vlastník">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={propertyForm} name="ownerName" label="Meno vlastníka / objednávateľa" />
          <TextField form={propertyForm} name="ownerContact" label="Kontaktné údaje" />
        </div>
      </StepSection>
    </div>
  );
}
