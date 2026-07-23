import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { passwordChangeSchema } from "@/lib/validation";

// Self-service password change for the logged-in user. Requires the current password so a
// left-unlocked device can't silently take over the account.
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireSession();
    const data = passwordChangeSchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) throw new ApiError(404, "Používateľ nebol nájdený");

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Súčasné heslo nie je správne");

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
