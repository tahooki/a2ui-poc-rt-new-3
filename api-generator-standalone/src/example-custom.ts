/**
 * 커스텀 프로젝트에 맞춰 설정을 바꿔서 파싱하는 예제
 *
 * 다른 디자인 시스템이나 일반 React 프로젝트에서
 * 어떤 옵션을 넣을 수 있는지 보여줍니다.
 *
 * 실행: pnpm start:custom
 */
import path from 'node:path';
import { Parser } from '../lib';

import type { ParserOptions } from '../lib';

const customOptions: ParserOptions = {
  resolver: {
    // 프로젝트 전용 타입을 보존 목록에 추가
    preservedTypes: [
      // React 기본
      'ReactNode', 'ReactElement', 'CSSProperties',
      'RefObject', 'ForwardedRef',
      // 우리 프로젝트 전용 타입 (예시)
      'ThemeColor', 'BreakpointValue', 'IconName',
    ],
    // 제네릭 T를 그냥 T로 표시 (매핑 안 함)
    typeParameterMap: {},
    // 재귀 깊이를 3으로 늘려서 더 깊은 타입도 풀기
    maxDepth: 3,
  },
  extractor: {
    // 반응형 prop이 없는 프로젝트면 빈 배열
    rawTypeProps: [],
    // 추가적인 utility 타입도 복잡한 annotation으로 인식
    complexAnnotationTypes: [
      'ComponentPropsWithoutRef',
      'ComponentProps',
      'HTMLAttributes',
      'SVGAttributes',
    ],
  },
};

const tsconfigPath = path.join(import.meta.dirname, '..', 'tsconfig.json');
const parser = new Parser(tsconfigPath, customOptions);

const componentFilter = /components\/.*\/(?!.*\.test\.tsx?$).*\.tsx?$/;
const items = parser
  .getExportedItems()
  .filter((item) => item.filePath.match(componentFilter));

const result = parser.parse(items);

console.log();
console.log(`커스텀 설정으로 파싱 결과: ${result.length}개 컴포넌트`);
console.log();

for (const comp of result) {
  console.log(`  ${comp.name} — ${comp.props.length}개 props`);
  for (const prop of comp.props) {
    const opt = prop.isOptional ? '?' : '*';
    const def = prop.defaultValue ? ` = ${prop.defaultValue}` : '';
    console.log(`    ${opt} ${prop.name}: ${prop.type}${def}`);
  }
  console.log();
}
