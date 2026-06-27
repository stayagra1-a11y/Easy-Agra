import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function maybeResetAdminPassword() {
  const newPass = process.env["ADMIN_RESET_PASSWORD"];
  if (!newPass) return;
  const hash = await bcrypt.hash(newPass, 12);
  await db
    .update(usersTable)
    .set({ passwordHash: hash })
    .where(inArray(usersTable.role, ["admin", "super_admin"] as any));
  logger.info("Admin passwords reset via ADMIN_RESET_PASSWORD env var");
}

maybeResetAdminPassword()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup error");
    process.exit(1);
  });
