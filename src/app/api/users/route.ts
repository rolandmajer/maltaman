import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { userCreateSchema } from "@/lib/validation";

// User management is admin-only and org-scoped. Password hashes never leave the server.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registrationNumber: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const admin = await requireAdmin();
    const users = await db.user.findMany({
      where: { organisationId: admin.organisationId },
      orderBy: { createdAt: "asc" },
      select: userSelect,
    });
    return NextResponse.json(users);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const data = userCreateSchema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "Používateľ s týmto e-mailom už existuje");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await db.user.create({
      data: {
        organisationId: admin.organisationId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        registrationNumber: data.registrationNumber || null,
      },
      select: userSelect,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
