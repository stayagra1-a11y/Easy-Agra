import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool, db, platformSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();
const PgSession = connectPgSimple(session);

// Trust Replit's reverse proxy so secure cookies work in production
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "easy-agra-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  }),
);

// Maintenance mode cache — refresh every 30 seconds to avoid DB hit on every request
let maintenanceCache: { value: boolean; expiresAt: number } | null = null;

async function isMaintenanceOn(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && now < maintenanceCache.expiresAt) return maintenanceCache.value;
  try {
    const [row] = await db.select({ maintenanceMode: platformSettingsTable.maintenanceMode }).from(platformSettingsTable).limit(1);
    const value = row?.maintenanceMode ?? false;
    maintenanceCache = { value, expiresAt: now + 30_000 };
    return value;
  } catch {
    return maintenanceCache?.value ?? false;
  }
}

// Expose a function to bust the cache when settings are saved
export function bustMaintenanceCache() {
  maintenanceCache = null;
}

// Maintenance mode middleware — runs after session so we can read userId
const MAINTENANCE_EXEMPT = ["/maintenance-status", "/auth/", "/health"];

async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Always exempt public/auth paths
  if (MAINTENANCE_EXEMPT.some((p) => req.path.startsWith(p))) { next(); return; }
  // Allow platform-settings PATCH so admins can turn it off
  if (req.path === "/platform-settings" && req.method === "PATCH") { next(); return; }

  if (!(await isMaintenanceOn())) { next(); return; }

  // Check if the caller is admin/super_admin via session
  const userId = (req.session as any)?.userId;
  if (userId) {
    try {
      const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user?.role === "admin" || user?.role === "super_admin") { next(); return; }
    } catch { /* fall through to 503 */ }
  }

  res.status(503).json({ error: "App is under maintenance. Please try again later.", maintenanceMode: true });
}

app.use("/api", maintenanceMiddleware);
app.use("/api", router);

// Global error handler — catches unhandled async errors from all routes
import type { ErrorRequestHandler } from "express";
const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const log = (req as any).log ?? logger;
  log.error({ err }, "Unhandled route error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
};
app.use(globalErrorHandler);

export default app;
