import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartTextbox } from './SmartTextbox';

function focusAtEnd(el: HTMLInputElement) {
  el.setSelectionRange(el.value.length, el.value.length);
  el.focus();
  fireEvent.select(el);
}

function Harness({
  initial = '',
  onAccept,
  context,
  debounceMs = 0,
}: {
  initial?: string;
  onAccept?: (acc: string, full: string) => void;
  context?: string;
  debounceMs?: number;
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: (req) => ` ${req.prompt.length}`,
  });
  return (
    <SmartProvider client={client}>
      <SmartTextbox
        value={v}
        onChange={setV}
        debounceMs={debounceMs}
        minChars={3}
        context={context}
        onAccept={onAccept}
        data-testid="input"
      />
    </SmartProvider>
  );
}

describe('SmartTextbox', () => {
  it('renders an input', () => {
    render(<Harness />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('fetches a completion and shows ghost when focused with caret at end', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    focusAtEnd(screen.getByTestId('input') as HTMLInputElement);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
  });

  it('does not fetch while unfocused', async () => {
    const complete = vi.fn().mockResolvedValue('xx');
    const client = createMockClient({ complete });
    function H() {
      const [v, setV] = useState('hello');
      return (
        <SmartProvider client={client}>
          <SmartTextbox value={v} onChange={setV} minChars={3} debounceMs={0} />
        </SmartProvider>
      );
    }
    render(<H />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it('ArrowRight accepts the ghost suggestion when caret is at end', async () => {
    const onAccept = vi.fn();
    render(<Harness initial="hello" onAccept={onAccept} debounceMs={0} />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    focusAtEnd(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    await userEvent.keyboard('{ArrowRight}');
    expect(onAccept).toHaveBeenCalledWith(' 5', 'hello 5');
    expect(input.value).toBe('hello 5');
  });

  it('hides ghost when caret moves to the middle', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    focusAtEnd(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    input.setSelectionRange(2, 2);
    fireEvent.select(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(''));
  });

  it('Escape dismisses the ghost', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    focusAtEnd(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(''));
  });

  it('blur hides ghost and re-focus restores it', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    focusAtEnd(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    input.blur();
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(''));
    focusAtEnd(input);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
  });

  it('tap-on-ghost still commits even if blur fires before click (Samsung Internet)', async () => {
    const accepted = vi.fn();
    function H() {
      const [v, setV] = useState('hello');
      return (
        <SmartProvider client={createMockClient({ complete: () => ' world' })}>
          <SmartTextbox
            value={v}
            onChange={setV}
            onAccept={accepted}
            debounceMs={0}
            minChars={3}
            data-testid="input"
          />
          <div data-testid="val">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    focusAtEnd(input);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/world/),
    );
    // Simulate Samsung Internet: focus is stolen before click. The ghost
    // becomes visually hidden (ghostVisible flips to false) but the underlying
    // suggestion stays in state so the click handler can still commit.
    const ghost = screen.getByTestId('smart-textbox-ghost');
    fireEvent.pointerDown(ghost);
    input.blur();
    fireEvent.click(ghost);
    expect(accepted).toHaveBeenCalledWith(' world', 'hello world');
    expect(screen.getByTestId('val')).toHaveTextContent('hello world');
  });

  it('tapping the ghost itself accepts the suggestion (mobile path)', async () => {
    const accepted = vi.fn();
    function H() {
      const [v, setV] = useState('hello');
      return (
        <SmartProvider client={createMockClient({ complete: () => ' world' })}>
          <SmartTextbox
            value={v}
            onChange={setV}
            onAccept={accepted}
            debounceMs={0}
            minChars={3}
            data-testid="input"
          />
          <div data-testid="val">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    focusAtEnd(screen.getByTestId('input') as HTMLInputElement);
    await waitFor(() =>
      expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/world/),
    );
    // pointerdown.preventDefault keeps focus on the input (so the ghost survives),
    // then click commits — this is what tapping the visible ghost does on a phone.
    const ghost = screen.getByTestId('smart-textbox-ghost');
    fireEvent.pointerDown(ghost);
    fireEvent.click(ghost);
    expect(accepted).toHaveBeenCalledWith(' world', 'hello world');
    expect(screen.getByTestId('val')).toHaveTextContent('hello world');
  });

  it('does not fetch below minChars', async () => {
    const complete = vi.fn().mockResolvedValue('xx');
    const client = createMockClient({ complete });
    function H() {
      const [v, setV] = useState('hi');
      return (
        <SmartProvider client={client}>
          <SmartTextbox value={v} onChange={setV} minChars={3} debounceMs={0} />
        </SmartProvider>
      );
    }
    render(<H />);
    focusAtEnd(screen.getByRole('textbox') as HTMLInputElement);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
