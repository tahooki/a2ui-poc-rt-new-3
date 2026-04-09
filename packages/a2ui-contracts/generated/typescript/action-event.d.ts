/* Auto-generated from action-event.schema.json — do not edit */

/**
 * 프론트에서 서버로 보내는 UI 액션 이벤트
 */
export interface ActionEvent {
  /**
   * 실행할 액션 ID
   */
  actionId: string;
  /**
   * 액션이 발생한 템플릿 ID
   */
  templateId: string;
  /**
   * 액션 유형
   */
  kind?: "submit" | "select" | "refresh" | "navigate";
  /**
   * 액션 파라미터
   */
  params?: {
    [k: string]: unknown;
  };
  sessionContext: {
    conversationId: string;
    userId: string;
    /**
     * action replay 방지용 고유 ID
     */
    requestId: string;
  };
}
