import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import styles from './GhostOverlay.module.css';

/** CSS properties the mirror copies from the target so its text lays out identically. */
const MIRROR_SYNC_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'font-feature-settings',
  'font-kerning',
  'font-variant-ligatures',
  'font-variant-numeric',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'tab-size',
  'text-indent',
  'text-align',
  'text-transform',
  'text-rendering',
  'direction',
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
  /** When provided, tapping/clicking the ghost itself accepts the suggestion.
   *  This is the primary mobile accept gesture — no extra button needed. */
  onAccept?: () => void;
  /** Optional render-prop for the ghost. */
  renderGhost?: (suggestion: string) => ReactNode;
  /** Class name applied to the ghost span. Composed with default styles. */
  ghostClassName?: string;
  /** Inline style applied to the ghost span. Overrides default styles (e.g. opacity). */
  ghostStyle?: CSSProperties;
  /** data-testid forwarded to the ghost span. */
  testId?: string;
}

/**
 * Single ghost-overlay primitive used by both SmartTextbox and SmartTextarea.
 *
 * Renders an `aria-hidden` mirror that:
 *  - Mirrors the target's computed box model so the ghost lands at the same
 *    coordinates the next character would render at.
 *  - Holds an invisible copy of `value` followed by the visible ghost span,
 *    so the ghost naturally trails the user's last character.
 *  - Syncs scroll with the target.
 *
 * When `onAccept` is wired, the ghost span itself becomes tappable: tap the
 * suggestion to accept it. This is the primary mobile interaction — soft
 * keyboards lack ArrowRight/Tab/Escape, so the visible suggestion has to be
 * the accept target.
 */
export function GhostOverlay({
  targetRef,
  value,
  suggestion,
  visible,
  onAccept,
  renderGhost,
  ghostClassName,
  ghostStyle,
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
    m.style.borderColor = 'transparent';
    // Browsers (e.g. iOS Safari, Samsung Internet in desktop mode) auto-inflate
    // text in non-form elements via text-size-adjust. The textarea/input doesn't
    // inflate, so the mirror would render at a different font size than the
    // target — ghost lands at the wrong x/y. Disabling adjust on the mirror
    // makes both render at the same logical size.
    m.style.setProperty('-webkit-text-size-adjust', 'none');
    m.style.setProperty('text-size-adjust', 'none');
  });

  // Scroll sync: keep the ghost anchored to the value's end as the target scrolls.
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

  const tappable = visible && !!onAccept;

  return (
    <div ref={mirrorRef} className={styles.mirror} aria-hidden="true">
      <span style={{ visibility: 'hidden' }}>{value}</span>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events --
          The mirror is aria-hidden (decorative); screen-reader users accept via
          the underlying input's keyboard `acceptKey`. The tap handler exists
          solely so sighted touch users can commit the visible ghost. */}
      <span
        className={[
          visible ? styles.ghost : styles.ghostHidden,
          tappable ? styles.ghostTappable : '',
          ghostClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        style={ghostStyle}
        data-testid={testId}
        // preventDefault on pointerdown keeps focus on the input (and the
        // mobile keyboard up); the click handler commits the ghost.
        onPointerDown={tappable ? (e) => e.preventDefault() : undefined}
        onClick={tappable ? onAccept : undefined}
      >
        {visible ? (renderGhost ? renderGhost(suggestion) : suggestion) : null}
      </span>
    </div>
  );
}
