/**
 * Montage(WDS) 디자인 시스템 전용 설정으로 파싱하는 예제
 *
 * 원본 api-generator와 동일한 동작을 재현합니다.
 *
 * 실행: pnpm start:montage
 */
import path from 'node:path';
import { Parser } from '../lib';

import type { ParserOptions } from '../lib';

// Montage 디자인 시스템 전용 설정
const montageOptions: ParserOptions = {
  resolver: {
    preservedTypes: [
      // React 공통
      'ReactNode', 'ReactElement', 'ReactFragment', 'ReactPortal',
      'JSX.Element', 'CSSProperties', 'RefObject', 'MutableRefObject',
      'Ref', 'ForwardedRef',
      // Montage 전용
      'CSSInterpolation', 'SxProp', 'ThemeColorsToken',
    ],
    typeParameterMap: {
      T: 'ElementType',
    },
  },
  extractor: {
    rawTypeProps: ['xs', 'sm', 'md', 'lg', 'xl'],
  },
};

const tsconfigPath = path.join(import.meta.dirname, '..', 'tsconfig.json');
const parser = new Parser(tsconfigPath, montageOptions);

const componentFilter = /components\/.*\/(?!.*\.test\.tsx?$).*\.tsx?$/;
const items = parser
  .getExportedItems()
  .filter((item) => item.filePath.match(componentFilter));

const result = parser.parse(items);

console.log();
console.log('Montage 설정으로 파싱 결과:');
console.log(JSON.stringify(result, null, 2));
