import type { IncomingMessage, ServerResponse } from "http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);

  // Vercel rewrites "/api/trpc/:path*" → "/api?path=<captured>"
  // so the tRPC procedure path arrives as the "path" query parameter.
  // Fall back to stripping the URL prefix for local dev.
  const trpcPath = url.searchParams.get("path")
    || url.pathname.replace(/^\/api\/trpc\/?/, "");

  return nodeHTTPRequestHandler({
    router: appRouter,
    path: trpcPath,
    req,
    res,
    createContext: ({ req, res }) => createContext({ req: req as any, res: res as any }),
  });
}
