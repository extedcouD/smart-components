import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartTextarea } from './SmartTextarea';

/** Focus the textarea with caret at end of value, the typical "user just typed" state. */
function focusAtEnd(ta: HTMLTextAreaElement) {
  ta.setSelectionRange(ta.value.length, ta.value.length);
  ta.focus();
  fireEvent.select(ta);
}

function Harness({
  initial = '',
  onAccept,
  context,
  debounceMs = 0,
  stream = false,
  completeImpl,
  streamImpl,
  stop,
}: {
  initial?: string;
  onAccept?: (acc: string, full: string) => void;
  context?: string;
  debounceMs?: number;
  stream?: boolean;
  completeImpl?: (req: { prompt: string }) => string | Promise<string>;
  streamImpl?: (req: { prompt: string }) => AsyncIterable<string>;
  stop?: string[];
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: completeImpl ?? ((req) => ` len=${req.prompt.length}`),
    stream: streamImpl,
  });
  return (
    <SmartProvider client={client}>
      <SmartTextarea
        value={v}
        onChange={setV}
        debounceMs={debounceMs}
        minChars={3}
        context={context}
        stream={stream}
        stop={stop}
        onAccept={onAccept}
        data-testid="ta"
      />
    </SmartProvider>
  );
}

describe('SmartTextarea', () => {
  it('renders a textarea', () => {
    render(<Harness />);
    expect(screen.getByTestId('ta')).toBeInTheDocument();
    expect(screen.getByTestId('ta').tagName).toBe('TEXTAREA');
  });

  it('does not fetch while unfocused', async () => {
    const complete = vi.fn().mockResolvedValue('xx');
    const client = createMockClient({ complete });
    function H() {
      const [v, setV] = useState('hello there');
      return (
        <SmartProvider client={client}>
          <SmartTextarea value={v} onChange={setV} minChars={3} debounceMs={0} />
        </SmartProvider>
      );
    }
    render(<H />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('shows ghost when focused with caret at end', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    focusAtEnd(screen.getByTestId('ta') as HTMLTextAreaElement);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=5/),
    );
  });

  it('hides ghost when caret is moved to middle', async () => {
    render(<Harness initial="hello world" debounceMs={0} />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    focusAtEnd(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=/),
    );
    ta.setSelectionRange(2, 2);
    fireEvent.select(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(''),
    );
  });

  it('ArrowRight accepts the suggestion', async () => {
    const onAccept = vi.fn();
    render(<Harness initial="hello" onAccept={onAccept} debounceMs={0} />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    focusAtEnd(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=5/),
    );
    await userEvent.keyboard('{ArrowRight}');
    expect(onAccept).toHaveBeenCalledWith(' len=5', 'hello len=5');
    expect(ta.value).toBe('hello len=5');
  });

  it('Escape dismisses the ghost; typing resumes', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    focusAtEnd(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=5/),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(''),
    );
    await userEvent.type(ta, '!');
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=6/),
    );
  });

  it('blur hides the ghost; re-focus restores it', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    focusAtEnd(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=5/),
    );
    ta.blur();
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(''),
    );
    focusAtEnd(ta);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/len=5/),
    );
  });

  it('feeds multi-line value to the prompt verbatim and forwards stop', async () => {
    const complete = vi.fn().mockResolvedValue(' more');
    const client = createMockClient({ complete });
    function H() {
      const [v, setV] = useState('line one\nline two');
      return (
        <SmartProvider client={client}>
          <SmartTextarea value={v} onChange={setV} minChars={3} debounceMs={0} />
        </SmartProvider>
      );
    }
    render(<H />);
    focusAtEnd(screen.getByRole('textbox') as HTMLTextAreaElement);
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const req = complete.mock.calls[0]![0];
    expect(req.prompt).toBe('line one\nline two');
    expect(req.stop).toEqual(['\n\n']);
  });

  it('applies ghostClassName and ghostStyle to the ghost span', async () => {
    function H() {
      const [v, setV] = useState('hello');
      return (
        <SmartProvider client={createMockClient({ complete: () => ' world' })}>
          <SmartTextarea
            value={v}
            onChange={setV}
            debounceMs={0}
            minChars={3}
            ghostClassName="my-ghost"
            ghostStyle={{ color: 'rgb(255, 0, 0)', fontStyle: 'italic' }}
            data-testid="ta"
          />
        </SmartProvider>
      );
    }
    render(<H />);
    focusAtEnd(screen.getByTestId('ta') as HTMLTextAreaElement);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/world/),
    );
    const ghost = screen.getByTestId('smart-textarea-ghost');
    expect(ghost).toHaveClass('my-ghost');
    expect(ghost).toHaveStyle({ color: 'rgb(255, 0, 0)', fontStyle: 'italic' });
  });

  it('honors disableAI', async () => {
    const complete = vi.fn().mockResolvedValue('xx');
    const client = createMockClient({ complete });
    function H() {
      const [v, setV] = useState('hello there');
      return (
        <SmartProvider client={client}>
          <SmartTextarea value={v} onChange={setV} disableAI debounceMs={0} />
        </SmartProvider>
      );
    }
    render(<H />);
    focusAtEnd(screen.getByRole('textbox') as HTMLTextAreaElement);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('streaming renders partial text as it arrives', async () => {
    async function* streamImpl() {
      for (const ch of [' on', 'ce', ' upo', 'n']) {
        await new Promise((r) => setTimeout(r, 5));
        yield ch;
      }
    }
    render(<Harness initial="hello" debounceMs={0} stream streamImpl={streamImpl} />);
    focusAtEnd(screen.getByTestId('ta') as HTMLTextAreaElement);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/on/),
    );
    await waitFor(() =>
      expect(screen.getByTestId('smart-textarea-ghost')).toHaveTextContent(/once upon/),
    );
  });
});
