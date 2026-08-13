import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api-helpers";
import { customerSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { upsertCustomer } from "@/lib/crm";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const customers = await db.customer.findMany({
      where: {
        organisationId: user.organisationId,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { leads: true, inspections: true } },
      },
    });
    return NextResponse.json(customers);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const data = customerSchema.parse(await req.json());
    const saved = await upsertCustomer({
      organisationId: user.organisationId,
      ...data,
      consentAt: data.consent ? new Date() : undefined,
    });
    const customer = await db.customer.findUniqueOrThrow({
      where: { id: saved.id },
      include: { _count: { select: { leads: true, inspections: true } } },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
