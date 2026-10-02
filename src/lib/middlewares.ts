import { Request, Response, NextFunction } from "express";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.role || user.role.name !== "ADMIN") {
    return res.redirect("/login?error=unauthorized");
  }
  next();
}

export async function requireProfessional(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.role || (user.role.name !== "PROFESSIONAL" && user.role.name !== "ADMIN")) {
    return res.redirect("/login?error=unauthorized");
  }
  next();
}

export async function requireClient(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || !user.role || (user.role.name !== "CLIENT" && user.role.name !== "ADMIN")) {
    return res.redirect("/login?error=unauthorized");
  }
  next();
}

export * from "./organization.middleware";

