const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

require("./prepare-prod-schema.js");
run("npm run db:generate");

if (process.env.DATABASE_URL) {
  run("npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate");
  if (process.env.SEED_ON_START === "true") {
    run("npx prisma db seed --schema=packages/database/prisma/schema.prisma");
  }
} else {
  console.warn("[vercel-build] DATABASE_URL ausente — pulando db push/seed");
}

run("npm run build -w @saas-barbearia/web");
