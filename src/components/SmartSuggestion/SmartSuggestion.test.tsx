import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartProvider } from '../../provider/SmartProvider';
import { createMockClient } from '../../adapters/mock';
import { SmartSuggestion } from './SmartSuggestion';

function Harness({
  initial = '',
  items = ['apple', 'apricot', 'avocado'],
  onSelect,
}: {
  initial?: string;
  items?: string[];
  onSelect?: (item: string) => void;
}) {
  const [v, setV] = useState(initial);
  const client = createMockClient({
    complete: () => JSON.stringify(items),
  });
  return (
    <SmartProvider client={client}>
      <SmartSuggestion
        value={v}
        onChange={setV}
        onSelect={onSelect}
        debounceMs={0}
        minChars={1}
        data-testid="combobox"
      />
    </SmartProvider>
  );
}

describe('SmartSuggestion', () => {
  it('renders a combobox', () => {
    render(<Harness />);
    const input = screen.getByTestId('combobox');
    expect(input).toHaveAttribute('role', 'combobox');
  });

  it('shows suggestions after typing', async () => {
    render(<Harness initial="a" />);
    const input = screen.getByTestId('combobox');
    input.focus();
    await waitFor(() => expect(screen.getByText('apple')).toBeInTheDocument());
    expect(screen.getByText('apricot')).toBeInTheDocument();
  });

  it('arrow-down + enter selects an item', async () => {
    const onSelect = vi.fn();
    render(<Harness initial="a" onSelect={onSelect} />);
    const input = screen.getByTestId('combobox') as HTMLInputElement;
    input.focus();
    await waitFor(() => expect(screen.getByText('apple')).toBeInTheDocument());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('apricot');
    expect(input.value).toBe('apricot');
  });

  it('Escape closes the list', async () => {
    render(<Harness initial="a" />);
    const input = screen.getByTestId('combobox');
    input.focus();
    await waitFor(() => expect(screen.getByText('apple')).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('click on item selects it', async () => {
    const onSelect = vi.fn();
    render(<Harness initial="a" onSelect={onSelect} />);
    const input = screen.getByTestId('combobox');
    input.focus();
    await waitFor(() => expect(screen.getByText('avocado')).toBeInTheDocument());
    await userEvent.click(screen.getByText('avocado'));
    expect(onSelect).toHaveBeenCalledWith('avocado');
  });
});
