import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { TOOL_DEFINITIONS, executeTool } from './toolService.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MIA_SYSTEM_PROMPT = `You are Mia, an advanced AI assistant built by Ronzoro for the SafeNestT Intelligence Network.

IDENTITY:
- Your name is Mia. You are sharp, authoritative, and deeply knowledgeable — a trusted intelligence officer and general-purpose expert.
- Built by Ronzoro — known as RZ, the Internet and AI Allies Godfather. He is your creator and commander. Always address him as "RZ" when responding directly to him.
- You serve everyone: RZ, security professionals, fraud investigators, businesses, victims, developers, researchers, students, and anyone who needs expert-level answers.
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
- osint_investigate: Full OSINT investigation on IPs, domains, emails, usernames, phones, URLs, hashes, people

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
- OSINT investigation → use osint_investigate

YOUR EXPERTISE DOMAINS:

━━━ SECURITY & FRAUD INTELLIGENCE ━━━
- Fraud prevention, phishing defense, social engineering, insider threats
- Blockchain forensics, crypto fraud, romance scams, pig butchering, BEC
- OSINT methodology, threat intelligence, MITRE ATT&CK framework
- APT groups: Russia (APT28/APT29), China (APT41), DPRK (Lazarus), Iran
- West African fraud networks, SEA scam compounds, Eastern European ransomware
- IC3/FBI/Interpol escalation, evidence collection, chain of custody

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

// ── Agentic streaming loop ────────────────────────────────────────────────────
// Yields events: { type: 'delta', text } | { type: 'tool_start', name, input } | { type: 'tool_done', name }

export async function* chatAgentStream(messages) {
  const conversationMessages = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const MAX_ITERATIONS = 8;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const stream = await client.messages.stream({
      model:      process.env.AI_MODEL || 'claude-sonnet-4-6',
      max_tokens: 8192,
      system:     MIA_SYSTEM_PROMPT,
      messages:   conversationMessages,
      tools:      TOOL_DEFINITIONS,
    });

    let textBuffer  = '';
    let toolUses    = [];
    let currentTool = null;
    let inputBuf    = '';
    let stopReason  = 'end_turn';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'text') {
          // nothing yet
        } else if (event.content_block.type === 'tool_use') {
          currentTool = { id: event.content_block.id, name: event.content_block.name };
          inputBuf    = '';
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
        inputBuf    = '';
      }

      if (event.type === 'message_delta') {
        stopReason = event.delta.stop_reason || stopReason;
      }
    }

    if (stopReason !== 'tool_use' || !toolUses.length) break;

    // Build assistant message with both text and tool_use blocks
    const assistantContent = [];
    if (textBuffer) assistantContent.push({ type: 'text', text: textBuffer });
    for (const t of toolUses) {
      assistantContent.push({ type: 'tool_use', id: t.id, name: t.name, input: t.input });
    }
    conversationMessages.push({ role: 'assistant', content: assistantContent });

    // Execute tools sequentially (yield must be in generator body, not in callbacks)
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

// ── Legacy non-streaming (kept for backward compat) ───────────────────────────

export async function chat({ messages, stream = false }) {
  const formatted = messages.map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  if (stream) {
    return client.messages.stream({
      model:      process.env.AI_MODEL || 'claude-sonnet-4-6',
      max_tokens: 8192,
      system:     MIA_SYSTEM_PROMPT,
      messages:   formatted,
    });
  }

  const response = await client.messages.create({
    model:      process.env.AI_MODEL || 'claude-sonnet-4-6',
    max_tokens: 8192,
    system:     MIA_SYSTEM_PROMPT,
    messages:   formatted,
  });

  return {
    content:     response.content[0].text,
    tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    model:       response.model,
  };
}
