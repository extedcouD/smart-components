import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartChat, type SmartChatHandle } from './SmartChat';

describe('SmartChat', () => {
  it('exposes hook state via render-prop', async () => {
    const client = createMockClient({ chat: () => 'hello world' });
    function App() {
      return (
        <SmartProvider client={client}>
          <SmartChat>
            {({ messages, send, status }) => (
              <div>
                <div data-testid="status">{status}</div>
                <div data-testid="count">{messages.length}</div>
                <button data-testid="send" onClick={() => send('hi')}>send</button>
              </div>
            )}
          </SmartChat>
        </SmartProvider>
      );
    }
    render(<App />);
    await userEvent.click(screen.getByTestId('send'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('imperative ref API can send + reset', async () => {
    const client = createMockClient({ chat: () => 'ok' });
    function App() {
      const ref = useRef<SmartChatHandle>(null);
      return (
        <SmartProvider client={client}>
          <SmartChat ref={ref}>
            {({ messages, status }) => (
              <div>
                <div data-testid="count">{messages.length}</div>
                <div data-testid="status">{status}</div>
                <button data-testid="rs" onClick={() => ref.current?.send('hi')}>rs</button>
                <button data-testid="rst" onClick={() => ref.current?.reset()}>rst</button>
              </div>
            )}
          </SmartChat>
        </SmartProvider>
      );
    }
    render(<App />);
    await userEvent.click(screen.getByTestId('rs'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    await userEvent.click(screen.getByTestId('rst'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
