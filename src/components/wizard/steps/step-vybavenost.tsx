"use client";

import { useState } from "react";
import { Lock, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete, NetworkUnavailableError } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { InlineTextField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AMENITY_CATEGORIES, AMENITY_CATEGORY_LABELS, AMENITY_ATTRIBUTION } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { FullAmenityPlace, FullInspection } from "@/types/inspection";

type GenerateResponse = { places: FullAmenityPlace[]; locationLabel: string; generatedCount: number };

export function StepVybavenost() {
  const { inspection, applyAndSave, create, refetch } = useInspectionContext();
  const [generating, setGenerating] = useState(false);

  const places = inspection.amenityPlaces;
  const address = inspection.property?.address?.trim();

  function toggleEnabled(value: boolean) {
    void applyAndSave(
      (prev) => ({ ...prev, amenitiesEnabled: value }) as FullInspection,
      () => apiPatch(`/api/inspections/${inspection.id}`, { amenitiesEnabled: value }, "Občianska vybavenosť")
    );
  }

  function updatePlace(id: string, patch: Partial<FullAmenityPlace>) {
    void applyAndSave(
      (prev) => ({
        ...prev,
        amenityPlaces: prev.amenityPlaces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }),
      () => apiPatch(`/api/inspections/${inspection.id}/amenity-places/${id}`, patch, "Miesto v okolí")
    );
  }

  function deletePlace(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, amenityPlaces: prev.amenityPlaces.filter((p) => p.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/amenity-places/${id}`, "Odstránenie miesta")
    );
  }

  async function addPlace(category: string) {
    await create(
      () =>
        apiPost<FullAmenityPlace>(
          `/api/inspections/${inspection.id}/amenity-places`,
          { category, name: "", distanceM: 0, isManual: true },
          "Nové miesto v okolí"
        ),
      (prev, created) => ({ ...prev, amenityPlaces: [...prev.amenityPlaces, created] })
    );
  }

  /** `regeocode` forces a fresh address lookup; a plain retry reuses the stored coordinates. */
  async function generate(regeocode: boolean) {
    setGenerating(true);
    try {
      const query = regeocode ? "?regeocode=1" : "";
      const result = await apiPost<GenerateResponse>(
        `/api/inspections/${inspection.id}/amenities/generate${query}`,
        {},
        "Vyhľadanie okolia"
      );
      await refetch();
      toast.success(
        result.generatedCount > 0
          ? `Nájdených ${result.generatedCount} miest v okolí.`
          : "V okolí sa nenašlo nič, čo by sa dalo vypísať. Skúste upraviť adresu alebo doplňte miesta ručne."
      );
    } catch (error) {
      toast.error(
        error instanceof NetworkUnavailableError
          ? "Vyhľadanie okolia vyžaduje pripojenie na internet."
          : error instanceof Error
            ? error.message
            : "Vyhľadanie okolia zlyhalo."
      );
    } finally {
      setGenerating(false);
    }
  }

  // --- locked state: the section is a paid add-on ---------------------------------------------
  if (!inspection.amenitiesEnabled) {
    return (
      <div>
        <StepPageHeader
          title="Občianska vybavenosť"
          description="Prehľad škôl, obchodov, zdravotníctva, dopravy a ďalších služieb v okolí nehnuteľnosti."
        />
        <StepSection title="Platená nadstavba">
          <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Lock className="size-5 shrink-0" />
              <p className="font-medium">Táto sekcia je platená nadstavba k protokolu.</p>
            </div>
            <p className="max-w-prose text-sm text-slate-600">
              Po zapnutí sa z adresy nehnuteľnosti automaticky vyhľadá, čo je v okolí — školy a škôlky,
              obchody, lekári a lekárne, zastávky, parky, športoviská, úrady aj restaurácie — vrátane
              vzdialenosti a odhadu času pešo a autom. Zoznam si potom môžete ľubovoľne upraviť.
            </p>
            <div className="flex items-center gap-2">
              <Switch checked={false} onCheckedChange={toggleEnabled} id="amenities-enabled" />
              <Label htmlFor="amenities-enabled">Zapnúť občiansku vybavenosť</Label>
            </div>
          </div>
        </StepSection>
      </div>
    );
  }

  // --- unlocked -------------------------------------------------------------------------------
  return (
    <div>
      <StepPageHeader
        title="Občianska vybavenosť"
        description="Prehľad škôl, obchodov, zdravotníctva, dopravy a ďalších služieb v okolí nehnuteľnosti."
      />

      <StepSection
        title="Vyhľadanie z adresy"
        actions={
          <div className="flex items-center gap-2">
            <Switch checked onCheckedChange={toggleEnabled} id="amenities-enabled" />
            <Label htmlFor="amenities-enabled" className="whitespace-nowrap text-xs">
              Zapnuté
            </Label>
          </div>
        }
      >
        {!address ? (
          <p className="text-sm text-amber-700">
            Najprv zadajte adresu nehnuteľnosti v kroku Základné údaje — okolie sa vyhľadáva podľa nej.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Adresa nehnuteľnosti: <strong>{address}</strong>
            </p>
            {inspection.amenitiesLocationLabel && (
              <p className="flex items-start gap-1.5 text-xs text-slate-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Na mape nájdené ako: {inspection.amenitiesLocationLabel}
                  {" — "}
                  <span className="text-slate-400">
                    ak to nie je správne miesto, upravte adresu a vyhľadajte znova.
                  </span>
                </span>
              </p>
            )}
            {inspection.amenitiesGeneratedAt && (
              <p className="text-xs text-slate-400">
                Naposledy vyhľadané {formatDateTime(inspection.amenitiesGeneratedAt)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void generate(true)} disabled={generating}>
                <RefreshCw className={generating ? "animate-spin" : undefined} />
                {generating ? "Vyhľadávam…" : places.length > 0 ? "Vyhľadať znova z adresy" : "Vyhľadať okolie"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Vzdialenosti sú vzdušnou líniou; časy sú odhad s prirážkou na skutočnú trasu. {AMENITY_ATTRIBUTION}
            </p>
          </>
        )}
      </StepSection>

      {AMENITY_CATEGORIES.map((category) => {
        const items = places
          .filter((p) => p.category === category.key)
          .sort((a, b) => a.distanceM - b.distanceM);
        return (
          <StepSection
            key={category.key}
            title={`${category.label}${items.length > 0 ? ` (${items.length})` : ""}`}
            actions={
              <Button size="sm" variant="outline" onClick={() => void addPlace(category.key)}>
                <Plus /> Pridať
              </Button>
            }
          >
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">Nič v tejto kategórii.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((place) => (
                  <AmenityRow
                    key={place.id}
                    place={place}
                    onUpdate={(patch) => updatePlace(place.id, patch)}
                    onDelete={() => deletePlace(place.id)}
                  />
                ))}
              </div>
            )}
          </StepSection>
        );
      })}
    </div>
  );
}

function AmenityRow({
  place,
  onUpdate,
  onDelete,
}: {
  place: FullAmenityPlace;
  onUpdate: (patch: Partial<FullAmenityPlace>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={place.includeInReport}
          onCheckedChange={(v) => onUpdate({ includeInReport: Boolean(v) })}
          aria-label="Zahrnúť do reportu"
          className="mt-2"
        />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
          <InlineTextField
            label="Názov"
            value={place.name}
            className="sm:col-span-2"
            onCommit={(v) => onUpdate({ name: v })}
          />
          <InlineTextField
            label="Vzdialenosť (m)"
            type="number"
            value={String(place.distanceM)}
            onCommit={(v) => onUpdate({ distanceM: Number(v) || 0 })}
          />
          <NativeSelectField
            label="Kategória"
            value={place.category}
            onChange={(v) => onUpdate({ category: v })}
          >
            {AMENITY_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {AMENITY_CATEGORY_LABELS[c.key]}
              </option>
            ))}
          </NativeSelectField>
          <InlineTextField
            label="Pešo (min)"
            type="number"
            value={String(place.walkMinutes ?? "")}
            onCommit={(v) => onUpdate({ walkMinutes: v ? Number(v) : null })}
          />
          <InlineTextField
            label="Autom (min)"
            type="number"
            value={String(place.driveMinutes ?? "")}
            onCommit={(v) => onUpdate({ driveMinutes: v ? Number(v) : null })}
          />
          <InlineTextField
            label="Poznámka"
            value={place.note}
            className="sm:col-span-2"
            onCommit={(v) => onUpdate({ note: v })}
          />
        </div>
        <ConfirmDeleteButton
          onConfirm={onDelete}
          title="Odstrániť miesto?"
          description={`Odstrániť „${place.name || "bez názvu"}“ zo zoznamu?`}
        />
      </div>
      {place.isManual && (
        <p className="mt-1 pl-7 text-xs text-slate-400">
          <Trash2 className="mr-1 inline size-3" aria-hidden="true" />
          Pridané ručne — pri opätovnom vyhľadaní sa nezmaže.
        </p>
      )}
    </div>
  );
}
