import type { ModalProps } from './types';

export const Modal = ({
  open,
  onClose,
  title,
  children,
  width = 480,
  closeOnOverlayClick = true,
  style,
  footer,
}: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div className="modal-content" style={{ width, ...style }}>
        {title && <div className="modal-header">{title}</div>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
