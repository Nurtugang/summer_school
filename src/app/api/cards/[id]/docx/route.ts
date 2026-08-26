import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderCardDocx, renderTaskSetDocx } from "@/lib/cardDocx";
import type { TriadJson, TaskSetJson } from "@/lib/gemini";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const card = await prisma.card.findUnique({ where: { id } });
  if (!card || card.userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  const buffer =
    card.kind === "task_set"
      ? await renderTaskSetDocx(card.cardJson as unknown as TaskSetJson)
      : await renderCardDocx(card.cardJson as unknown as TriadJson);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="card-${card.id}.docx"`,
    },
  });
}
