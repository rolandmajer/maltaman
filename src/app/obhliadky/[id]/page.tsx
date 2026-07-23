import { redirect } from "next/navigation";

export default async function InspectionRootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/obhliadky/${id}/zakladne-udaje`);
}
