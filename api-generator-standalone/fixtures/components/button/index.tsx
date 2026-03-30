import type { ButtonProps } from './types';

export const Button = ({
  children,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  onClick,
}: ButtonProps) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ width: fullWidth ? '100%' : 'auto' }}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  );
};
