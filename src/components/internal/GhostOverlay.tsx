import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import styles from './GhostOverlay.module.css';

/** CSS properties the mirror copies from the target so its text lays out identically. */
const MIRROR_SYNC_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'tab-size',
  'text-indent',
  'text-transform',
  'white-space',
  'word-break',
  'overflow-wrap',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'box-sizing',
] as const;

export interface GhostOverlayProps {
  /** The text field whose box model the mirror should match. */
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  /** The full current value of the target (used as invisible spacer). */
  value: string;
  /** The ghost continuation to render after the value. */
  suggestion: string;
  /** Whether to paint the ghost. When false the mirror still mounts (so layout
   *  stays in sync) but the ghost span is hidden. */
  visible: boolean;
  /** Optional render-prop for the ghost. */
  renderGhost?: (suggestion: string) => ReactNode;
  /** data-testid forwarded to the mirror. */
  testId?: string;
}

/**
 * Single ghost-overlay primitive used by both SmartTextbox and SmartTextarea.
 *
 * Renders an `aria-hidden` mirror that:
 *  - Mirrors the target's computed box model (padding, border-width, font, etc.)
 *    so text in the mirror lays out at the same coordinates as text in the target.
 *  - Contains an invisible copy of `value` followed by the (visible) ghost span,
 *    so the ghost naturally lands after the user's last character — even when
 *    the value wraps across lines.
 *  - Syncs scroll position with the target.
 */
export function GhostOverlay({
  targetRef,
  value,
  suggestion,
  visible,
  renderGhost,
  testId,
}: GhostOverlayProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Copy computed layout properties from target → mirror after every render.
  useLayoutEffect(() => {
    const t = targetRef.current;
    const m = mirrorRef.current;
    if (!t || !m) return;
    const cs = window.getComputedStyle(t);
    for (const prop of MIRROR_SYNC_PROPS) {
      m.style.setProperty(prop, cs.getPropertyValue(prop));
    }
    // Mirror sits behind the target; its border occupies the same box space
    // (via border-*-width above) but must not paint over the real border on top.
    m.style.borderColor = 'transparent';
  });

  // Scroll sync: when target scrolls (textarea vertically, input horizontally),
  // the mirror follows so the ghost stays anchored to the value's end.
  useEffect(() => {
    const t = targetRef.current;
    const m = mirrorRef.current;
    if (!t || !m) return;
    const sync = () => {
      m.scrollTop = t.scrollTop;
      m.scrollLeft = t.scrollLeft;
    };
    sync();
    t.addEventListener('scroll', sync);
    return () => t.removeEventListener('scroll', sync);
  }, [targetRef]);

  return (
    <div ref={mirrorRef} className={styles.mirror} aria-hidden="true">
      <span style={{ visibility: 'hidden' }}>{value}</span>
      <span className={visible ? styles.ghost : styles.ghostHidden} data-testid={testId}>
        {visible ? (renderGhost ? renderGhost(suggestion) : suggestion) : null}
      </span>
    </div>
  );
}
