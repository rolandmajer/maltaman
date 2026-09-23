"use client";

import { FormEvent, useMemo, useState } from "react";
import { ClipboardCheck, Mail, Phone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost } from "@/lib/offline/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type CustomerDto = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  consentAt: string | null;
  leadCount: number;
  inspectionCount: number;
};

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerDto[] }) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [customers, setCustomers] = useState(initialCustomers);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) =>
      !q || [customer.name, customer.email, customer.phone].some((value) => value.toLowerCase().includes(q))
    );
  }, [customers, query]);

  async function addCustomer(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await apiPost<CustomerDto & { _count: { leads: number; inspections: number } }>(
        "/api/crm/customers",
        form,
        "Nový klient"
      );
      const customer: CustomerDto = {
        ...saved,
        consentAt: saved.consentAt ? String(saved.consentAt) : null,
        leadCount: saved._count.leads,
        inspectionCount: saved._count.inspections,
      };
      setCustomers((items) => [customer, ...items.filter((item) => item.id !== customer.id)]);
      toast.success("Klient bol uložený");
      setForm({ name: "", email: "", phone: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Klienta sa nepodarilo uložiť");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string) {
    try {
      await apiDelete(`/api/crm/customers/${id}`, "Odstránenie klienta");
      setCustomers((items) => items.filter((customer) => customer.id !== id));
      toast.success("Klient bol vymazaný");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Klienta sa nepodarilo vymazať");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Klienti</h1>
        <p className="text-sm text-slate-500">Jednotná databáza kontaktov pre leady a protokoly.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Pridať klienta</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addCustomer} className="grid gap-3 sm:grid-cols-3">
            <Input aria-label="Meno klienta" placeholder="Meno" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required type="email" aria-label="E-mail klienta" placeholder="E-mail"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input aria-label="Telefón klienta" placeholder="Telefón" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Button type="submit" disabled={saving} className="sm:col-span-3 sm:justify-self-start">
              <Plus /> {saving ? "Ukladám…" : "Pridať klienta"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" aria-label="Hľadať klientov" placeholder="Hľadať podľa mena, e-mailu alebo telefónu"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{customer.name || customer.email}</p>
                <div className="flex items-center gap-1">
                  {customer.consentAt && <Badge variant="ok">Súhlas</Badge>}
                  <ConfirmDeleteButton
                    title="Vymazať klienta?"
                    description={`Klient a jeho ${customer.leadCount} CRM leadov sa natrvalo odstránia. Existujúce protokoly a cenové ponuky zostanú zachované bez väzby na klienta.`}
                    onConfirm={() => void deleteCustomer(customer.id)}
                  />
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-slate-600"><Mail className="size-4" /> {customer.email}</p>
              {customer.phone && <p className="flex items-center gap-1.5 text-sm text-slate-600"><Phone className="size-4" /> {customer.phone}</p>}
              <div className="flex gap-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span>{customer.leadCount} leadov</span>
                <span className="flex items-center gap-1"><ClipboardCheck className="size-3.5" /> {customer.inspectionCount} obhliadok</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
