import { forwardRef, memo } from 'react';

import type { ReactNode, ComponentPropsWithoutRef } from 'react';

// ─── 패턴 1: interface + extends ───
interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  width?: number;
}

interface DataTableProps<T = Record<string, unknown>> {
  /** 테이블 데이터 */
  data: Array<T>;
  /** 컬럼 정의 */
  columns: Array<DataTableColumn<T>>;
  /** 로딩 상태 */
  loading?: boolean;
  /** 빈 데이터 시 메시지 */
  emptyMessage?: string;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: T, index: number) => void;
  /** 페이지네이션 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
}

export const DataTable = <T,>({
  data,
  columns,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  pagination,
}: DataTableProps<T>) => {
  return <table>{/* ... */}</table>;
};

// ─── 패턴 2: ComponentPropsWithoutRef 확장 ───
type InputProps = ComponentPropsWithoutRef<'input'> & {
  /** 라벨 텍스트 */
  label?: string;
  /** 에러 메시지 */
  error?: string;
  /** 좌측 아이콘 */
  startIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, startIcon, ...rest }: InputProps, ref) => {
    return (
      <div>
        {label && <label>{label}</label>}
        <div>
          {startIcon}
          <input ref={ref} {...rest} />
        </div>
        {error && <span>{error}</span>}
      </div>
    );
  },
);

// ─── 패턴 3: memo 래핑 ───
type AvatarProps = {
  /** 이미지 URL */
  src?: string;
  /** 대체 텍스트 또는 이니셜 */
  alt: string;
  /** 크기 (px) */
  size?: 24 | 32 | 40 | 48 | 64;
  /** 모양 */
  shape?: 'circle' | 'square';
};

export const Avatar = memo(({
  src,
  alt,
  size = 40,
  shape = 'circle',
}: AvatarProps) => {
  return (
    <div style={{ width: size, height: size, borderRadius: shape === 'circle' ? '50%' : 4 }}>
      {src ? <img src={src} alt={alt} /> : <span>{alt[0]}</span>}
    </div>
  );
});

// ─── 패턴 4: 복합 타입 (union discriminator) ───
type AlertProps = {
  /** 알림 유형 */
  type: 'success' | 'info' | 'warning' | 'error';
  /** 메시지 */
  message: string;
  /** 상세 설명 */
  description?: string;
  /** 닫기 가능 여부 */
  closable?: boolean;
  /** 닫기 콜백 */
  onClose?: () => void;
  /** 좌측 아이콘 표시 여부 */
  showIcon?: boolean;
  /** 액션 버튼 */
  action?: ReactNode;
};

export function Alert({
  type,
  message,
  description,
  closable = false,
  onClose,
  showIcon = true,
  action,
}: AlertProps) {
  return (
    <div data-type={type}>
      {showIcon && <span>icon</span>}
      <div>
        <div>{message}</div>
        {description && <div>{description}</div>}
      </div>
      {action}
      {closable && <button onClick={onClose}>x</button>}
    </div>
  );
}
