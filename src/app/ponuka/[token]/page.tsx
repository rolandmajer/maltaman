import { ClientQuotationForm } from "./client-quotation-form";

export default async function ClientQuotationFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ClientQuotationForm token={token} />;
}
