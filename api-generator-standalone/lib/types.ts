export type Prop = {
  name: string;
  type: string;
  isOptional: boolean;
  description?: string;
  defaultValue?: string;
};

export type ComponentInfo = {
  name: string;
  props: Array<Prop>;
  filePath: string;
};

export type ResolverOptions = {
  /** resolve하지 않고 이름 그대로 보존할 타입들 */
  preservedTypes?: Array<string>;
  /** 타입 파라미터 이름 매핑 (예: { T: 'ElementType' }) */
  typeParameterMap?: Record<string, string>;
  /** 재귀 깊이 제한 (기본: 2) */
  maxDepth?: number;
};

export type ExtractorOptions = {
  /** cleanTypeText로 처리할 특수 prop 이름들 (기본: ['xs','sm','md','lg','xl']) */
  rawTypeProps?: Array<string>;
  /** 복잡한 annotation으로 인식할 utility 타입 이름들 */
  complexAnnotationTypes?: Array<string>;
};

export type ParserOptions = {
  resolver?: ResolverOptions;
  extractor?: ExtractorOptions;
};
