import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartChatComposer } from './SmartChatComposer';

describe('SmartChatComposer', () => {
  it('Enter submits the trimmed draft', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    await userEvent.type(ta, 'hello');
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('Shift+Enter inserts a newline', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(ta, 'a');
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('Enter during IME composition does not submit', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    await userEvent.type(ta, 'a');
    fireEvent.compositionStart(ta);
    fireEvent.keyDown(ta, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.compositionEnd(ta);
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onSend).toHaveBeenCalled();
  });

  it('disabled blocks send', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} disabled />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'hi' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('Send button click submits', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    await userEvent.type(ta, 'hi');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('hi');
  });

  it('empty draft does not submit', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears draft after send', async () => {
    const onSend = vi.fn();
    render(<SmartChatComposer onSend={onSend} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(ta, 'hi');
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(ta.value).toBe('');
  });
});
