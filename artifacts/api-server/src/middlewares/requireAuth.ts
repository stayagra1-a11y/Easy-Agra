import type { Request, Response, NextFunction } from "express";
import { getUserById } from "../lib/auth";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session invalid" });
    return;
  }
  if (user.status === "banned") {
    req.session.destroy(() => {});
    res.status(403).json({ error: "Your account has been permanently banned. Contact support." });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "Account suspended" });
    return;
  }
  (req as any).currentUser = user;
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      const user = (req as any).currentUser;
      if (!roles.includes(user.role)) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      next();
    });
  };
}
