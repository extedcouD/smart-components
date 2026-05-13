import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import {
  SmartParaphraseBox,
  type SmartParaphraseBoxHandle,
} from './SmartParaphraseBox';

const BUTTON_TID = 'smart-paraphrase-box-button';

function Harness({
  initial = 'the original text',
  completeImpl,
  ...rest
}: {
  initial?: string;
  completeImpl?: (req: { prompt: string; system?: string }) => string | Promise<string>;
  context?: string;
  instruction?: string;
  disableAI?: boolean;
  icon?: React.ReactNode;
  renderButton?: (args: {
    onClick: () => void;
    status: string;
    disabled: boolean;
  }) => React.ReactNode;
  buttonAriaLabel?: string;
  onRewriteStart?: () => void;
  onRewriteAccept?: (r: string) => void;
  onRewriteError?: (e: Error) => void;
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: completeImpl ?? (() => 'REWRITTEN_VALUE'),
  });
  return (
    <SmartProvider client={client}>
      <SmartParaphraseBox value={v} onChange={setV} data-testid="input" {...rest} />
      <div data-testid="value">{v}</div>
    </SmartProvider>
  );
}

describe('SmartParaphraseBox', () => {
  it('renders an input and a button', () => {
    render(<Harness />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId(BUTTON_TID)).toBeInTheDocument();
  });

  it('click button → rewrite replaces value via onChange', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('REWRITTEN_VALUE'));
    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('REWRITTEN_VALUE');
  });

  it('button disabled when value is empty', () => {
    render(<Harness initial="" />);
    expect(screen.getByTestId(BUTTON_TID)).toBeDisabled();
  });

  it('button disabled and aria-busy while loading', async () => {
    let resolveFn: (s: string) => void = () => {};
    const complete = () => new Promise<string>((r) => (resolveFn = r));
    render(<Harness completeImpl={complete} />);
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(screen.getByTestId(BUTTON_TID)).toBeDisabled());
    expect(screen.getByTestId(BUTTON_TID)).toHaveAttribute('aria-busy', 'true');
    resolveFn('DONE');
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('DONE'));
  });

  it('renders a custom icon', () => {
    render(<Harness icon={<span data-testid="my-icon">★</span>} />);
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('renderButton fully overrides the default button', () => {
    render(
      <Harness
        renderButton={({ onClick, status }) => (
          <button data-testid="custom-btn" onClick={onClick}>
            custom-{status}
          </button>
        )}
      />,
    );
    expect(screen.queryByTestId(BUTTON_TID)).toBeNull();
    expect(screen.getByTestId('custom-btn')).toHaveTextContent('custom-idle');
  });

  it('disableAI hides the button and ref.rewrite() is a no-op', async () => {
    const complete = vi.fn().mockResolvedValue('SHOULD_NOT_FIRE');
    function H() {
      const ref = useRef<SmartParaphraseBoxHandle>(null);
      const [v, setV] = useState('hello');
      const client = createMockClient({ complete });
      return (
        <SmartProvider client={client}>
          <SmartParaphraseBox ref={ref} value={v} onChange={setV} disableAI />
          <button data-testid="trigger" onClick={() => ref.current?.rewrite()}>
            trigger
          </button>
          <div data-testid="value">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    expect(screen.queryByTestId(BUTTON_TID)).toBeNull();
    await userEvent.click(screen.getByTestId('trigger'));
    expect(complete).not.toHaveBeenCalled();
  });

  it('passes instruction and context into the prompt', async () => {
    const complete = vi.fn().mockResolvedValue('OK');
    render(
      <Harness
        initial="some text"
        completeImpl={complete}
        instruction="Make it punchy"
        context="news headline style"
      />,
    );
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const req = complete.mock.calls[0]![0];
    expect(req.prompt).toMatch(/Instruction: Make it punchy/);
    expect(req.prompt).toMatch(/some text/);
    expect(req.system).toMatch(/Context: news headline style/);
  });

  it('fires onRewriteStart, onRewriteAccept lifecycle callbacks', async () => {
    const onRewriteStart = vi.fn();
    const onRewriteAccept = vi.fn();
    render(
      <Harness
        completeImpl={() => 'PARA'}
        onRewriteStart={onRewriteStart}
        onRewriteAccept={onRewriteAccept}
      />,
    );
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(onRewriteAccept).toHaveBeenCalledWith('PARA'));
    expect(onRewriteStart).toHaveBeenCalled();
  });

  it('fires onRewriteError when the underlying call throws', async () => {
    const onRewriteError = vi.fn();
    render(
      <Harness
        completeImpl={() => {
          throw new Error('boom');
        }}
        onRewriteError={onRewriteError}
      />,
    );
    await userEvent.click(screen.getByTestId(BUTTON_TID));
    await waitFor(() => expect(onRewriteError).toHaveBeenCalled());
    expect(onRewriteError.mock.calls[0]![0].message).toBe('boom');
  });

  it('imperative ref.rewrite() triggers a rewrite', async () => {
    function H() {
      const ref = useRef<SmartParaphraseBoxHandle>(null);
      const [v, setV] = useState('initial');
      const client = createMockClient({ complete: () => 'VIA_REF' });
      return (
        <SmartProvider client={client}>
          <SmartParaphraseBox ref={ref} value={v} onChange={setV} />
          <button data-testid="go" onClick={() => ref.current?.rewrite()}>
            go
          </button>
          <div data-testid="value">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.click(screen.getByTestId('go'));
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('VIA_REF'));
  });

  it('pointer-event tap on button triggers rewrite', async () => {
    render(<Harness />);
    const btn = screen.getByTestId(BUTTON_TID);
    fireEvent.pointerDown(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('REWRITTEN_VALUE'));
  });

  it('typing updates value via onChange', async () => {
    function H() {
      const [v, setV] = useState('');
      const client = createMockClient({ complete: () => 'X' });
      return (
        <SmartProvider client={client}>
          <SmartParaphraseBox value={v} onChange={setV} data-testid="input" />
          <div data-testid="value">{v}</div>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.type(screen.getByTestId('input'), 'abc');
    expect(screen.getByTestId('value')).toHaveTextContent('abc');
  });
});
