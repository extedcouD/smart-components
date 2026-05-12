import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartRewrite } from './SmartRewrite';

function Harness({
  initial = 'this is the original text.',
  completeImpl,
  streamImpl,
  stream = false,
  instruction,
}: {
  initial?: string;
  completeImpl?: (req: { prompt: string }) => string | Promise<string>;
  streamImpl?: (req: { prompt: string }) => AsyncIterable<string>;
  stream?: boolean;
  instruction?: string;
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: completeImpl ?? (() => 'REWRITTEN'),
    stream: streamImpl,
  });
  return (
    <SmartProvider client={client}>
      <SmartRewrite value={v} onChange={setV} instruction={instruction} stream={stream}>
        {({ rewrite, status, run, accept, reject, presets }) => (
          <div>
            <div data-testid="value">{v}</div>
            <div data-testid="rewrite">{rewrite}</div>
            <div data-testid="status">{status}</div>
            <button data-testid="run" onClick={() => run()}>
              run
            </button>
            <button data-testid="run-override" onClick={() => run('make it shorter')}>
              override
            </button>
            <button data-testid="accept" onClick={accept}>
              accept
            </button>
            <button data-testid="reject" onClick={reject}>
              reject
            </button>
            {presets.map((p) => (
              <button key={p.label} data-testid={`p-${p.label}`} onClick={() => run(p.instruction)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </SmartRewrite>
    </SmartProvider>
  );
}

describe('SmartRewrite', () => {
  it('starts idle with empty rewrite', () => {
    render(<Harness />);
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('rewrite')).toHaveTextContent('');
  });

  it('run() fetches and lands ready with rewrite text', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('rewrite')).toHaveTextContent('REWRITTEN');
  });

  it('run(override) uses the override instruction in the prompt', async () => {
    const complete = vi.fn().mockResolvedValue('SHORT');
    function H() {
      const [v, setV] = useState('a long sentence here.');
      const client = createMockClient({ complete });
      return (
        <SmartProvider client={client}>
          <SmartRewrite value={v} onChange={setV}>
            {({ run }) => <button data-testid="go" onClick={() => run('make it shorter')}>go</button>}
          </SmartRewrite>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.click(screen.getByTestId('go'));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const req = complete.mock.calls[0]![0];
    expect(req.prompt).toMatch(/Instruction: make it shorter/);
    expect(req.prompt).toMatch(/a long sentence here\./);
  });

  it('accept() commits the rewrite via onChange and returns to idle', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await userEvent.click(screen.getByTestId('accept'));
    expect(screen.getByTestId('value')).toHaveTextContent('REWRITTEN');
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('rewrite')).toHaveTextContent('');
  });

  it('reject() clears the rewrite without changing the value', async () => {
    render(<Harness initial="ORIG" />);
    await userEvent.click(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await userEvent.click(screen.getByTestId('reject'));
    expect(screen.getByTestId('value')).toHaveTextContent('ORIG');
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('rewrite')).toHaveTextContent('');
  });

  it('LRU caches repeat calls (one network call for two runs of the same args)', async () => {
    const complete = vi.fn().mockResolvedValue('CACHED');
    function H() {
      const [v, setV] = useState('same input');
      const client = createMockClient({ complete });
      return (
        <SmartProvider client={client}>
          <SmartRewrite value={v} onChange={setV} instruction="ix">
            {({ rewrite, status, run, reject }) => (
              <div>
                <div data-testid="rw">{rewrite}</div>
                <div data-testid="st">{status}</div>
                <button data-testid="r" onClick={() => run()}>r</button>
                <button data-testid="rj" onClick={reject}>rj</button>
              </div>
            )}
          </SmartRewrite>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.click(screen.getByTestId('r'));
    await waitFor(() => expect(screen.getByTestId('st')).toHaveTextContent('ready'));
    await userEvent.click(screen.getByTestId('rj'));
    await userEvent.click(screen.getByTestId('r'));
    await waitFor(() => expect(screen.getByTestId('rw')).toHaveTextContent('CACHED'));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('errors when client lacks the needed capability', async () => {
    function H() {
      const [v, setV] = useState('hello');
      // mock client with no complete/stream fns → empty capabilities
      const client = createMockClient({});
      return (
        <SmartProvider client={client}>
          <SmartRewrite value={v} onChange={setV}>
            {({ status, error, run }) => (
              <div>
                <div data-testid="st">{status}</div>
                <div data-testid="err">{error?.message ?? ''}</div>
                <button data-testid="r" onClick={() => run()}>r</button>
              </div>
            )}
          </SmartRewrite>
        </SmartProvider>
      );
    }
    render(<H />);
    await userEvent.click(screen.getByTestId('r'));
    await waitFor(() => expect(screen.getByTestId('st')).toHaveTextContent('error'));
    expect(screen.getByTestId('err').textContent).toMatch(/missing capability "complete"/);
  });

  it('streaming grows the rewrite over time', async () => {
    async function* streamImpl() {
      for (const ch of ['Hel', 'lo, ', 'world']) {
        await new Promise((r) => setTimeout(r, 5));
        yield ch;
      }
    }
    render(<Harness stream streamImpl={streamImpl} />);
    await userEvent.click(screen.getByTestId('run'));
    await waitFor(() => expect(screen.getByTestId('rewrite')).toHaveTextContent(/Hel/));
    await waitFor(() => expect(screen.getByTestId('rewrite')).toHaveTextContent(/Hello, world/));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
  });
});
