import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractDocxText, extractPdfText, ScannedPdfError } from "@/lib/fileParse";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/lib/config";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  if (file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: `Файл больше ${UPLOAD_MAX_MB} МБ` },
      { status: 400 }
    );
  }

  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isDoc = name.endsWith(".doc") || file.type === "application/msword";

  if (!isPdf && !isDocx && !isDoc) {
    return NextResponse.json(
      { error: "Принимаются только файлы .pdf и .docx" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text = isPdf ? await extractPdfText(buffer) : await extractDocxText(buffer);

    if (!text) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст из файла" },
        { status: 400 }
      );
    }

    return NextResponse.json({ fileName: file.name, text });
  } catch (err) {
    if (err instanceof ScannedPdfError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (isDoc && !isDocx) {
      return NextResponse.json(
        { error: "Формат .doc не поддерживается напрямую — пересохраните файл в .docx" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Не удалось обработать файл" }, { status: 400 });
  }
}
