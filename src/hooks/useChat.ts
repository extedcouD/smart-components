import { useCallback, useEffect, useRef, useState } from 'react';
import { useSmartClient } from '../provider/useSmartClient';
import { assertCapability, hasCapability } from '../provider/types';
import type {
  ChatContentBlock,
  ChatFinishReason,
  ChatMessage,
  ChatStreamChunk,
  SmartTool,
} from '../provider/chat-types';
import { uuid } from '../utils/uuid';

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'ready' | 'error';

export interface PendingToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface UseChatOptions {
  /** System prompt for the assistant. Composes with `<SmartProvider defaultSystem>`. */
  system?: string;
  /** Model id; overrides provider default. */
  model?: string;
  /** Tools the assistant may call. Provide `execute` for zero-boilerplate auto-handling. */
  tools?: SmartTool[];
  /** Initial messages (uncontrolled mode). */
  initialMessages?: ChatMessage[];
  /** Controlled mode: consumer owns the messages array. */
  messages?: ChatMessage[];
  /** Called whenever messages change (controlled or uncontrolled). */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Auto-run `tool.execute` and feed the result back into the chat. Default: true. */
  autoExecuteTools?: boolean;
  /** Stream chunks when the client supports `chatStream`. Default: true. */
  stream?: boolean;
  /** Max output tokens per turn. */
  maxTokens?: number;
  /** Sampling temperature. */
  temperature?: number;
  /** Called when an assistant message finishes (per turn — fires multiple times across a tool loop). */
  onFinish?: (message: ChatMessage) => void;
  /** Called when a turn errors. */
  onError?: (error: Error) => void;
}

export interface UseChatResult {
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | null;
  /** Send a message. String shorthand wraps as a single text content block. */
  send: (input: string | ChatContentBlock[]) => void;
  /** Re-run the last user message (drops messages after it). */
  regenerate: () => void;
  /** Abort any in-flight request. */
  stop: () => void;
  /** Clear conversation. */
  reset: () => void;
  /** Tool calls awaiting consumer resolution (only when autoExecuteTools=false
   *  or a tool lacks an `execute` fn). */
  pendingToolCalls: PendingToolCall[];
  /** Resolve a pending tool call manually. When all pending are resolved, the
   *  chat resumes automatically. */
  submitToolResult: (toolCallId: string, result: unknown, isError?: boolean) => void;
}

function textBlock(text: string): ChatContentBlock {
  return { type: 'text', text };
}

function buildUserMessage(input: string | ChatContentBlock[]): ChatMessage {
  const content = typeof input === 'string' ? [textBlock(input)] : input;
  return { id: uuid(), role: 'user', content, createdAt: Date.now() };
}

function findLastUserIndex(msgs: ChatMessage[]): number {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]!.role === 'user') return i;
  }
  return -1;
}

function extractToolCalls(message: ChatMessage): PendingToolCall[] {
  const out: PendingToolCall[] = [];
  for (const b of message.content) {
    if (b.type === 'tool_call') out.push({ id: b.id, name: b.name, arguments: b.arguments });
  }
  return out;
}

function composeSystem(defaultSystem: string | undefined, optsSystem: string | undefined): string | undefined {
  if (defaultSystem && optsSystem) return `${defaultSystem}\n\n${optsSystem}`;
  return optsSystem ?? defaultSystem;
}

// Helpers for mutating the last assistant message during streaming.
function withLastAssistant(
  msgs: ChatMessage[],
  update: (m: ChatMessage) => ChatMessage,
): ChatMessage[] {
  if (msgs.length === 0) return msgs;
  const lastIdx = msgs.length - 1;
  const last = msgs[lastIdx]!;
  if (last.role !== 'assistant') return msgs;
  const next = msgs.slice();
  next[lastIdx] = update(last);
  return next;
}

function appendTextDelta(content: ChatContentBlock[], text: string): ChatContentBlock[] {
  if (content.length > 0) {
    const last = content[content.length - 1]!;
    if (last.type === 'text') {
      const next = content.slice();
      next[next.length - 1] = { type: 'text', text: last.text + text };
      return next;
    }
  }
  return [...content, { type: 'text', text }];
}

function appendToolCall(
  content: ChatContentBlock[],
  call: { id: string; name: string; arguments: unknown },
): ChatContentBlock[] {
  return [...content, { type: 'tool_call', id: call.id, name: call.name, arguments: call.arguments }];
}

export function useChat(opts: UseChatOptions = {}): UseChatResult {
  const { client, model: ctxModel, defaultSystem } = useSmartClient();

  const {
    autoExecuteTools = true,
    stream: streamOpt,
  } = opts;

  // Controlled vs uncontrolled messages.
  const isControlled = opts.messages !== undefined;
  const [internal, setInternal] = useState<ChatMessage[]>(
    () => opts.messages ?? opts.initialMessages ?? [],
  );
  const messages = isControlled ? opts.messages! : internal;

  const messagesRef = useRef(messages);
  // Latest callbacks via refs so we don't recreate `run` on every render.
  // Updated via useEffect (not during render) to satisfy `react-hooks/refs`.
  const onFinishRef = useRef(opts.onFinish);
  const onErrorRef = useRef(opts.onError);
  const onMessagesChangeRef = useRef(opts.onMessagesChange);
  const optsRef = useRef(opts);
  useEffect(() => {
    messagesRef.current = messages;
    onFinishRef.current = opts.onFinish;
    onErrorRef.current = opts.onError;
    onMessagesChangeRef.current = opts.onMessagesChange;
    optsRef.current = opts;
  });

  const setMessages = useCallback(
    (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])): ChatMessage[] => {
      const prev = messagesRef.current;
      const value = typeof next === 'function' ? (next as (p: ChatMessage[]) => ChatMessage[])(prev) : next;
      messagesRef.current = value;
      if (!isControlled) setInternal(value);
      onMessagesChangeRef.current?.(value);
      return value;
    },
    [isControlled],
  );

  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [pendingToolCalls, setPendingToolCalls] = useState<PendingToolCall[]>([]);

  // Map of toolCallId → resolved tool_result block, used while waiting on
  // consumer-submitted results.
  const pendingResultsRef = useRef<Map<string, { result: unknown; isError?: boolean }>>(new Map());
  const waitingForToolsRef = useRef<{ history: ChatMessage[]; calls: PendingToolCall[] } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);
  useEffect(() => cancelInFlight, [cancelInFlight]);

  // The core runner. Loops across tool-call turns using a single AbortController.
  const runImpl = useCallback(
    async (initialHistory: ChatMessage[], ac: AbortController): Promise<void> => {
      let history = initialHistory;
      // Each loop iteration is one assistant turn. We continue iterating only
      // when an auto-executed tool turn leaves us with the assistant pending a
      // follow-up; pending-tool-flow (consumer-resolved) breaks out and resumes
      // later via submitToolResult → startRun.
      while (true) {
        if (ac.signal.aborted) return;
        const o = optsRef.current;
        const system = composeSystem(defaultSystem, o.system);
        const model = o.model ?? ctxModel;
        const baseReq = {
          messages: history,
          system,
          model,
          tools: o.tools,
          maxTokens: o.maxTokens,
          temperature: o.temperature,
          signal: ac.signal,
        };

        const useStream = streamOpt !== false && hasCapability(client, 'chatStream');
        let assistantMsg: ChatMessage;
        let finishReason: ChatFinishReason = 'stop';

        if (useStream) {
          assertCapability(client, 'chatStream');
          assistantMsg = { id: uuid(), role: 'assistant', content: [], createdAt: Date.now() };
          let working = setMessages([...history, assistantMsg]);
          const toolNames = new Map<string, string>();

          for await (const chunk of client.chatStream(baseReq) as AsyncIterable<ChatStreamChunk>) {
            if (ac.signal.aborted) return;
            switch (chunk.type) {
              case 'message-start':
                setStatus('streaming');
                break;
              case 'text-delta':
                working = setMessages(
                  withLastAssistant(working, (m) => ({
                    ...m,
                    content: appendTextDelta(m.content, chunk.text),
                  })),
                );
                break;
              case 'tool-call-start':
                toolNames.set(chunk.toolCallId, chunk.name);
                break;
              case 'tool-call-delta':
                break;
              case 'tool-call-end':
                working = setMessages(
                  withLastAssistant(working, (m) => ({
                    ...m,
                    content: appendToolCall(m.content, {
                      id: chunk.toolCallId,
                      name: toolNames.get(chunk.toolCallId) ?? '',
                      arguments: chunk.arguments,
                    }),
                  })),
                );
                break;
              case 'finish':
                finishReason = chunk.finishReason;
                break;
              case 'error':
                throw chunk.error;
            }
          }
          if (ac.signal.aborted) return;
          const lastIdx = messagesRef.current.length - 1;
          assistantMsg = messagesRef.current[lastIdx] ?? assistantMsg;
        } else {
          assertCapability(client, 'chat');
          const response = await client.chat(baseReq);
          if (ac.signal.aborted) return;
          assistantMsg = response.message;
          finishReason = response.finishReason;
          setMessages([...history, assistantMsg]);
        }

        onFinishRef.current?.(assistantMsg);

        if (finishReason !== 'tool_calls') {
          setStatus('ready');
          return;
        }

        const calls = extractToolCalls(assistantMsg);
        if (calls.length === 0) {
          setStatus('ready');
          return;
        }

        const tools = optsRef.current.tools ?? [];
        const toolMap = new Map<string, SmartTool>(tools.map((t) => [t.name, t]));
        const autoResults: ChatMessage[] = [];
        const remaining: PendingToolCall[] = [];

        if (autoExecuteTools) {
          for (const call of calls) {
            const tool = toolMap.get(call.name);
            if (tool?.execute) {
              try {
                const result = await tool.execute(call.arguments, { signal: ac.signal });
                if (ac.signal.aborted) return;
                autoResults.push({
                  id: uuid(),
                  role: 'tool',
                  content: [{ type: 'tool_result', toolCallId: call.id, result }],
                  createdAt: Date.now(),
                });
              } catch (e) {
                if (ac.signal.aborted) return;
                autoResults.push({
                  id: uuid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool_result',
                      toolCallId: call.id,
                      result: e instanceof Error ? e.message : String(e),
                      isError: true,
                    },
                  ],
                  createdAt: Date.now(),
                });
              }
            } else {
              remaining.push(call);
            }
          }
        } else {
          remaining.push(...calls);
        }

        let nextHistory = messagesRef.current;
        if (autoResults.length > 0) {
          nextHistory = setMessages([...nextHistory, ...autoResults]);
        }

        if (remaining.length === 0) {
          history = nextHistory;
          setStatus('submitted');
          continue;
        }

        pendingResultsRef.current = new Map();
        waitingForToolsRef.current = { history: nextHistory, calls: remaining };
        setPendingToolCalls(remaining);
        setStatus('ready');
        return;
      }
    },
    [client, ctxModel, defaultSystem, streamOpt, autoExecuteTools, setMessages],
  );

  const startRun = useCallback(
    (history: ChatMessage[]) => {
      cancelInFlight();
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus('submitted');
      setError(null);
      setPendingToolCalls([]);
      pendingResultsRef.current = new Map();
      waitingForToolsRef.current = null;
      (async () => {
        try {
          await runImpl(history, ac);
        } catch (e) {
          if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
          const err = e instanceof Error ? e : new Error(String(e));
          setError(err);
          setStatus('error');
          onErrorRef.current?.(err);
        } finally {
          if (abortRef.current === ac) abortRef.current = null;
        }
      })();
    },
    [cancelInFlight, runImpl],
  );

  const send = useCallback(
    (input: string | ChatContentBlock[]) => {
      const userMsg = buildUserMessage(input);
      const newHistory = setMessages([...messagesRef.current, userMsg]);
      startRun(newHistory);
    },
    [setMessages, startRun],
  );

  const regenerate = useCallback(() => {
    const idx = findLastUserIndex(messagesRef.current);
    if (idx < 0) return;
    const sliced = setMessages(messagesRef.current.slice(0, idx + 1));
    startRun(sliced);
  }, [setMessages, startRun]);

  const stop = useCallback(() => {
    cancelInFlight();
    setStatus('ready');
  }, [cancelInFlight]);

  const reset = useCallback(() => {
    cancelInFlight();
    pendingResultsRef.current = new Map();
    waitingForToolsRef.current = null;
    setPendingToolCalls([]);
    setError(null);
    setStatus('idle');
    setMessages([]);
  }, [cancelInFlight, setMessages]);

  const submitToolResult = useCallback(
    (toolCallId: string, result: unknown, isError?: boolean) => {
      const waiting = waitingForToolsRef.current;
      if (!waiting) return;
      const match = waiting.calls.find((c) => c.id === toolCallId);
      if (!match) return;
      pendingResultsRef.current.set(toolCallId, { result, isError });
      const remaining = waiting.calls.filter((c) => !pendingResultsRef.current.has(c.id));
      setPendingToolCalls(remaining);
      if (remaining.length > 0) return;

      // All resolved — append tool_result messages and resume the chat.
      const toolMsgs: ChatMessage[] = waiting.calls.map((c) => {
        const r = pendingResultsRef.current.get(c.id)!;
        return {
          id: uuid(),
          role: 'tool',
          content: [
            {
              type: 'tool_result',
              toolCallId: c.id,
              result: r.result,
              isError: r.isError,
            },
          ],
          createdAt: Date.now(),
        };
      });
      const nextHistory = setMessages([...waiting.history, ...toolMsgs]);
      waitingForToolsRef.current = null;
      pendingResultsRef.current = new Map();
      startRun(nextHistory);
    },
    [setMessages, startRun],
  );

  return {
    messages,
    status,
    error,
    send,
    regenerate,
    stop,
    reset,
    pendingToolCalls,
    submitToolResult,
  };
}
