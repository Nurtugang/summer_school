import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardPdfDocument, TaskSetPdfDocument } from "@/lib/cardPdf";
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

  const doc =
    card.kind === "task_set"
      ? TaskSetPdfDocument({ card: card.cardJson as unknown as TaskSetJson })
      : CardPdfDocument({ card: card.cardJson as unknown as TriadJson });

  const buffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="card-${card.id}.pdf"`,
    },
  });
}
