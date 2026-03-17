import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");

describe("T-002 Prisma setup", () => {
  const schemaPath = path.join(root, "prisma", "schema.prisma");
  const envExamplePath = path.join(root, ".env.example");

  it("prisma/schema.prisma exists", () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it("schema has postgresql datasource provider", () => {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it("schema references DATABASE_URL for url", () => {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
  });

  it("schema references DIRECT_URL for directUrl", () => {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toMatch(/directUrl\s*=\s*env\("DIRECT_URL"\)/);
  });

  it("schema has prisma-client-js generator", () => {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    expect(schema).toMatch(/provider\s*=\s*"prisma-client-js"/);
  });

  it(".env.example exists with DATABASE_URL and DIRECT_URL", () => {
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const env = fs.readFileSync(envExamplePath, "utf-8");
    expect(env).toMatch(/DATABASE_URL=/);
    expect(env).toMatch(/DIRECT_URL=/);
  });

  it(".env.example contains all required env variable keys", () => {
    const env = fs.readFileSync(envExamplePath, "utf-8");
    const required = [
      "DATABASE_URL",
      "DIRECT_URL",
      "EMBEDDING_PROVIDER",
      "OPENAI_API_KEY",
      "LLM_PROVIDER",
      "ANTHROPIC_API_KEY",
      "ANTHROPIC_MODEL",
      "MAX_CHUNK_SIZE",
      "CHUNK_OVERLAP",
      "SEARCH_TOP_K",
      "SIMILARITY_THRESHOLD",
      "LOG_LEVEL",
    ];
    for (const key of required) {
      expect(env).toMatch(new RegExp(`${key}=`));
    }
  });

  it("src/lib/prisma.ts exists", () => {
    expect(fs.existsSync(path.join(root, "src", "lib", "prisma.ts"))).toBe(true);
  });
});
