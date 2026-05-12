import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartTextbox } from './SmartTextbox';

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

  it('fetches a completion after typing and shows ghost', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
  });

  it('Tab accepts the ghost suggestion', async () => {
    const onAccept = vi.fn();
    render(<Harness initial="hello" onAccept={onAccept} debounceMs={0} />);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    const input = screen.getByTestId('input') as HTMLInputElement;
    input.focus();
    await userEvent.tab();
    expect(onAccept).toHaveBeenCalledWith(' 5', 'hello 5');
    expect(input.value).toBe('hello 5');
  });

  it('Escape dismisses the ghost', async () => {
    render(<Harness initial="hello" debounceMs={0} />);
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(/5/));
    const input = screen.getByTestId('input');
    input.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByTestId('smart-textbox-ghost')).toHaveTextContent(''));
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
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
