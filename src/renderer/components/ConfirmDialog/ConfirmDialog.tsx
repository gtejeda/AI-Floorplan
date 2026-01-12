import React from 'react';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * Reusable confirmation dialog for destructive actions
 * @example
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Delete Project"
 *   message="Are you sure you want to delete this project? This action cannot be undone."
 *   confirmLabel="Delete"
 *   cancelLabel="Cancel"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 *   variant="danger"
 * />
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'confirm-dialog-danger',
    warning: 'confirm-dialog-warning',
    info: 'confirm-dialog-info'
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={handleOverlayClick}>
      <div className={`confirm-dialog ${variantClasses[variant]}`}>
        <div className="confirm-dialog-header">
          <h3>{title}</h3>
        </div>

        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>

        <div className="confirm-dialog-footer">
          <button
            className="cancel-button"
            onClick={handleCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-button ${variant}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
