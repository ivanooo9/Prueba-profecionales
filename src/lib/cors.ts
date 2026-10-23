import type { NextFunction, Request, Response } from "express";

const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);
const ALLOWED_HEADERS = new Set(["content-type", "authorization", "x-organization-id"]);

export function getAllowedFrontendOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configuredOrigins = [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(configuredOrigins.map((value) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`Invalid frontend origin configured: ${value}`);
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(`Frontend URL must be an origin without path or credentials: ${value}`);
    }

    return parsed.origin;
  }));
}

export function isAllowedRequestOrigin(
  origin: string,
  allowedOrigins: Set<string>,
  protocol: string,
  host: string | undefined
): boolean {
  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (!host) {
    return false;
  }

  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export function createCorsMiddleware(allowedOrigins: Set<string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get("origin");
    if (!origin) {
      next();
      return;
    }

    res.vary("Origin");
    const isAllowed = isAllowedRequestOrigin(origin, allowedOrigins, req.protocol, req.get("host"));
    if (!isAllowed) {
      if (req.method === "OPTIONS") {
        res.status(403).json({ success: false, error: "Origen no permitido." });
        return;
      }
      next();
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      const requestedMethod = req.get("access-control-request-method")?.toUpperCase();
      const requestedHeaders = (req.get("access-control-request-headers") || "")
        .split(",")
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);

      if (
        (requestedMethod && !ALLOWED_METHODS.has(requestedMethod)) ||
        requestedHeaders.some((header) => !ALLOWED_HEADERS.has(header))
      ) {
        res.status(403).json({ success: false, error: "Solicitud CORS no permitida." });
        return;
      }

      res.setHeader("Access-Control-Allow-Methods", [...ALLOWED_METHODS].join(", "));
      res.setHeader("Access-Control-Allow-Headers", [...ALLOWED_HEADERS].join(", "));
      res.setHeader("Access-Control-Max-Age", "600");
      res.status(204).end();
      return;
    }

    next();
  };
}

export function isSafeRedirectTarget(
  target: string | undefined | null,
  allowedOrigins: Set<string>,
  protocol: string,
  host: string | undefined
): boolean {
  if (!target || typeof target !== "string") return false;
  const trimmed = target.trim();

  // Allow relative URLs starting with a single '/'
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    return isAllowedRequestOrigin(parsed.origin, allowedOrigins, protocol, host);
  } catch {
    return false;
  }
}