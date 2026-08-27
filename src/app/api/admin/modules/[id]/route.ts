import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/isAdmin";

const ALLOWED_FIELDS = ["hasTaskWizard", "hasPentagramWizard", "hasDiagnostic", "hasTutorWizard"] as const;

const schema = z.object({
  field: z.enum(ALLOWED_FIELDS),
  value: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Недоступно" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  await prisma.module.update({
    where: { id },
    data: { [parsed.data.field]: parsed.data.value },
  });

  return NextResponse.json({ ok: true });
}
