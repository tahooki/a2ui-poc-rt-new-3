import type { ReactNode } from 'react';

export type ButtonVariant = 'filled' | 'outlined' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ButtonProps = {
  /** 버튼 내부 콘텐츠 */
  children: ReactNode;
  /** 버튼 스타일 변형 */
  variant?: ButtonVariant;
  /** 버튼 크기 */
  size?: ButtonSize;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 전체 너비 채우기 */
  fullWidth?: boolean;
  /** 클릭 핸들러 */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};
