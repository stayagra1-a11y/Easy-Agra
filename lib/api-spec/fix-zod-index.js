// Post-codegen fix: remove the conflicting types re-export from api-zod index.ts
// The Zod schemas in generated/api.ts already carry TypeScript types via inference.
// Re-exporting both causes TS2308 ambiguity when the same name is a Zod const + TS interface.
const fs = require("fs");
const path = require("path");

const indexPath = path.resolve(__dirname, "../../lib/api-zod/src/index.ts");
const content = fs.readFileSync(indexPath, "utf8");
const fixed = content
  .split("\n")
  .filter((line) => !line.includes("/generated/types"))
  .join("\n");
fs.writeFileSync(indexPath, fixed);
console.log("✓ Fixed api-zod/src/index.ts (removed conflicting types re-export)");
