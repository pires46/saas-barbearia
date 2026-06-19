const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "../packages/database/prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes('provider = "sqlite"')) {
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log("[prepare-prod-schema] Prisma configurado para PostgreSQL");
}
