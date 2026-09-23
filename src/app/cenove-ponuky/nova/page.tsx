import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { QuotationEditor } from "../quotation-editor";

export default async function NewQuotationPage() {
  const session = await auth();
  return <><AppHeader userName={session!.user.name ?? ""} backHref="/cenove-ponuky" /><QuotationEditor /></>;
}
