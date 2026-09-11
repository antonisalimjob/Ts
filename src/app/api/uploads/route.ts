import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    const ticketId = String(form.get("ticketId") ?? "");
    if (!(file instanceof File)) return jsonError("File is required.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replaceAll(/[^\w.\-]+/g, "_");
    const filename = `${randomUUID()}-${safeName}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url: `/uploads/${filename}`,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: bytes.length,
        ticketId: ticketId || null,
        uploadedById: user.id,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
