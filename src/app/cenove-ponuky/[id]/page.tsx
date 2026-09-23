import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { QuotationEditor } from "../quotation-editor";

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  return <><AppHeader userName={session!.user.name ?? ""} backHref="/cenove-ponuky" /><QuotationEditor quotationId={id} /></>;
}
