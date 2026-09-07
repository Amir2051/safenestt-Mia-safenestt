'use client';
import { useState, useCallback, useRef } from 'react';

const API = '';

export function useChat(getSessionId) {
  const [conversations,      setConversations]      = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages,           setMessages]           = useState([]);
  const [streaming,          setStreaming]           = useState(false);
  const abortRef = useRef(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'X-Session-ID': getSessionId(),
  }), [getSessionId]);

  const loadConversations = useCallback(async () => {
    const res  = await fetch(`${API}/api/chat/conversations`, { headers: headers() });
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  }, [headers]);

  const selectConversation = useCallback(async (conv) => {
    setActiveConversation(conv);
    setMessages([]);
    const res  = await fetch(`${API}/api/chat/conversations/${conv.id}/messages`, { headers: headers() });
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [headers]);

  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(async (id) => {
    await fetch(`${API}/api/chat/conversations/${id}`, { method: 'DELETE', headers: headers() });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversation?.id === id) newConversation();
  }, [headers, activeConversation, newConversation]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || streaming) return;

    const userMsg = { role: 'user', content, id: Date.now(), created_at: new Date().toISOString() };
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const placeholderId = Date.now() + 1;
    setMessages(prev => [...prev, {
      role: 'assistant', content: '', id: placeholderId,
      streaming: true, tool_calls: [],
    }]);

    let currentConvId = activeConversation?.id;
    // Track active tool calls for the current placeholder
    const activeTools = [];

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${API}/api/chat/stream`, {
        method:  'POST',
        headers: headers(),
        body:    JSON.stringify({ content, history, conversation_id: currentConvId }),
        signal:  abortRef.current.signal,
      });

      if (!res.ok) throw new Error('Stream failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);

            if (parsed.conversation_id && !currentConvId) {
              currentConvId = parsed.conversation_id;
              setActiveConversation({ id: currentConvId, title: content.slice(0, 60) });
            }

            if (parsed.delta) {
              full += parsed.delta;
              setMessages(prev => prev.map(m =>
                m.id === placeholderId ? { ...m, content: full } : m
              ));
            }

            // Tool execution started
            if (parsed.tool_call) {
              const toolEntry = { name: parsed.tool_call.name, input: parsed.tool_call.input, status: 'running' };
              activeTools.push(toolEntry);
              setMessages(prev => prev.map(m =>
                m.id === placeholderId ? { ...m, tool_calls: [...(m.tool_calls || []), toolEntry] } : m
              ));
            }

            // Tool execution finished
            if (parsed.tool_result) {
              const idx = activeTools.findLastIndex(t => t.name === parsed.tool_result.name && t.status === 'running');
              if (idx !== -1) activeTools[idx].status = 'done';
              setMessages(prev => prev.map(m => {
                if (m.id !== placeholderId) return m;
                const updated = [...(m.tool_calls || [])];
                const tidx = updated.findLastIndex(t => t.name === parsed.tool_result.name && t.status === 'running');
                if (tidx !== -1) updated[tidx] = { ...updated[tidx], status: 'done' };
                return { ...m, tool_calls: updated };
              }));
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === placeholderId ? { ...m, content: full, streaming: false } : m
      ));

      await loadConversations();
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => prev.filter(m => m.id !== placeholderId));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { ...m, content: '❌ Something went wrong. Please try again.', streaming: false }
            : m
        ));
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, activeConversation, headers, loadConversations]);

  const stopStreaming = () => abortRef.current?.abort();

  return {
    conversations, activeConversation, messages, streaming,
    loadConversations, selectConversation, newConversation,
    deleteConversation, sendMessage, stopStreaming,
  };
}
