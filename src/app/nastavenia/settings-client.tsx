"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete, apiUpload } from "@/lib/offline/api-client";
import { useAutosaveForm } from "@/lib/use-autosave-form";
import { appSettingsUpdateSchema } from "@/lib/validation";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { TextField, TextAreaField } from "@/components/wizard/form-fields";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_COST_CATEGORIES } from "@/lib/constants";
import { DEFAULT_QUOTE_OPTIONAL_SERVICES, type QuoteOptionalServicePreset } from "@/lib/quotation-calculations";
import type { z } from "zod";

// Keep React Hook Form's Path<T> calculation shallow. Feeding the full inferred Zod settings type
// (which now includes an array of service objects) into every generic TextField causes TypeScript
// to recursively enumerate paths that these scalar forms never use.
type SettingsValues = Record<string, string | number | boolean | null | undefined>;
type SettingsResponse = z.infer<typeof appSettingsUpdateSchema> & { logoUrl: string | null };

export function SettingsClient({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId: string }) {
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

      <QuotationPricingSection settings={settings} onSaved={setSettings} />

      <QuotationServicesSection settings={settings} onSaved={setSettings} />

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

      <PresetValuesSection />

      <PasswordSection />

      {isAdmin && <UsersSection currentUserId={currentUserId} />}
    </div>
  );
}

const GENERAL_PRESET_CATEGORIES = [
  { value: "location", label: "Umiestnenie" },
  { value: "extent", label: "Rozsah" },
  { value: "recommended-action", label: "Odporúčané opatrenie" },
];

/**
 * Generic editor for the org-level custom preset values used by the room-checklist dropdowns
 * (CustomPresetValue). One panel handles every category via a picker, rather than a bespoke
 * settings section per element/attribute — new custom values also accrue automatically as
 * technicians pick "Iné – doplniť" in the wizard, this panel is just for curating them.
 */
function PresetValuesSection() {
  const [category, setCategory] = useState(GENERAL_PRESET_CATEGORIES[0].value);
  const [customCategory, setCustomCategory] = useState("");
  const [values, setValues] = useState<{ id: string; value: string }[]>([]);
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(false);

  const activeCategory = customCategory.trim() || category;

  useEffect(() => {
    // Fetching the preset list for the selected category is a legitimate external-system side
    // effect (network I/O keyed off a user-driven category change), not derived local state —
    // see the identical justification already used for description regeneration in
    // src/components/wizard/room-element-card.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiGet<{ id: string; value: string }[]>(`/api/settings/presets?category=${encodeURIComponent(activeCategory)}`)
      .then(setValues)
      .catch(() => toast.error("Nepodarilo sa načítať hodnoty"))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  async function addValue() {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    try {
      const created = await apiPost<{ id: string; value: string }>("/api/settings/presets", {
        category: activeCategory,
        value: trimmed,
      });
      setValues((prev) => [...prev.filter((v) => v.value !== trimmed), created]);
      setNewValue("");
    } catch {
      toast.error("Pridanie hodnoty zlyhalo");
    }
  }

  async function removeValue(id: string) {
    setValues((prev) => prev.filter((v) => v.id !== id));
    try {
      await apiDelete(`/api/settings/presets?id=${id}`);
    } catch {
      toast.error("Odstránenie hodnoty zlyhalo");
    }
  }

  return (
    <StepSection title="Vlastné hodnoty pre rozbaľovacie zoznamy">
      <p className="text-xs text-slate-400">
        Vlastné hodnoty sa do tohto zoznamu pridávajú aj automaticky, keď technik v obhliadke zvolí „Iné – doplniť
        vlastný údaj“. Tu ich môžete vopred pripraviť alebo odstrániť.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NativeSelectField label="Kategória" value={customCategory ? "" : category} onChange={(v) => { setCategory(v); setCustomCategory(""); }}>
          {GENERAL_PRESET_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </NativeSelectField>
        <Input
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="…alebo vlastná kategória, napr. element-attribute:okna:typ_okna"
          className="h-11"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Načítavam…</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {values.length === 0 && <li className="text-sm text-slate-400">Zatiaľ žiadne hodnoty.</li>}
          {values.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-1.5 text-sm">
              {v.value}
              <button type="button" onClick={() => void removeValue(v.id)} aria-label={`Odstrániť hodnotu ${v.value}`}>
                <Trash2 className="size-4 text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Nová hodnota…" />
        <Button size="sm" variant="outline" onClick={() => void addValue()}>
          <Plus /> Pridať
        </Button>
      </div>
    </StepSection>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Nové heslo musí mať aspoň 8 znakov");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Nové heslá sa nezhodujú");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/account/password", { currentPassword, newPassword }, "Zmena hesla");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Heslo bolo zmenené");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Zmena hesla zlyhala");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepSection title="Zmena hesla" description="Zmena hesla pre váš vlastný účet.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-current">Súčasné heslo</Label>
          <Input
            id="pw-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-new">Nové heslo (min. 8 znakov)</Label>
          <Input
            id="pw-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pw-confirm">Nové heslo znova</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <Button
        size="sm"
        className="mt-1 self-start"
        onClick={() => void changePassword()}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
      >
        {saving ? "Ukladám…" : "Zmeniť heslo"}
      </Button>
    </StepSection>
  );
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
  registrationNumber: string | null;
  createdAt: string;
};

const ROLE_LABELS: Record<UserRow["role"], string> = { ADMIN: "Administrátor", TECHNICIAN: "Technik" };

const EMPTY_NEW_USER = { name: "", email: "", password: "", role: "TECHNICIAN" as UserRow["role"], registrationNumber: "" };

function UsersSection({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<UserRow[]>("/api/users")
      .then(setUsers)
      .catch(() => toast.error("Nepodarilo sa načítať používateľov"));
  }, []);

  async function addUser() {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error("Zadajte meno a e-mail");
      return;
    }
    if (newUser.password.length < 8) {
      toast.error("Heslo musí mať aspoň 8 znakov");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<UserRow>(
        "/api/users",
        {
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          registrationNumber: newUser.registrationNumber || undefined,
        },
        "Vytvorenie používateľa"
      );
      setUsers((prev) => [...(prev ?? []), created]);
      setNewUser(EMPTY_NEW_USER);
      toast.success(`Používateľ ${created.email} bol vytvorený`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vytvorenie používateľa zlyhalo");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserRow) {
    try {
      await apiDelete(`/api/users/${user.id}`, "Odstránenie používateľa");
      setUsers((prev) => (prev ?? []).filter((u) => u.id !== user.id));
      toast.success(`Používateľ ${user.email} bol odstránený`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Odstránenie používateľa zlyhalo");
    }
  }

  return (
    <StepSection
      title="Používatelia"
      description="Účty pre prihlásenie do aplikácie. Noví používatelia sa prihlásia zadaným e-mailom a heslom."
    >
      {users === null ? (
        <p className="text-sm text-slate-400">Načítavam používateľov…</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {user.name}
                  {user.id === currentUserId && <span className="ml-1 text-xs text-slate-400">(vy)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user.email}
                  {user.registrationNumber ? ` · ${user.registrationNumber}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{ROLE_LABELS[user.role]}</Badge>
                {user.id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button" aria-label={`Odstrániť používateľa ${user.email}`}>
                        <Trash2 className="size-4 text-red-500" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Odstrániť používateľa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Účet {user.email} sa natrvalo odstráni a používateľ sa už neprihlási. Používateľa s
                          vytvorenými obhliadkami nie je možné odstrániť.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteUser(user)}>Odstrániť</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 rounded-lg border border-slate-200 p-3">
        <p className="mb-3 text-sm font-medium">Pridať používateľa</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-name">Meno</Label>
            <Input
              id="new-user-name"
              value={newUser.name}
              onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-email">E-mail</Label>
            <Input
              id="new-user-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-password">Heslo (min. 8 znakov)</Label>
            <Input
              id="new-user-password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-role">Rola</Label>
            <Select
              value={newUser.role}
              onValueChange={(role) => setNewUser((p) => ({ ...p, role: role as UserRow["role"] }))}
            >
              <SelectTrigger id="new-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECHNICIAN">Technik</SelectItem>
                <SelectItem value="ADMIN">Administrátor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="new-user-reg">Číslo osvedčenia (nepovinné)</Label>
            <Input
              id="new-user-reg"
              value={newUser.registrationNumber}
              onChange={(e) => setNewUser((p) => ({ ...p, registrationNumber: e.target.value }))}
              autoComplete="off"
            />
          </div>
        </div>
        <Button size="sm" className="mt-3" onClick={() => void addUser()} disabled={saving}>
          <UserPlus /> {saving ? "Vytváram…" : "Pridať používateľa"}
        </Button>
      </div>
    </StepSection>
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
        onSaved({ ...settings, ...values } as SettingsResponse);
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
        onSaved({ ...settings, ...values } as SettingsResponse);
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

function QuotationPricingSection({
  settings,
  onSaved,
}: {
  settings: SettingsResponse;
  onSaved: (s: SettingsResponse) => void;
}) {
  const form = useAutosaveForm<SettingsValues>({
    schema: appSettingsUpdateSchema,
    defaultValues: {
      quoteNumberPrefix: settings.quoteNumberPrefix,
      pricingBaseAddress: settings.pricingBaseAddress,
      quoteValidityDays: settings.quoteValidityDays,
      apartmentRatePerM2: settings.apartmentRatePerM2,
      apartmentMinimumPrice: settings.apartmentMinimumPrice,
      houseRatePerM2: settings.houseRatePerM2,
      houseMinimumPrice: settings.houseMinimumPrice,
      otherRatePerM2: settings.otherRatePerM2,
      otherMinimumPrice: settings.otherMinimumPrice,
      shellRatePerM2: settings.shellRatePerM2,
      shellMinimumPrice: settings.shellMinimumPrice,
      fullProtocolRatePerM2: settings.fullProtocolRatePerM2,
      fullProtocolMinimum: settings.fullProtocolMinimum,
      travelFreeUpToKm: settings.travelFreeUpToKm,
      travelBandTwoUpToKm: settings.travelBandTwoUpToKm,
      travelBandTwoPrice: settings.travelBandTwoPrice,
      travelBandThreeUpToKm: settings.travelBandThreeUpToKm,
      travelBandThreePrice: settings.travelBandThreePrice,
      travelOverBandRatePerKm: settings.travelOverBandRatePerKm,
    },
    onSave: async (values) => {
      try {
        await apiPatch("/api/settings", values);
        onSaved({ ...settings, ...values } as SettingsResponse);
      } catch {
        toast.error("Uloženie cenníka zlyhalo");
      }
    },
  });

  return (
    <StepSection title="Cenník obhliadok" description="Hodnoty kalkulátora cenovej ponuky. Zmeny neprepíšu už vystavené a prijaté ponuky.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField form={form} name="quoteNumberPrefix" label="Prefix cenovej ponuky" />
        <TextField form={form} name="quoteValidityDays" label="Platnosť ponuky (dni)" type="number" />
        <TextField form={form} name="pricingBaseAddress" label="Východisková adresa pre cestovné" className="sm:col-span-2" />
        <TextField form={form} name="apartmentRatePerM2" label="Byt – cena za m² (€)" type="number" />
        <TextField form={form} name="apartmentMinimumPrice" label="Byt – minimálna cena (€)" type="number" />
        <TextField form={form} name="houseRatePerM2" label="Rodinný dom – cena za m² (€)" type="number" />
        <TextField form={form} name="houseMinimumPrice" label="Rodinný dom – minimálna cena (€)" type="number" />
        <TextField form={form} name="shellRatePerM2" label="Holostavba – cena za m² (€)" type="number" />
        <TextField form={form} name="shellMinimumPrice" label="Holostavba – minimálna cena (€)" type="number" />
        <TextField form={form} name="otherRatePerM2" label="Iná nehnuteľnosť – cena za m² (€)" type="number" />
        <TextField form={form} name="otherMinimumPrice" label="Iná nehnuteľnosť – minimálna cena (€)" type="number" />
        <TextField form={form} name="fullProtocolRatePerM2" label="Kompletný protokol – cena za m² (€)" type="number" />
        <TextField form={form} name="fullProtocolMinimum" label="Kompletný protokol – minimum (€)" type="number" />
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="mb-3 text-sm font-medium">Cestovné – vzdialenosť tam aj späť</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField form={form} name="travelFreeUpToKm" label="Zdarma do (km)" type="number" />
          <TextField form={form} name="travelBandTwoUpToKm" label="Druhé pásmo do (km)" type="number" />
          <TextField form={form} name="travelBandTwoPrice" label="Cena druhého pásma (€)" type="number" />
          <TextField form={form} name="travelBandThreeUpToKm" label="Tretie pásmo do (km)" type="number" />
          <TextField form={form} name="travelBandThreePrice" label="Cena tretieho pásma (€)" type="number" />
          <TextField form={form} name="travelOverBandRatePerKm" label="Nad pásmo – cena za km (€)" type="number" />
        </div>
      </div>
    </StepSection>
  );
}

function QuotationServicesSection({
  settings,
  onSaved,
}: {
  settings: SettingsResponse;
  onSaved: (s: SettingsResponse) => void;
}) {
  const initial = settings.quoteOptionalServices?.length ? settings.quoteOptionalServices : DEFAULT_QUOTE_OPTIONAL_SERVICES;
  const [services, setServices] = useState<QuoteOptionalServicePreset[]>(initial);
  const [saving, setSaving] = useState(false);

  async function save(next: QuoteOptionalServicePreset[]) {
    setServices(next);
    setSaving(true);
    try {
      await apiPatch("/api/settings", { quoteOptionalServices: next });
      onSaved({ ...settings, quoteOptionalServices: next });
    } catch {
      toast.error("Uloženie voliteľných služieb zlyhalo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepSection
      title="Voliteľné služby v cenovej ponuke"
      description="Klient uvidí každú službu samostatne a do celkovej ceny sa započítajú len vybrané položky."
      actions={<Button size="sm" variant="outline" onClick={() => void save([...services, { code: `CUSTOM_${Date.now()}`, name: "Nová služba", description: "", pricingMode: "FIXED", price: 0 }])}><Plus /> Pridať službu</Button>}
    >
      <div className="space-y-3">
        {services.map((service, index) => (
          <div key={service.code} className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px_120px_auto]">
              <div className="space-y-2">
                <Input value={service.name} aria-label="Názov služby" onChange={(e) => setServices((current) => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                <Input value={service.description} aria-label="Popis služby" placeholder="Krátky popis pre klienta" onChange={(e) => setServices((current) => current.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} />
              </div>
              <NativeSelectField label="Spôsob ceny" value={service.pricingMode} onChange={(value) => setServices((current) => current.map((item, i) => i === index ? { ...item, pricingMode: value as "FIXED" | "PER_M2" } : item))}>
                <option value="FIXED">Pevná cena</option><option value="PER_M2">Cena za m²</option>
              </NativeSelectField>
              <div className="flex flex-col gap-1.5"><Label>Cena (€)</Label><Input type="number" min="0" step="0.01" value={service.price} onChange={(e) => setServices((current) => current.map((item, i) => i === index ? { ...item, price: Number(e.target.value) || 0 } : item))} /></div>
              <div className="flex flex-col gap-1.5"><Label>Minimum (€)</Label><Input type="number" min="0" step="0.01" disabled={service.pricingMode === "FIXED"} value={service.minimumPrice ?? ""} onChange={(e) => setServices((current) => current.map((item, i) => i === index ? { ...item, minimumPrice: Number(e.target.value) || 0 } : item))} /></div>
              <button type="button" disabled={service.code === "FULL_PROTOCOL"} className="self-center disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Odstrániť ${service.name}`} onClick={() => void save(services.filter((_, i) => i !== index))}><Trash2 className="size-4 text-red-500" /></button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><Checkbox checked={Boolean(service.requiresFullProtocol)} onCheckedChange={(checked) => setServices((current) => current.map((item, i) => i === index ? { ...item, requiresFullProtocol: checked === true } : item))} /> Vyžaduje kompletný protokol</label>
          </div>
        ))}
      </div>
      <Button size="sm" onClick={() => void save(services)} disabled={saving}>{saving ? "Ukladám…" : "Uložiť služby"}</Button>
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
        onSaved({ ...settings, ...values } as SettingsResponse);
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
