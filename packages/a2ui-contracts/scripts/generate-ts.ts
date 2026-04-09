/**
 * JSON Schema → TypeScript 타입 자동 생성 스크립트
 *
 * schemas/ 와 templates/ 디렉토리의 .schema.json 파일을 읽어
 * generated/typescript/ 에 .d.ts 파일을 생성한다.
 */

import { compile } from "json-schema-to-typescript";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(ROOT, "generated", "typescript");
const SCHEMA_DIRS = [join(ROOT, "schemas"), join(ROOT, "templates")];

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const indexLines: string[] = [];

  for (const dir of SCHEMA_DIRS) {
    const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json"));

    for (const file of files) {
      const schemaPath = join(dir, file);
      const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
      const baseName = basename(file, ".schema.json");

      const ts = await compile(schema, schema.title ?? baseName, {
        bannerComment: `/* Auto-generated from ${file} — do not edit */`,
        additionalProperties: false,
        style: { semi: true, singleQuote: false },
      });

      const outFile = `${baseName}.d.ts`;
      writeFileSync(join(OUTPUT_DIR, outFile), ts);
      console.log(`  generated: ${outFile}`);

      // Export the main type from the index
      const typeName = schema.title ?? baseName;
      indexLines.push(`export type { ${typeName} } from "./${baseName}";`);
    }
  }

  // Write index file
  writeFileSync(
    join(OUTPUT_DIR, "index.ts"),
    `/* Auto-generated index — do not edit */\n${indexLines.join("\n")}\n`,
  );
  console.log(`  generated: index.ts (${indexLines.length} exports)`);
}

main().catch((err) => {
  console.error("Type generation failed:", err);
  process.exit(1);
});
