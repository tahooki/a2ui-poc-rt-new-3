/**
 * 전체 fixtures 폴더를 스캔해서 api.json을 생성하는 메인 스크립트
 *
 * 실행: pnpm start
 */
import path from 'node:path';
import fs from 'node:fs';
import { Parser } from '../lib';

const tsconfigPath = path.join(import.meta.dirname, '..', 'tsconfig.json');
const componentFilter = /components\/.*\/(?!.*\.test\.tsx?$).*\.tsx?$/;

// 옵션 없이 생성하면 범용 React 프로젝트용 기본값 사용
const parser = new Parser(tsconfigPath);

const exportedItems = parser
  .getExportedItems()
  .filter((item) => item.filePath.match(componentFilter));

const result = parser.parse(exportedItems);

// 중복 제거
const unique = result.filter(
  (item, index, self) =>
    self.findIndex(
      (other) => other.name === item.name && other.filePath === item.filePath,
    ) === index,
);

const outputDir = path.join(import.meta.dirname, '..', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'api.json');
fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2));

console.log('='.repeat(60));
console.log(' API Generator Standalone');
console.log('='.repeat(60));
console.log();
console.log(`  컴포넌트 ${unique.length}개 추출 완료`);
console.log();

for (const comp of unique) {
  const relPath = path.relative(path.join(import.meta.dirname, '..'), comp.filePath);
  console.log(`  📦 ${comp.name} (${relPath})`);
  console.log(`     props: ${comp.props.length}개`);

  for (const prop of comp.props) {
    const optional = prop.isOptional ? '?' : '*';
    const def = prop.defaultValue ? ` = ${prop.defaultValue}` : '';
    const desc = prop.description ? `  // ${prop.description}` : '';
    console.log(`       ${optional} ${prop.name}: ${prop.type}${def}${desc}`);
  }
  console.log();
}

console.log(`  💾 저장: ${path.relative(path.join(import.meta.dirname, '..'), outputPath)}`);
console.log();
