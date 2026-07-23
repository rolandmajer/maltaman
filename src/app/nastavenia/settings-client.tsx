"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete, apiUpload } from "@/lib/offline/api-client";
import { useAutosaveForm } from "@/lib/use-autosave-form";
import { appSettingsUpdateSchema } from "@/lib/validation";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { TextField, TextAreaField } from "@/components/wizard/form-fields";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { z } from "zod";

type SettingsValues = z.infer<typeof appSettingsUpdateSchema>;
type SettingsResponse = SettingsValues & { logoUrl: string | null };

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

      <PasswordSection />

      {isAdmin && <UsersSection currentUserId={currentUserId} />}
    </div>
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
