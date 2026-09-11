import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { canViewInternalNotes, isAgent } from "@/lib/permissions";
import { logActivity } from "@/lib/tickets";
import { emitTicketEvent } from "@/lib/realtime";
import { renderMessageHtml } from "@/lib/utils";

const schema = z.object({
  body: z.string().min(1),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
  mentionedUserIds: z.array(z.string()).optional(),
  attachmentIds: z.array(z.string()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    const { key } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Message cannot be empty.");

    if (parsed.data.visibility === "INTERNAL" && !canViewInternalNotes(user.role)) {
      return jsonError("End users cannot add internal notes.", 403);
    }

    const ticket = await prisma.ticket.findUnique({ where: { key } });
    if (!ticket) return jsonError("Ticket not found", 404);
    if (user.role === "END_USER" && ticket.requesterId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        body: parsed.data.body,
        bodyHtml: renderMessageHtml(parsed.data.body),
        visibility: parsed.data.visibility,
        mentions: parsed.data.mentionedUserIds?.length
          ? { create: parsed.data.mentionedUserIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            title: true,
          },
        },
        attachments: true,
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                title: true,
              },
            },
          },
        },
        receipts: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    if (parsed.data.attachmentIds?.length) {
      await prisma.attachment.updateMany({
        where: { id: { in: parsed.data.attachmentIds } },
        data: { commentId: comment.id, ticketId: ticket.id },
      });
    }

    const firstResponse =
      !ticket.firstRespondedAt && isAgent(user.role) && parsed.data.visibility === "PUBLIC";

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        lastActivityAt: new Date(),
        reminderSentAt: null,
        ...(ticket.status === "NEW" ? { status: "OPEN" } : {}),
        ...(firstResponse ? { firstRespondedAt: new Date() } : {}),
      },
    });

    await logActivity({
      ticketId: ticket.id,
      actorId: user.id,
      action: parsed.data.visibility === "INTERNAL" ? "INTERNAL_NOTE_ADDED" : "COMMENT_ADDED",
    });

    const hydrated = await prisma.ticketComment.findUniqueOrThrow({
      where: { id: comment.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            title: true,
          },
        },
        attachments: true,
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                title: true,
              },
            },
          },
        },
        receipts: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    const payload = {
      ...hydrated,
      createdAt: hydrated.createdAt.toISOString(),
      updatedAt: hydrated.updatedAt.toISOString(),
      receipts: hydrated.receipts.map((receipt) => ({
        ...receipt,
        readAt: receipt.readAt.toISOString(),
      })),
    };

    emitTicketEvent(ticket.id, "comment:new", payload);
    emitTicketEvent(ticket.id, "ticket:updated", { key });
    return NextResponse.json(payload, { status: 201 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
