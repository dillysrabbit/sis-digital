import type { IncomingMessage, ServerResponse } from "http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Strip the /api/trpc prefix to get the tRPC path
  const url = req.url || "";
  const trpcPath = url.replace(/^\/api\/trpc\/?/, "").split("?")[0];

  return nodeHTTPRequestHandler({
    router: appRouter,
    path: trpcPath,
    req,
    res,
    createContext: ({ req, res }) => createContext({ req: req as any, res: res as any }),
  });
}
