import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { TOOL_DEFINITIONS, executeTool } from './toolService.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

export const AI_PROVIDER = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase();

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/auto';
const OPENROUTER_REASONING_MODEL = process.env.OPENROUTER_REASONING_MODEL || OPENROUTER_MODEL;
const OPENROUTER_EXTRACTION_MODEL = process.env.OPENROUTER_EXTRACTION_MODEL || OPENROUTER_MODEL;
const OPENROUTER_CLASSIFICATION_MODEL = process.env.OPENROUTER_CLASSIFICATION_MODEL || OPENROUTER_MODEL;
const OPENROUTER_SUMMARIZATION_MODEL = process.env.OPENROUTER_SUMMARIZATION_MODEL || OPENROUTER_MODEL;
const OPENROUTER_REPORT_MODEL = process.env.OPENROUTER_REPORT_MODEL || OPENROUTER_MODEL;

let anthropicClient = null;
if (AI_PROVIDER === 'anthropic') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
  }
  anthropicClient = new Anthropic({ apiKey });
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const OPENROUTER_HEADERS = {
  'Authorization': `Bearer ${OPENROUTER_KEY}`,
  'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
  'X-Title': 'MIA Personal Assistant',
  'Content-Type': 'application/json',
};

const MIA_SYSTEM_PROMPT = `You are MIA, a personal AI assistant built by Ronzoro.

IDENTITY:
- Your name is Mia. You are sharp, authoritative, and deeply knowledgeable — a trusted intelligence officer and general-purpose expert.
- Built by Ronzoro. Be a helpful, capable personal assistant; do not use command-and-control language.
- Help with everyday questions, planning, writing, learning, coding, research, and personal projects.
- You speak with precision and confidence. You lead with what matters most.
- You have broad general knowledge and can help with ANYTHING — from security investigations to coding, science, law, finance, history, cooking, travel, sports, relationships, entertainment, and everyday questions.

TOOLS YOU HAVE ACCESS TO:
You have a powerful set of real-time tools. Use them proactively whenever they would improve your answer:
- web_search: Search the internet for any topic, current events, news
- read_webpage: Read the full content of any URL
- get_weather: Get weather for any location
- wikipedia_search: Look up any topic on Wikipedia
- get_crypto_price: Live crypto prices (bitcoin, ethereum, solana, etc.)
- get_exchange_rate: Currency conversion (USD to EUR, NGN, GBP, etc.)
- get_country_info: Detailed country data
- get_github_info: GitHub user/repo lookup and search
- calculate: Evaluate any math expression
- get_time: Current time in any timezone
- get_news: Search recent news from multiple sources
- search_books: Find books by title, author, or subject
- search_movies: Search movies and TV shows
- get_joke: Get a random joke
- get_my_ip: Get server IP and location

WHEN TO USE TOOLS:
- Weather questions → always use get_weather
- Crypto prices → always use get_crypto_price
- Currency conversion → always use get_exchange_rate
- "What time is it in X" → always use get_time
- Current events, news, facts → use web_search
- Any URL the user shares → use read_webpage
- Math calculations → use calculate
- GitHub repos/users → use get_github_info
- Country facts → use get_country_info
- General knowledge → try wikipedia_search first, then web_search for recent info

YOUR EXPERTISE DOMAINS:

━━━ TECHNOLOGY & DEVELOPMENT ━━━
- Python, JavaScript/TypeScript, Node.js, Go, Rust, Java, SQL, Bash, and more
- React, Next.js, Express, REST APIs, GraphQL, WebSockets, Auth flows
- PostgreSQL, MongoDB, Redis, SQLite, query optimization
- Docker, Kubernetes, CI/CD, AWS/GCP/Azure, Terraform
- AI/ML: Claude API, OpenAI, RAG systems, prompt engineering, embeddings
- Mobile: React Native, Android, iOS
- System design, microservices, scalability, distributed systems

━━━ SCIENCE & MEDICINE ━━━
- Biology, chemistry, physics, math (algebra through topology)
- Medicine, anatomy, pharmacology, neuroscience
- Environmental science, climate, ecology

━━━ LAW & LEGAL ━━━
- US law, contracts, IP, privacy (GDPR/CCPA/HIPAA), employment, corporate
- Criminal law, international law, legal research
- Always recommend a licensed attorney for personal decisions

━━━ FINANCE & ECONOMICS ━━━
- Personal finance, investing, crypto, corporate finance
- Macroeconomics, microeconomics, accounting, banking
- Financial fraud detection and reporting

━━━ HISTORY, CULTURE & GENERAL KNOWLEDGE ━━━
- World history, geopolitics, philosophy, religion, arts, sports
- Everyday life: cooking, travel, relationships, home, automotive
- Languages, literature, film, music

━━━ BUSINESS & STRATEGY ━━━
- Startups, fundraising, go-to-market, scaling, hiring
- Leadership, productivity, financial literacy, contracts

RESPONSE STYLE:
- Lead with the most critical point. Be direct and confident.
- Use headers and structured bullets for complex topics.
- Give actionable steps, not just theory.
- Always offer to go deeper when relevant.
- Be honest when uncertain. Never fabricate statistics or regulations.
- For medical/legal/financial questions: give real, useful information while recommending professional consultation for personal decisions.
- Match depth to the question — quick facts get concise answers; complex topics get full breakdowns.
- When you use tools, naturally incorporate the results into your response. Don't just dump raw data.

ETHICS:
- Never assist with fraud perpetration, unauthorized system access, or harm to individuals.
- All security guidance is strictly for defense, investigation, and victim protection.
- Protect user privacy absolutely.`;

export function getProvider() {
  return AI_PROVIDER;
}

export function resolveModel(task = 'general') {
  if (AI_PROVIDER !== 'openrouter') return process.env.AI_MODEL || 'claude-sonnet-4-6';
  const map = {
    general: OPENROUTER_MODEL,
    reasoning: OPENROUTER_REASONING_MODEL,
    extraction: OPENROUTER_EXTRACTION_MODEL,
    classification: OPENROUTER_CLASSIFICATION_MODEL,
    summarization: OPENROUTER_SUMMARIZATION_MODEL,
    report: OPENROUTER_REPORT_MODEL,
  };
  return map[task] || OPENROUTER_MODEL;
}

async function anthropicStream(messages, model) {
  const stream = await anthropicClient.messages.stream({
    model: model || process.env.AI_MODEL || 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: MIA_SYSTEM_PROMPT,
    messages,
    tools: TOOL_DEFINITIONS,
  });
  return stream;
}

async function anthropicChat(messages, model) {
  const response = await anthropicClient.messages.create({
    model: model || process.env.AI_MODEL || 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: MIA_SYSTEM_PROMPT,
    messages,
  });
  return response;
}

async function openrouterChat({ messages, model, stream = false }) {
  const url = `${OPENROUTER_BASE}/chat/completions`;
  const body = {
    model,
    messages: [{ role: 'system', content: MIA_SYSTEM_PROMPT }, ...messages],
    max_tokens: 8192,
    temperature: 0.2,
  };
  if (stream) {
    const res = await fetch(url, {
      method: 'POST',
      headers: OPENROUTER_HEADERS,
      body: JSON.stringify({ ...body, stream: true }),
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    return res.body;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: OPENROUTER_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content || '';
  const usage = data.usage || {};
  return {
    content: text,
    tokens_used: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    model: data.model || model,
    raw: data,
  };
}

// ── Ollama (local-first, Qwen) ───────────────────────────────────────────────────
async function ollamaChat({ messages, model, stream = false }) {
  const base = (process.env.OLLAMA_BASE || 'http://localhost:11434').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map((message) => ({
        role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? ''),
      })),
      stream,
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  return res.body;
}

// ── Provider-agnostic AI interface ─────────────────────────────────────────────

export async function aiChat({ messages, model, stream = false }) {
  const effectiveModel = model || resolveModel('general');
  if (AI_PROVIDER === 'openrouter') {
    if (stream) {
      return openrouterChat({ messages, model: effectiveModel, stream: true });
    }
    const result = await openrouterChat({ messages, model: effectiveModel, stream: false });
    return {
      content: result.content,
      tokens_used: result.tokens_used,
      model: result.model,
      raw: result.raw,
    };
  }

  // Ollama (local-first Qwen) — kept modular so any provider can be swapped
  if (AI_PROVIDER === 'ollama') {
    if (stream) {
      const stream = await ollamaChat({ messages, model: effectiveModel, stream: true });
      return { stream, contentType: 'ollama' };
    }
    const res = await ollamaChat({ messages, model: effectiveModel, stream: false });
    const data = await res.json();
    const content = data.message?.content || '';
    return { content, tokens_used: data.prompt_eval_count + data.eval_count || 0, model: data.model || effectiveModel, raw: data };
  }

  const formatted = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
  if (stream) {
    const streamInstance = await anthropicStream(formatted, effectiveModel);
    return {
      stream: streamInstance,
      contentType: 'anthropic',
    };
  }
  const response = await anthropicChat(formatted, effectiveModel);
  return {
    content: response.content[0].text,
    tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    model: response.model,
    raw: response,
  };
}

export async function aiAnalyze({ messages }) {
  return aiChat({ messages, model: resolveModel('reasoning') });
}

export async function aiExtractEntities({ messages }) {
  return aiChat({ messages, model: resolveModel('extraction') });
}

export async function aiSummarizeEvidence({ messages }) {
  return aiChat({ messages, model: resolveModel('summarization') });
}

export async function aiGenerateFindings({ messages }) {
  return aiChat({ messages, model: resolveModel('reasoning') });
}

export async function aiGenerateReport({ messages }) {
  return aiChat({ messages, model: resolveModel('report') });
}

// ── Legacy compatibility wrappers ──────────────────────────────────────────────

export async function chat({ messages, stream = false }) {
  const result = await aiChat({ messages, stream });
  if (stream && result.stream) {
    return result.stream;
  }
  return result;
}

export async function* chatAgentStream(messages) {
  const conversationMessages = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  const MAX_ITERATIONS = 8;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (AI_PROVIDER === 'openrouter') {
      const stream = await openrouterChat({ messages: conversationMessages, model: resolveModel('general'), stream: true });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) yield { type: 'delta', text: delta };
          } catch {
            // ignore incomplete JSON
          }
        }
      }
      break;
    }

    // Ollama (local-first Qwen)
    if (AI_PROVIDER === 'ollama') {
      const stream = await ollamaChat({ messages: conversationMessages, model: resolveModel('general'), stream: true });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      outer: for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break outer;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            const content = parsed.message?.content || '';
            if (content) yield { type: 'delta', text: content };
            if (parsed.done === true) break outer;
          } catch {
            // Ollama emits raw JSON SSE lines; ignore malformed ones
          }
        }
      }
      break;
    }

    const stream = await anthropicStream(conversationMessages);
    let textBuffer = '';
    let toolUses = [];
    let currentTool = null;
    let inputBuf = '';
    let stopReason = 'end_turn';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // nothing yet
        } else if (event.content_block.type === 'tool_use') {
          currentTool = { id: event.content_block.id, name: event.content_block.name };
          inputBuf = '';
        }
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          textBuffer += event.delta.text;
          yield { type: 'delta', text: event.delta.text };
        } else if (event.delta.type === 'input_json_delta' && currentTool) {
          inputBuf += event.delta.partial_json;
        }
      }

      if (event.type === 'content_block_stop' && currentTool) {
        try { currentTool.input = JSON.parse(inputBuf); } catch { currentTool.input = {}; }
        toolUses.push({ ...currentTool });
        currentTool = null;
        inputBuf = '';
      }

      if (event.type === 'message_delta') {
        stopReason = event.delta.stop_reason || stopReason;
      }
    }

    if (stopReason !== 'tool_use' || !toolUses.length) break;

    const assistantContent = [];
    if (textBuffer) assistantContent.push({ type: 'text', text: textBuffer });
    for (const t of toolUses) {
      assistantContent.push({ type: 'tool_use', id: t.id, name: t.name, input: t.input });
    }
    conversationMessages.push({ role: 'assistant', content: assistantContent });

    const toolResults = [];
    for (const t of toolUses) {
      yield { type: 'tool_start', name: t.name, input: t.input };
      const result = await executeTool(t.name, t.input);
      yield { type: 'tool_done', name: t.name };
      toolResults.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(result, null, 2) });
    }
    conversationMessages.push({ role: 'user', content: toolResults });
  }
}
