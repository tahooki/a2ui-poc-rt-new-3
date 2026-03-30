/**
 * 파서가 어떤 export를 발견하는지 디버깅하는 스크립트
 * 컴포넌트로 인식되기 전 단계의 raw export 목록을 보여줌
 *
 * 실행: pnpm start:inspect
 */
import path from 'node:path';
import { Parser } from '../lib';

const tsconfigPath = path.join(import.meta.dirname, '..', 'tsconfig.json');
const parser = new Parser(tsconfigPath);

const allItems = parser.getExportedItems();

// fixtures 폴더 내부만 필터
const fixturesDir = path.join(import.meta.dirname, '..', 'fixtures');
const fixtureItems = allItems.filter((item) =>
  item.filePath.startsWith(fixturesDir),
);

console.log();
console.log('='.repeat(60));
console.log(' Export Inspector');
console.log('='.repeat(60));
console.log();
console.log(`  전체 export: ${allItems.length}개`);
console.log(`  fixtures 내: ${fixtureItems.length}개`);
console.log();

// 파일별로 그룹핑
const grouped = new Map<string, Array<{ name: string; nodeKind: string }>>();
for (const item of fixtureItems) {
  const relPath = path.relative(path.join(import.meta.dirname, '..'), item.filePath);
  if (!grouped.has(relPath)) {
    grouped.set(relPath, []);
  }
  grouped.get(relPath)!.push({
    name: item.name,
    nodeKind: item.node.getKindName(),
  });
}

for (const [filePath, exports] of grouped) {
  console.log(`  📄 ${filePath}`);
  for (const exp of exports) {
    console.log(`     ├─ ${exp.name} (${exp.nodeKind})`);
  }
  console.log();
}

// 파싱 결과
const componentFilter = /components\/.*\/(?!.*\.test\.tsx?$).*\.tsx?$/;
const componentItems = fixtureItems.filter((item) =>
  item.filePath.match(componentFilter),
);
const parsed = parser.parse(componentItems);

console.log('-'.repeat(60));
console.log(`  파싱 결과: ${parsed.length}개 컴포넌트`);
console.log('-'.repeat(60));
console.log();

for (const comp of parsed) {
  const required = comp.props.filter((p) => !p.isOptional);
  const optional = comp.props.filter((p) => p.isOptional);
  const withDefault = comp.props.filter((p) => p.defaultValue !== undefined);
  const withDesc = comp.props.filter((p) => p.description);

  console.log(`  🧩 ${comp.name}`);
  console.log(`     총 ${comp.props.length}개 props (필수 ${required.length} / 선택 ${optional.length})`);
  console.log(`     기본값 있는 props: ${withDefault.length}개`);
  console.log(`     설명 있는 props: ${withDesc.length}개`);
  console.log();
}
