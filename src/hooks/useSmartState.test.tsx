import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../provider/SmartProvider';
import { createMockClient } from '../adapters/mock';
import { useSmartState, type UseSmartStateOptions } from './useSmartState';
import type { ShapeDescriptor } from '../utils/shape';

type CompleteFn = (req: { prompt: string; system?: string }) => string | Promise<string>;

interface InnerProps<T> {
  initial: T | (() => T);
  defaultContext?: string;
  options?: UseSmartStateOptions<T>;
}

function Inner<T>({ initial, defaultContext, options }: InnerProps<T>) {
  const [value, setValue, ai] = useSmartState<T>(initial, defaultContext, options);
  return (
    <div>
      <div data-testid="value">{JSON.stringify(value)}</div>
      <div data-testid="status">{ai.status}</div>
      <div data-testid="error">{ai.error?.message ?? ''}</div>
      <button data-testid="gen" onClick={() => ai.generate()}>
        gen
      </button>
      <button data-testid="gen-villain" onClick={() => ai.generate('a sinister villain')}>
        villain
      </button>
      <button data-testid="reset" onClick={ai.reset}>
        reset
      </button>
      <button data-testid="set-num" onClick={() => (setValue as (v: number) => void)(99)}>
        setnum
      </button>
      <button
        data-testid="set-fn"
        onClick={() =>
          (setValue as (u: (prev: number) => number) => void)((p) => p + 1)
        }
      >
        setfn
      </button>
    </div>
  );
}

function Harness<T>({
  initial,
  defaultContext,
  options,
  complete,
  latencyMs,
}: InnerProps<T> & { complete: CompleteFn; latencyMs?: number }) {
  const client = createMockClient({ complete, latencyMs });
  return (
    <SmartProvider client={client}>
      <Inner<T> initial={initial} defaultContext={defaultContext} options={options} />
    </SmartProvider>
  );
}

describe('useSmartState', () => {
  it('1. primitive number — parses "42"', async () => {
    render(<Harness<number> initial={0} complete={() => '42'} />);
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('42');
  });

  it('2. primitive string — parses JSON-quoted string', async () => {
    render(<Harness<string> initial="" complete={() => '"hello"'} />);
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('"hello"');
  });

  it('3. flat object', async () => {
    render(
      <Harness
        initial={{ name: '', age: 0 }}
        complete={() => JSON.stringify({ name: 'Neo', age: 33 })}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('"name":"Neo"');
    expect(screen.getByTestId('value')).toHaveTextContent('"age":33');
  });

  it('4. nested object', async () => {
    render(
      <Harness
        initial={{ user: { name: '' }, score: 0 }}
        complete={() => JSON.stringify({ user: { name: 'Trinity' }, score: 10 })}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('Trinity');
  });

  it('5. array of strings', async () => {
    render(
      <Harness<string[]>
        initial={['']}
        complete={() => JSON.stringify(['a', 'b', 'c'])}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('["a","b","c"]');
  });

  it('6. abort on unmount — no state updates after unmount', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <Harness<number> initial={0} latencyMs={100} complete={() => '42'} />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    unmount();
    await new Promise((r) => setTimeout(r, 150));
    // Should not produce "act()" / "state update on unmounted" warnings.
    const warnings = errSpy.mock.calls.flat().join(' ');
    expect(warnings).not.toMatch(/unmounted/i);
    expect(warnings).not.toMatch(/act\(/);
    errSpy.mockRestore();
  });

  it('7. setValue mid-generate aborts and returns to idle', async () => {
    render(<Harness<number> initial={0} latencyMs={100} complete={() => '42'} />);
    await userEvent.click(screen.getByTestId('gen'));
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await userEvent.click(screen.getByTestId('set-num'));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('value')).toHaveTextContent('99');
    // Wait past mock latency; status must NOT flip to 'ready'.
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('value')).toHaveTextContent('99');
  });

  it('8. cache hit — same context calls complete once', async () => {
    const complete = vi.fn().mockResolvedValue('42');
    render(<Harness<number> initial={0} defaultContext="x" complete={complete} />);
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('42'));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('9. cache:false — calls complete twice', async () => {
    const complete = vi.fn().mockResolvedValue('42');
    render(
      <Harness<number>
        initial={0}
        defaultContext="x"
        options={{ cache: false }}
        complete={complete}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
  });

  it('10. validation failure — wrong type → error status', async () => {
    render(
      <Harness
        initial={{ name: '', age: 0 }}
        complete={() => JSON.stringify({ name: 'x', age: 'old' })}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('error')).toHaveTextContent(/age/);
  });

  it('11. markdown fence stripping', async () => {
    render(
      <Harness<number>
        initial={0}
        complete={() => '```json\n42\n```'}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('42');
  });

  it('12. context override — generate(ctx) overrides defaultContext', async () => {
    const complete = vi.fn().mockResolvedValue('1');
    render(
      <Harness<number>
        initial={0}
        defaultContext="a hero"
        complete={complete}
      />,
    );
    await userEvent.click(screen.getByTestId('gen-villain'));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    const req = complete.mock.calls[0]![0];
    expect(req.prompt).toMatch(/villain/);
    expect(req.prompt).not.toMatch(/hero/);
  });

  it('13. shape escape hatch with null initial', async () => {
    type User = { name: string; age: number };
    const shape: ShapeDescriptor = {
      type: 'object',
      fields: { name: 'string', age: 'number' },
    };
    render(
      <Harness<User | null>
        initial={null}
        options={{ shape }}
        complete={() => JSON.stringify({ name: 'Anon', age: 5 })}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('"name":"Anon"');
  });

  it('14. shape escape hatch with [] initial', async () => {
    const shape: ShapeDescriptor = { type: 'array', item: 'string' };
    render(
      <Harness<string[]>
        initial={[]}
        options={{ shape }}
        complete={() => JSON.stringify(['x', 'y'])}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('value')).toHaveTextContent('["x","y"]');
  });

  it('15. introspection failure — generate() reports clear error', async () => {
    // {tags: []} throws at introspection time (mount).
    expect(() =>
      render(
        <Harness initial={{ tags: [] as string[] }} complete={() => '[]'} />,
      ),
    ).toThrow(/cannot infer shape of field "tags"/);
  });

  it('16. reset() clears error + status', async () => {
    render(
      <Harness
        initial={{ name: '', age: 0 }}
        complete={() => JSON.stringify({ name: 'x', age: 'old' })}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    await userEvent.click(screen.getByTestId('reset'));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('17. onGenerate callback fires with parsed value', async () => {
    const cb = vi.fn();
    render(
      <Harness<number>
        initial={0}
        options={{ onGenerate: cb }}
        complete={() => '7'}
      />,
    );
    await userEvent.click(screen.getByTestId('gen'));
    await waitFor(() => expect(cb).toHaveBeenCalledWith(7));
  });

  it('18. functional setValue still works', async () => {
    render(<Harness<number> initial={5} complete={() => '0'} />);
    await userEvent.click(screen.getByTestId('set-fn'));
    expect(screen.getByTestId('value')).toHaveTextContent('6');
    await userEvent.click(screen.getByTestId('set-fn'));
    expect(screen.getByTestId('value')).toHaveTextContent('7');
  });
});
