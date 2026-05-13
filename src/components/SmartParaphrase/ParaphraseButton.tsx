import type { CSSProperties, ReactNode } from 'react';
import type { RewriteStatus } from '../../hooks/useRewrite';
import styles from './SmartParaphrase.module.css';

export interface ParaphraseButtonRenderArgs {
  onClick: () => void;
  status: RewriteStatus;
  disabled: boolean;
}

interface ParaphraseButtonProps extends ParaphraseButtonRenderArgs {
  position: 'box' | 'area';
  icon?: ReactNode;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  renderButton?: (args: ParaphraseButtonRenderArgs) => ReactNode;
  testId?: string;
}

const DefaultSparkleIcon = (
  <svg
    className={styles.icon}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 1.5 9.2 5 12.5 6.2 9.2 7.4 8 11 6.8 7.4 3.5 6.2 6.8 5 8 1.5Z" />
    <path d="M12.5 10.5 13 12l1.5.5L13 13l-.5 1.5L12 13l-1.5-.5L12 12l.5-1.5Z" />
  </svg>
);

export function ParaphraseButton({
  position,
  icon,
  status,
  disabled,
  onClick,
  ariaLabel,
  className,
  style,
  renderButton,
  testId,
}: ParaphraseButtonProps) {
  if (renderButton) {
    return <>{renderButton({ onClick, status, disabled })}</>;
  }

  const loading = status === 'loading';
  return (
    <button
      type="button"
      className={[
        styles.button,
        position === 'box' ? styles.buttonBox : styles.buttonArea,
        loading ? styles.buttonLoading : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      data-testid={testId}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : (icon ?? DefaultSparkleIcon)}
    </button>
  );
}
