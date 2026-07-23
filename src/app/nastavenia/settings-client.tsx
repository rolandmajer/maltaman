"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiUpload } from "@/lib/offline/api-client";
import { useAutosaveForm } from "@/lib/use-autosave-form";
import { appSettingsUpdateSchema } from "@/lib/validation";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { TextField, TextAreaField } from "@/components/wizard/form-fields";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_COST_CATEGORIES } from "@/lib/constants";
import type { z } from "zod";

type SettingsValues = z.infer<typeof appSettingsUpdateSchema>;
type SettingsResponse = SettingsValues & { logoUrl: string | null };

export function SettingsClient() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<SettingsResponse>("/api/settings")
      .then((data) => {
        setSettings(data);
        setCategories(
          Array.isArray(data.costCategoryPresets) && data.costCategoryPresets.length > 0
            ? data.costCategoryPresets
            : DEFAULT_COST_CATEGORIES
        );
      })
      .catch(() => toast.error("Nepodarilo sa načítať nastavenia"));
  }, []);

  async function saveCategories(next: string[]) {
    setCategories(next);
    try {
      await apiPatch("/api/settings", { costCategoryPresets: next });
    } catch {
      toast.error("Uloženie kategórií zlyhalo");
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiUpload<{ logoUrl: string }>("/api/settings/logo", formData);
      setSettings((prev) => (prev ? { ...prev, logoUrl: result.logoUrl } : prev));
      toast.success("Logo bolo aktualizované");
    } catch {
      toast.error("Nahrávanie loga zlyhalo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-sm text-slate-400">Načítavam nastavenia…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <StepPageHeader title="Nastavenia" description="Firemné údaje, číslovanie protokolov a znenie právneho vyhlásenia." />

      <CompanySection settings={settings} onSaved={setSettings} />

      <StepSection title="Logo spoločnosti">
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/settings/logo" alt="Logo" className="h-16 w-16 rounded-lg border border-slate-200 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
              Bez loga
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void uploadLogo(e.target.files[0])}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
            <Upload /> {uploadingLogo ? "Nahrávam…" : "Nahrať logo"}
          </Button>
        </div>
      </StepSection>

      <ProtocolDefaultsSection settings={settings} onSaved={setSettings} />

      <LegalSection settings={settings} onSaved={setSettings} />

      <StepSection
        title="Kategórie odhadu nákladov (predvolené)"
        actions={
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nová kategória…"
              className="h-9 w-48"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!newCategory.trim()) return;
                void saveCategories([...categories, newCategory.trim()]);
                setNewCategory("");
              }}
            >
              <Plus /> Pridať
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-1">
          {categories.map((cat, i) => (
            <li key={`${cat}-${i}`} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-1.5 text-sm">
              {cat}
              <button
                type="button"
                onClick={() => void saveCategories(categories.filter((_, idx) => idx !== i))}
                aria-label={`Odstrániť kategóriu ${cat}`}
              >
                <Trash2 className="size-4 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400">Tento zoznam sa použije pri vytváraní novej obhliadky.</p>
      </StepSection>
    </div>
  );
}

function CompanySection({
  settings,
  onSaved,
}: {
  settings: SettingsResponse;
  onSaved: (s: SettingsResponse) => void;
}) {
  const form = useAutosaveForm<SettingsValues>({
    schema: appSettingsUpdateSchema,
    defaultValues: {
      companyName: settings.companyName,
      companyTagline: settings.companyTagline,
      companyAddress: settings.companyAddress,
      companyIco: settings.companyIco,
      companyDic: settings.companyDic,
      companyPhone: settings.companyPhone,
      companyEmail: settings.companyEmail,
      companyWeb: settings.companyWeb,
    },
    onSave: async (values) => {
      try {
        await apiPatch("/api/settings", values);
        onSaved({ ...settings, ...values });
      } catch {
        toast.error("Uloženie zlyhalo");
      }
    },
  });

  return (
    <StepSection title="Firemné údaje">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField form={form} name="companyName" label="Názov spoločnosti" />
        <TextField form={form} name="companyTagline" label="Slogan / podnadpis" />
        <TextField form={form} name="companyAddress" label="Adresa" className="sm:col-span-2" />
        <TextField form={form} name="companyIco" label="IČO" />
        <TextField form={form} name="companyDic" label="DIČ" />
        <TextField form={form} name="companyPhone" label="Telefón" />
        <TextField form={form} name="companyEmail" label="E-mail" />
        <TextField form={form} name="companyWeb" label="Web" className="sm:col-span-2" />
      </div>
    </StepSection>
  );
}

function ProtocolDefaultsSection({
  settings,
  onSaved,
}: {
  settings: SettingsResponse;
  onSaved: (s: SettingsResponse) => void;
}) {
  const form = useAutosaveForm<SettingsValues>({
    schema: appSettingsUpdateSchema,
    defaultValues: {
      protocolNumberPrefix: settings.protocolNumberPrefix,
      defaultVatRatePercent: settings.defaultVatRatePercent,
      defaultContingencyPercent: settings.defaultContingencyPercent,
      dataRetentionMonths: settings.dataRetentionMonths ?? undefined,
    },
    onSave: async (values) => {
      try {
        await apiPatch("/api/settings", values);
        onSaved({ ...settings, ...values });
      } catch {
        toast.error("Uloženie zlyhalo");
      }
    },
  });

  return (
    <StepSection title="Predvolené hodnoty protokolu">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField form={form} name="protocolNumberPrefix" label="Prefix čísla protokolu" />
        <TextField form={form} name="defaultVatRatePercent" label="Predvolená sadzba DPH (%)" type="number" />
        <TextField form={form} name="defaultContingencyPercent" label="Predvolená rezerva (%)" type="number" />
        <TextField form={form} name="dataRetentionMonths" label="Doba uchovávania dát (mesiace)" type="number" />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="gps"
          checked={settings.gpsCaptureEnabled}
          onCheckedChange={async (checked) => {
            try {
              await apiPatch("/api/settings", { gpsCaptureEnabled: checked });
              onSaved({ ...settings, gpsCaptureEnabled: checked });
            } catch {
              toast.error("Uloženie zlyhalo");
            }
          }}
        />
        <Label htmlFor="gps">Povoliť voliteľné zaznamenávanie GPS polohy fotografií</Label>
      </div>
    </StepSection>
  );
}

function LegalSection({
  settings,
  onSaved,
}: {
  settings: SettingsResponse;
  onSaved: (s: SettingsResponse) => void;
}) {
  const form = useAutosaveForm<SettingsValues>({
    schema: appSettingsUpdateSchema,
    defaultValues: {
      legalVisualNonDestructive: settings.legalVisualNonDestructive,
      legalNotAReplacement: settings.legalNotAReplacement,
      legalHiddenDefects: settings.legalHiddenDefects,
      legalLimitedByAccess: settings.legalLimitedByAccess,
      legalCostsIndicative: settings.legalCostsIndicative,
      legalClientOnly: settings.legalClientOnly,
    },
    onSave: async (values) => {
      try {
        await apiPatch("/api/settings", values);
        onSaved({ ...settings, ...values });
      } catch {
        toast.error("Uloženie zlyhalo");
      }
    },
  });

  return (
    <StepSection title="Vyhlásenie a obmedzenia (znenie v PDF reporte)">
      <TextAreaField form={form} name="legalVisualNonDestructive" label="Vizuálna a nedeštruktívna obhliadka" />
      <TextAreaField form={form} name="legalNotAReplacement" label="Nenahrádza posudok" />
      <TextAreaField form={form} name="legalHiddenDefects" label="Skryté vady" />
      <TextAreaField form={form} name="legalLimitedByAccess" label="Obmedzenia prístupu" />
      <TextAreaField form={form} name="legalCostsIndicative" label="Odhady nákladov" />
      <TextAreaField form={form} name="legalClientOnly" label="Určenie pre objednávateľa" />
    </StepSection>
  );
}
