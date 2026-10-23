import { Request, Response } from "express";

export function getArchitectureUserId(req: Request, res: Response): number | null {
  const user = (req as any).user || res.locals.user;
  const userId = user?.id;
  if (typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0) {
    return userId;
  }

  res.status(401).json({
    success: false,
    error: "No autenticado. No se pudo identificar al usuario responsable.",
  });
  return null;
}