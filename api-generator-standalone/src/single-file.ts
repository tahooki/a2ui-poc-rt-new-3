/**
 * 특정 파일 하나만 지정해서 파싱하는 예제
 *
 * 실행: pnpm start:single
 * 또는: pnpm start:single -- --file fixtures/components/button/index.tsx
 */
import path from 'node:path';
import { Parser } from '../lib';

// CLI 인자에서 파일 경로 읽기
const fileArgIndex = process.argv.indexOf('--file');
const targetFile =
  fileArgIndex !== -1
    ? path.resolve(process.argv[fileArgIndex + 1])
    : path.join(import.meta.dirname, '..', 'fixtures', 'components', 'button', 'index.tsx');

const tsconfigPath = path.join(import.meta.dirname, '..', 'tsconfig.json');
const parser = new Parser(tsconfigPath);

// 전체 export 중 해당 파일만 필터
const items = parser
  .getExportedItems()
  .filter((item) => item.filePath === targetFile);

if (items.length === 0) {
  console.error(`❌ "${targetFile}" 에서 PascalCase export를 찾을 수 없습니다.`);
  process.exit(1);
}

const result = parser.parse(items);

console.log();
console.log(`📄 파일: ${path.relative(process.cwd(), targetFile)}`);
console.log();
console.log(JSON.stringify(result, null, 2));
console.log();
