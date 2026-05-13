import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import {
  SmartParaphraseArea,
  type SmartParaphraseAreaHandle,
} from './SmartParaphraseArea';

const BUTTON_TID = 'smart-paraphrase-area-button';

function Harness({
  initial = 'the original paragraph that needs a rewrite.',
  completeImpl,
  ...rest
}: {
  initial?: string;
  completeImpl?: (req: { prompt: string; system?: string }) => string | Promise<string>;
  context?: string;
  instruction?: string;
  disableAI?: boolean;
  autoResize?: boolean;
  icon?: React.ReactNode;
  renderButton?: (args: {
    onClick: () => void;
    status: string;
    disabled: boolean;
  }) => React.ReactNode;
  onRewriteAccept?: (r: string) => void;
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: completeImpl ?? (() => 'REWRITTEN_MULTILINE\nSECOND LINE'),
  });
  return (
    <SmartProvider client={client}>
      <SmartParaphraseArea value={v} onChange={setV} data-testid="ta" {...rest} />
      <div data-testid="value">{v}</div>
    </SmartProvider>
  );
}

describe('SmartParaphraseArea', () => {
  it('renders a textarea and a button', () => {
    render(<Harness />);
    expect(screen.getByTestId('ta')).toBeInTheDocument();
    expect(screen.getByTestId(BUTTON_TID)).toBeInTheDocument();
  });

  it('click button → rewrite replaces multiline value', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() =>
      expect(screen.getByTestId('value')).toHaveTextContent('REWRITTEN_MULTILINE'),
    );
    expect((screen.getByTestId('ta') as HTMLTextAreaElement).value).toBe(
      'REWRITTEN_MULTILINE\nSECOND LINE',
    );
  });

  it('button disabled when value is empty', () => {
    render(<Harness initial="" />);
    expect(screen.getByTestId(BUTTON_TID)).toBeDisabled();
  });

  it('custom icon renders inside the button', () => {
    render(<Harness icon={<span data-testid="i">✦</span>} />);
    expect(screen.getByTestId('i')).toBeInTheDocument();
  });

  it('renderButton fully overrides the default button', () => {
    render(
      <Harness
        renderButton={({ onClick }) => (
          <button data-testid="custom" onClick={onClick}>
            custom
          </button>
        )}
      />,
    );
    expect(screen.queryByTestId(BUTTON_TID)).toBeNull();
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('disableAI hides the button', () => {
    render(<Harness disableAI />);
    expect(screen.queryByTestId(BUTTON_TID)).toBeNull();
  });

  it('imperative ref.rewrite() works and ref.cancel() aborts in-flight', async () => {
    let resolveFn: (s: string) => void = () => {};
    const complete = vi
      .fn()
      .mockImplementation(() => new Promise<string>((r) => (resolveFn = r)));

    function H() {
      const ref = useRef<SmartParaphraseAreaHandle>(null);
      const [v, setV] = useState('hello world');
      const client = createMockClient({ complete });
      return (
        <SmartProvider client={client}>
          <SmartParaphraseArea ref={ref} value={v} onChange={setV} />
          <button data-testid="go" onClick={() => ref.current?.rewrite()}>
            go
          </button>
          <button data-testid="cancel" onClick={() => ref.current?.cancel()}>
            cancel
          </button>
          <div data-testid="value">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.click(screen.getByTestId('go'));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId('cancel'));
    resolveFn('TOO_LATE');
    // value should remain unchanged
    expect(screen.getByTestId('value')).toHaveTextContent('hello world');
  });

  it('autoResize sets textarea height after rewrite', async () => {
    render(<Harness autoResize completeImpl={() => 'line\n'.repeat(5)} />);
    const ta = screen.getByTestId('ta') as HTMLTextAreaElement;
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(ta.value).toMatch(/line\n/));
    expect(ta.style.height).not.toBe('');
  });

  it('pointer-event tap on button triggers rewrite', async () => {
    render(<Harness />);
    const btn = screen.getByTestId(BUTTON_TID);
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId('value')).toHaveTextContent('REWRITTEN_MULTILINE'),
    );
  });

  it('passes instruction and context into the prompt', async () => {
    const complete = vi.fn().mockResolvedValue('OK');
    render(
      <Harness
        initial="some long text"
        completeImpl={complete}
        instruction="translate to french"
        context="formal correspondence"
      />,
    );
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const req = complete.mock.calls[0]![0];
    expect(req.prompt).toMatch(/Instruction: translate to french/);
    expect(req.system).toMatch(/Context: formal correspondence/);
  });
});
