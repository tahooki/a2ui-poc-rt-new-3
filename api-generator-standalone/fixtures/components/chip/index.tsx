import { forwardRef } from 'react';

import type { ForwardedRef, ReactNode } from 'react';

type ChipProps = {
  /** 칩 라벨 텍스트 */
  label: string;
  /** 칩 색상 */
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  /** 삭제 가능 여부 */
  deletable?: boolean;
  /** 삭제 시 콜백 */
  onDelete?: () => void;
  /** 좌측 아이콘 */
  icon?: ReactNode;
  /** 비활성화 */
  disabled?: boolean;
};

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      label,
      color = 'default',
      deletable = false,
      onDelete,
      icon,
      disabled = false,
    }: ChipProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div ref={ref} data-color={color} data-disabled={disabled}>
        {icon && <span className="chip-icon">{icon}</span>}
        <span className="chip-label">{label}</span>
        {deletable && (
          <button className="chip-delete" onClick={onDelete}>
            x
          </button>
        )}
      </div>
    );
  },
);
