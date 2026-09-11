import type { Server } from "socket.io";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";
import type { SessionUser } from "@/lib/auth";
import type { CommentVisibility } from "@prisma/client";

type GlobalIo = typeof globalThis & { __nexusIo?: Server };

export function setIO(io: Server) {
  (globalThis as GlobalIo).__nexusIo = io;
}

export function getIO() {
  return (globalThis as GlobalIo).__nexusIo;
}

export function emitTicketEvent(ticketId: string, event: string, payload: unknown) {
  getIO()?.to(`ticket:${ticketId}`).emit(event, payload);
}

export function emitUserEvent(userId: string, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

function cookieValue(header: string | undefined, name: string) {
  if (!header) return null;
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

export function attachRealtime(io: Server) {
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = cookieValue(socket.handshake.headers.cookie, SESSION_COOKIE);
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret()));
      socket.data.user = payload as unknown as SessionUser;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SessionUser;
    socket.join(`user:${user.id}`);

    socket.on("ticket:join", (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on("ticket:leave", (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on(
      "typing",
      (payload: { ticketId: string; visibility: CommentVisibility; isTyping: boolean }) => {
        socket.to(`ticket:${payload.ticketId}`).emit("typing", {
          userId: user.id,
          name: user.name,
          visibility: payload.visibility,
          isTyping: payload.isTyping,
        });
      },
    );
  });
}
