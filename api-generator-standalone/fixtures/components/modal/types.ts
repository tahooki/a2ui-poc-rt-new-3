import type { ReactNode, CSSProperties } from 'react';

export type ModalProps = {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 모달 제목 */
  title?: string;
  /** 모달 내부 콘텐츠 */
  children: ReactNode;
  /** 모달 너비 */
  width?: number | string;
  /** 오버레이 클릭 시 닫기 여부 */
  closeOnOverlayClick?: boolean;
  /** 커스텀 스타일 */
  style?: CSSProperties;
  /** 모달 하단 액션 영역 */
  footer?: ReactNode;
};
