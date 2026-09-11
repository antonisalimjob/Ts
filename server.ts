import { createServer } from "node:http";
import { parse } from "node:url";
import { execSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server } from "socket.io";

loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || (dev ? "localhost" : "0.0.0.0");
const port = Number(process.env.PORT || 3000);

async function bootstrap() {
  const { prisma } = await import("./src/lib/prisma");
  const users = await prisma.user.count();
  if (users === 0 && process.env.NODE_ENV !== "production") {
    execSync("npx prisma db seed", { stdio: "inherit" });
  }

  const [{ attachRealtime }, { startEscalationWorker }] = await Promise.all([
    import("./src/lib/realtime"),
    import("./src/workers/escalation-worker"),
  ]);

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer();
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: process.env.APP_URL || true,
      credentials: true,
    },
  });
  attachRealtime(io);
  startEscalationWorker();

  httpServer.on("request", (req, res) => {
    if (req.url?.startsWith("/socket.io")) return;
    const parsedUrl = parse(req.url ?? "", true);
    void handle(req, res, parsedUrl);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Nexus SM ready on http://${hostname}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
