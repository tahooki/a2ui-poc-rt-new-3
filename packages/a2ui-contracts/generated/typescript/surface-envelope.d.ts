/* Auto-generated from surface-envelope.schema.json — do not edit */

/**
 * A2UI Surface를 렌더링하기 위한 최종 데이터 패키지
 */
export interface SurfaceEnvelope {
  /**
   * 렌더링할 템플릿 ID
   */
  templateId: string;
  /**
   * 템플릿 버전 (semver)
   */
  version: string;
  /**
   * 템플릿에 전달할 데이터
   */
  payload: {
    [k: string]: unknown;
  };
  /**
   * UI에서 가능한 액션 목록
   */
  actions?: SurfaceAction[];
  /**
   * Admin-authored dynamic A2UI card configuration
   */
  surfaceConfig?: {
    [k: string]: unknown;
  };
  /**
   * 이 surface를 생성한 intent key
   */
  sourceIntent: string;
  /**
   * surface 생성 시각
   */
  updatedAt: string;
  /**
   * 캐시/중복 방지용 키
   */
  freshnessKey?: string;
  meta?: {
    generatedAt?: string;
    resolverTrace?: string[];
    [k: string]: unknown;
  };
}
export interface SurfaceAction {
  actionId: string;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  kind?: "submit" | "select" | "refresh" | "navigate";
  params?: {
    [k: string]: unknown;
  };
  confirm?: {
    title?: string;
    message?: string;
  };
  targetRef?: {
    entityType?: string;
    entityId?: string;
    entityVersion?: string;
  };
}
