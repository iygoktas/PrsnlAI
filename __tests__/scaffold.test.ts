import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");

describe("T-001 scaffold", () => {
  it("has package.json with required scripts", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    expect(pkg.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      test: expect.any(String),
      lint: expect.any(String),
      typecheck: expect.any(String),
    });
  });

  it("has tsconfig.json with strict mode and @/ alias", () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.paths).toMatchObject({ "@/*": expect.any(Array) });
  });

  it("has tailwind config", () => {
    expect(fs.existsSync(path.join(root, "tailwind.config.ts"))).toBe(true);
  });

  it("has required src directories", () => {
    const dirs = ["ingestion", "embedding", "storage", "search", "llm", "lib", "types", "components"];
    for (const d of dirs) {
      expect(fs.existsSync(path.join(root, "src", d))).toBe(true);
    }
  });

  it("has App Router layout and page", () => {
    expect(fs.existsSync(path.join(root, "src", "app", "layout.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src", "app", "page.tsx"))).toBe(true);
  });
});
