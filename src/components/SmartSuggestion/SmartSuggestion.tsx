import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useSuggestionList } from '../../hooks/useSuggestionList';
import styles from './SmartSuggestion.module.css';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'onChange'
  | 'defaultValue'
  | 'onSelect'
  | 'role'
  | 'aria-autocomplete'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-activedescendant'
>;

export interface SmartSuggestionRenderItemArgs {
  active: boolean;
  index: number;
}

export interface SmartSuggestionProps extends NativeInputProps {
  /** Current input value (controlled). */
  value: string;
  /** Called with the new value on user input. */
  onChange: (value: string) => void;
  /** Called when the user selects a suggestion (Enter, click, or via keyboard). */
  onSelect?: (item: string) => void;
  /** Optional context string included in the prompt. */
  context?: string;
  /** Max suggestions requested. Default: 5. */
  count?: number;
  /** Debounce window in ms. Default: 300. */
  debounceMs?: number;
  /** Minimum chars before suggestions fetch. Default: 1. */
  minChars?: number;
  /** Disable AI calls. Default: false. */
  disableAI?: boolean;
  /** Render override for each item. */
  renderItem?: (item: string, args: SmartSuggestionRenderItemArgs) => ReactNode;
  /** Render override when results are empty (after loading). */
  renderEmpty?: () => ReactNode;
  /** Render override while loading. */
  renderLoading?: () => ReactNode;
  /** Class name on the outer wrapper. */
  wrapperClassName?: string;
  /** Class name on the listbox. */
  listClassName?: string;
  /** Class name on each item. */
  itemClassName?: string;
}

export function SmartSuggestion({
  value,
  onChange,
  onSelect,
  context,
  count = 5,
  debounceMs = 300,
  minChars = 1,
  disableAI = false,
  renderItem,
  renderEmpty,
  renderLoading,
  wrapperClassName,
  listClassName,
  itemClassName,
  className,
  onKeyDown,
  onBlur,
  ...rest
}: SmartSuggestionProps) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [rawActiveIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { items, status } = useSuggestionList({
    value,
    context,
    count,
    debounceMs,
    minChars,
    enabled: !disableAI && open,
  });

  const activeIndex = rawActiveIndex >= items.length ? items.length - 1 : rawActiveIndex;

  useEffect(() => {
    if (activeIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLLIElement>(`#${CSS.escape(listId)}-opt-${activeIndex}`);
    if (!item) return;
    // Adjust only the list's own scroll — never the document — so the
    // surrounding page doesn't shift when active item changes.
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    if (itemTop < list.scrollTop) {
      list.scrollTop = itemTop;
    } else if (itemBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = itemBottom - list.clientHeight;
    }
  }, [activeIndex, listId]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const select = useCallback(
    (item: string) => {
      onChange(item);
      onSelect?.(item);
      close();
    },
    [onChange, onSelect, close],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        setOpen(true);
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (items.length === 0 ? -1 : (i + 1) % items.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (items.length === 0 ? -1 : (i - 1 + items.length) % items.length));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        select(items[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      onKeyDown?.(e);
    },
    [open, items, activeIndex, select, close, onKeyDown],
  );

  const listVisible = open && (items.length > 0 || status === 'loading');

  const wrapperClass = [styles.root, wrapperClassName].filter(Boolean).join(' ');
  const inputClass = [styles.input, className].filter(Boolean).join(' ');
  const listClass = [styles.list, listVisible ? '' : styles.listHidden, listClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass}>
      <input
        className={inputClass}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          blurTimer.current = setTimeout(() => close(), 100);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={listVisible}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
        {...rest}
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        className={listClass}
        onMouseDown={(e) => {
          // prevent the input blur from closing before click registers
          e.preventDefault();
          if (blurTimer.current) clearTimeout(blurTimer.current);
        }}
      >
        {status === 'loading' && items.length === 0 ? (
          <li className={itemClassName} aria-busy="true">
            {renderLoading ? renderLoading() : 'Loading…'}
          </li>
        ) : items.length === 0 && status === 'idle' ? (
          renderEmpty ? <li className={itemClassName}>{renderEmpty()}</li> : null
        ) : (
          items.map((item, i) => {
            const active = i === activeIndex;
            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard handling lives on the combobox input per ARIA combobox pattern
              <li
                key={`${i}-${item}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={active}
                className={[styles.item, itemClassName].filter(Boolean).join(' ')}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(item)}
              >
                {renderItem ? renderItem(item, { active, index: i }) : item}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
