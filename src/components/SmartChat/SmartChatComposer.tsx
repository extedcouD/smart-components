import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import type { ChatContentBlock, ChatImageSource } from '../../provider/chat-types';
import styles from './SmartChatComposer.module.css';

export interface SmartChatComposerHandle {
  /** Programmatically send the current draft. */
  send: () => void;
  /** Focus the textarea. */
  focus: () => void;
  /** Clear the draft and any attached images. */
  clear: () => void;
  /** Attach an image (base64) to the next send. */
  attachImage: (source: ChatImageSource) => void;
}

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'onKeyDown' | 'onSubmit'
>;

export interface SmartChatComposerProps extends NativeTextareaProps {
  /** Called when the user submits (Enter or Send button). */
  onSend: (input: string | ChatContentBlock[]) => void;
  /** Disable input + send. Use while a response is streaming. */
  disabled?: boolean;
  /** Key that submits. Default: 'Enter' (Shift+Enter inserts a newline). */
  sendKey?: string;
  /** Don't auto-grow; render a fixed-height textarea. */
  fixedHeight?: boolean;
  /** Cap on auto-grow height (px). Default: 240. */
  maxHeight?: number;
  /** Show a default attach button + hidden file input for images. */
  enableImageUpload?: boolean;
  /** File `accept` attribute for the image picker. Default: 'image/*'. */
  attachAccept?: string;
  /** Render-prop override for the send button. */
  renderSendButton?: (args: { send: () => void; disabled: boolean }) => ReactNode;
  /** Render-prop override for the attach button (only used with enableImageUpload). */
  renderAttachButton?: (args: { open: () => void; disabled: boolean }) => ReactNode;
  /** Render-prop override for the image preview row. */
  renderPreview?: (args: { images: ChatImageSource[]; remove: (i: number) => void }) => ReactNode;
  /** Class for the wrapper. */
  wrapperClassName?: string;
  /** Style for the wrapper. */
  wrapperStyle?: CSSProperties;
}

const DEFAULT_MAX_HEIGHT = 240;

function readFileAsBase64(file: File): Promise<ChatImageSource> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result ?? '');
      const match = /^data:([^;]+);base64,(.*)$/.exec(result);
      if (!match) {
        reject(new Error('[smart-components/SmartChatComposer] failed to read image'));
        return;
      }
      resolve({ kind: 'base64', data: match[2]!, mediaType: match[1] });
    };
    r.onerror = () => reject(r.error ?? new Error('FileReader error'));
    r.readAsDataURL(file);
  });
}

/**
 * Drop-in chat composer. Pairs with `useChat().send` or `<SmartChat>`'s
 * `send` render-prop argument.
 *
 * - Enter submits; Shift+Enter inserts a newline. Customize with `sendKey`.
 * - IME composition (Gboard, kana input) is respected — Enter during
 *   composition commits the IME instead of sending.
 * - Auto-resizes by default; cap with `maxHeight` or set `fixedHeight`.
 * - Pass `enableImageUpload` to render a built-in attach button.
 *
 * iOS note: text inputs with font-size < 16px trigger zoom-on-focus. Set
 * `style={{ fontSize: 16 }}` (or a class) when targeting iOS Safari.
 */
export const SmartChatComposer = forwardRef<SmartChatComposerHandle, SmartChatComposerProps>(
  function SmartChatComposer(
    {
      onSend,
      disabled = false,
      sendKey = 'Enter',
      fixedHeight = false,
      maxHeight = DEFAULT_MAX_HEIGHT,
      enableImageUpload = false,
      attachAccept = 'image/*',
      placeholder = 'Message…',
      renderSendButton,
      renderAttachButton,
      renderPreview,
      wrapperClassName,
      wrapperStyle,
      className,
      ...rest
    },
    forwardedRef,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [draft, setDraft] = useState('');
    const [images, setImages] = useState<ChatImageSource[]>([]);
    const composingRef = useRef(false);

    const doSend = useCallback(() => {
      if (disabled) return;
      const trimmed = draft.trim();
      if (!trimmed && images.length === 0) return;
      if (images.length === 0) {
        onSend(trimmed);
      } else {
        const blocks: ChatContentBlock[] = [
          ...images.map((src): ChatContentBlock => ({ type: 'image', source: src })),
          ...(trimmed ? [{ type: 'text' as const, text: trimmed }] : []),
        ];
        onSend(blocks);
      }
      setDraft('');
      setImages([]);
    }, [disabled, draft, images, onSend]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (composingRef.current || e.nativeEvent.isComposing) return;
        if (e.key === sendKey && !e.shiftKey) {
          e.preventDefault();
          doSend();
        }
      },
      [sendKey, doSend],
    );

    // Auto-resize.
    useLayoutEffect(() => {
      if (fixedHeight) return;
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const next = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [draft, fixedHeight, maxHeight, images.length]);

    const openPicker = useCallback(() => {
      if (disabled) return;
      fileInputRef.current?.click();
    }, [disabled]);

    const attachImage = useCallback((source: ChatImageSource) => {
      setImages((prev) => [...prev, source]);
    }, []);

    const handleFiles = useCallback(async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const next: ChatImageSource[] = [];
      for (const f of Array.from(files)) {
        try {
          next.push(await readFileAsBase64(f));
        } catch {
          // ignore individual failures
        }
      }
      setImages((prev) => [...prev, ...next]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeImage = useCallback((i: number) => {
      setImages((prev) => prev.filter((_, j) => j !== i));
    }, []);

    useImperativeHandle(
      forwardedRef,
      () => ({
        send: doSend,
        focus: () => textareaRef.current?.focus(),
        clear: () => {
          setDraft('');
          setImages([]);
        },
        attachImage,
      }),
      [doSend, attachImage],
    );

    const previewNode =
      images.length > 0
        ? renderPreview
          ? renderPreview({ images, remove: removeImage })
          : (
            <div className={styles.preview}>
              {images.map((img, i) => (
                <span key={i} className={styles.previewItem}>
                  <img
                    src={img.kind === 'url' ? img.data : `data:${img.mediaType ?? 'image/png'};base64,${img.data}`}
                    alt=""
                    className={styles.previewImg}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )
        : null;

    const attachNode = enableImageUpload
      ? renderAttachButton
        ? renderAttachButton({ open: openPicker, disabled })
        : (
          <button type="button" onClick={openPicker} disabled={disabled} aria-label="Attach image">
            📎
          </button>
        )
      : null;

    const sendNode = renderSendButton
      ? renderSendButton({ send: doSend, disabled: disabled || (draft.trim().length === 0 && images.length === 0) })
      : (
        <button
          type="button"
          onClick={doSend}
          disabled={disabled || (draft.trim().length === 0 && images.length === 0)}
        >
          Send
        </button>
      );

    return (
      <div className={[styles.root, wrapperClassName].filter(Boolean).join(' ')} style={wrapperStyle}>
        {enableImageUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept={attachAccept}
            multiple
            className={styles.attachInput}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        )}
        {previewNode}
        {attachNode}
        <textarea
          ref={textareaRef}
          className={[styles.textarea, className].filter(Boolean).join(' ')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          placeholder={placeholder}
          disabled={disabled}
          rows={fixedHeight ? rest.rows ?? 3 : 1}
          {...rest}
        />
        {sendNode}
      </div>
    );
  },
);
