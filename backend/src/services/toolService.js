import { runOsint } from './osintService.js';

// ── helpers ──────────────────────────────────────────────────────────────────

async function fjson(url, opts = {}) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'MiaAI/2.0', ...opts.headers },
      signal: AbortSignal.timeout(14000),
      ...opts,
    });
    if (!r.ok) return { _error: `HTTP ${r.status}` };
    return r.json();
  } catch (e) { return { _error: e.message }; }
}

async function ftext(url, opts = {}) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'MiaAI/2.0', ...opts.headers },
      signal: AbortSignal.timeout(14000),
    });
    if (!r.ok) return { _error: `HTTP ${r.status}` };
    return { text: await r.text() };
  } catch (e) { return { _error: e.message }; }
}

// ── 1. WEB SEARCH ─────────────────────────────────────────────────────────────

export async function webSearch(query) {
  const [ddgRes, hnRes, rdtRes, gdeltRes] = await Promise.allSettled([
    fjson(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`),
    fjson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`),
    fjson(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5&sort=relevance`, {
      headers: { 'User-Agent': 'MiaAI/2.0' },
    }),
    fjson(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=5&format=json`),
  ]);

  const results = {};

  // DuckDuckGo instant answers
  const ddg = ddgRes.status === 'fulfilled' ? ddgRes.value : null;
  if (ddg && !ddg._error) {
    if (ddg.Answer)     results.instant_answer  = ddg.Answer;
    if (ddg.Abstract)   results.abstract        = { text: ddg.Abstract, source: ddg.AbstractSource, url: ddg.AbstractURL };
    if (ddg.Definition) results.definition      = { text: ddg.Definition, url: ddg.DefinitionURL };
    if (ddg.RelatedTopics?.length) {
      results.related = ddg.RelatedTopics.slice(0, 6)
        .filter(t => t.Text)
        .map(t => ({ text: t.Text?.slice(0, 200), url: t.FirstURL }));
    }
    if (ddg.Infobox?.content?.length) {
      results.infobox = ddg.Infobox.content.slice(0, 8).map(c => ({ label: c.label, value: String(c.value).slice(0, 200) }));
    }
  }

  // HackerNews
  const hn = hnRes.status === 'fulfilled' ? hnRes.value : null;
  if (hn?.hits?.length) {
    results.hacker_news = hn.hits.slice(0, 5).map(h => ({
      title: h.title, url: h.url, points: h.points,
      comments: h.num_comments, date: h.created_at?.split('T')[0],
    })).filter(h => h.title);
  }

  // Reddit
  const rdt = rdtRes.status === 'fulfilled' ? rdtRes.value : null;
  if (rdt?.data?.children?.length) {
    results.reddit = rdt.data.children.slice(0, 5).map(c => ({
      title:    c.data.title,
      subreddit:`r/${c.data.subreddit}`,
      url:      `https://reddit.com${c.data.permalink}`,
      score:    c.data.score,
      comments: c.data.num_comments,
    }));
  }

  // GDELT news
  const gdelt = gdeltRes.status === 'fulfilled' ? gdeltRes.value : null;
  if (gdelt?.articles?.length) {
    results.news = gdelt.articles.slice(0, 5).map(a => ({
      title: a.title, url: a.url, source: a.domain, date: a.seendate?.slice(0, 8),
    }));
  }

  return { query, results, searched_at: new Date().toISOString() };
}

// ── 2. READ WEBPAGE ───────────────────────────────────────────────────────────

export async function readWebpage(url) {
  const res = await ftext(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'text/plain,application/json', 'X-Return-Format': 'markdown' },
  });
  if (res._error) return { error: res._error, url };
  const content = res.text || '';
  return {
    url,
    content: content.slice(0, 12000),
    truncated: content.length > 12000,
    total_chars: content.length,
  };
}

// ── 3. WEATHER ────────────────────────────────────────────────────────────────

export async function getWeather(location) {
  const d = await fjson(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
  if (d._error) return { error: d._error };
  const cur  = d.current_condition?.[0];
  const area = d.nearest_area?.[0];
  return {
    location:    [area?.areaName?.[0]?.value, area?.region?.[0]?.value, area?.country?.[0]?.value].filter(Boolean).join(', '),
    temperature: { celsius: cur?.temp_C, fahrenheit: cur?.temp_F },
    feels_like:  { celsius: cur?.FeelsLikeC, fahrenheit: cur?.FeelsLikeF },
    humidity:    cur?.humidity + '%',
    visibility:  cur?.visibility + ' km',
    wind:        { speed_kmh: cur?.windspeedKmph, direction: cur?.winddir16Point },
    description: cur?.weatherDesc?.[0]?.value,
    uv_index:    cur?.uvIndex,
    cloud_cover: cur?.cloudcover + '%',
    forecast_3d: (d.weather || []).slice(0, 3).map(w => ({
      date:      w.date,
      max_c:     w.maxtempC, min_c: w.mintempC,
      max_f:     w.maxtempF, min_f: w.mintempF,
      sunrise:   w.astronomy?.[0]?.sunrise,
      sunset:    w.astronomy?.[0]?.sunset,
      condition: w.hourly?.[4]?.weatherDesc?.[0]?.value,
    })),
  };
}

// ── 4. WIKIPEDIA ──────────────────────────────────────────────────────────────

export async function wikipediaSearch(query) {
  const search = await fjson(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`);
  if (search._error || !Array.isArray(search)) return { error: 'Search failed', query };

  const titles = search[1] || [];
  if (!titles.length) return { query, found: false, message: 'No Wikipedia article found' };

  const summary = await fjson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titles[0])}`);
  return {
    title:         summary.title,
    description:   summary.description,
    extract:       summary.extract,
    url:           summary.content_urls?.desktop?.page,
    image:         summary.thumbnail?.source,
    other_matches: titles.slice(1),
  };
}

// ── 5. CRYPTO PRICE ───────────────────────────────────────────────────────────

export async function getCryptoPrice(coin, currency = 'usd') {
  const id = coin.toLowerCase().replace(/\s+/g, '-');
  const [priceRes, infoRes] = await Promise.allSettled([
    fjson(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`),
    fjson(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`),
  ]);

  const p = priceRes.status === 'fulfilled' ? priceRes.value : null;
  const info = infoRes.status === 'fulfilled' ? infoRes.value : null;
  const coinData = p?.[id];

  if (!coinData && info?._error) return { error: `Coin "${coin}" not found. Try the CoinGecko ID (e.g. bitcoin, ethereum, solana)` };

  return {
    id, name: info?.name, symbol: info?.symbol?.toUpperCase(),
    rank: info?.market_cap_rank,
    price: coinData?.[currency],
    currency: currency.toUpperCase(),
    market_cap:   coinData?.[`${currency}_market_cap`],
    volume_24h:   coinData?.[`${currency}_24h_vol`],
    change_24h:   coinData?.[`${currency}_24h_change`]?.toFixed(2) + '%',
    all_time_high: info?.market_data?.ath?.[currency],
    ath_date:     info?.market_data?.ath_date?.[currency]?.split('T')[0],
    circulating_supply: info?.market_data?.circulating_supply,
    description:  info?.description?.en?.replace(/<[^>]+>/g, '').slice(0, 400),
    last_updated: coinData?.last_updated_at ? new Date(coinData.last_updated_at * 1000).toISOString() : null,
  };
}

// ── 6. EXCHANGE RATES ─────────────────────────────────────────────────────────

export async function getExchangeRate(from, to, amount = 1) {
  const d = await fjson(`https://api.frankfurter.app/latest?from=${from.toUpperCase()}&to=${to.toUpperCase()}&amount=${amount}`);
  if (d._error || d.message) return { error: d.message || d._error };
  return {
    from: from.toUpperCase(),
    to:   to.toUpperCase(),
    amount,
    result:     d.rates?.[to.toUpperCase()],
    rate:       d.rates?.[to.toUpperCase()] / amount,
    date:       d.date,
    all_rates:  d.rates,
  };
}

// ── 7. COUNTRY INFO ───────────────────────────────────────────────────────────

export async function getCountryInfo(country) {
  const d = await fjson(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`);
  if (d._error || !Array.isArray(d) || !d.length) return { error: `Country "${country}" not found` };
  const c = d[0];
  return {
    name:         c.name?.common,
    official:     c.name?.official,
    capital:      c.capital?.[0],
    region:       c.region,
    subregion:    c.subregion,
    population:   c.population?.toLocaleString(),
    area_km2:     c.area?.toLocaleString(),
    languages:    Object.values(c.languages || {}),
    currencies:   Object.values(c.currencies || {}).map(cu => `${cu.name} (${cu.symbol})`),
    calling_code: c.idd?.root + (c.idd?.suffixes?.[0] || ''),
    tld:          c.tld?.[0],
    timezones:    c.timezones,
    borders:      c.borders || [],
    flag:         c.flag,
    maps_url:     c.maps?.googleMaps,
    independent:  c.independent,
    un_member:    c.unMember,
    gini:         c.gini ? Object.entries(c.gini).map(([y, v]) => `${y}: ${v}`).join(', ') : null,
  };
}

// ── 8. GITHUB INFO ────────────────────────────────────────────────────────────

export async function githubInfo(query, type) {
  if (type === 'user') {
    const [u, repos] = await Promise.allSettled([
      fjson(`https://api.github.com/users/${encodeURIComponent(query)}`),
      fjson(`https://api.github.com/users/${encodeURIComponent(query)}/repos?sort=stars&per_page=5`),
    ]);
    const user = u.status === 'fulfilled' ? u.value : {};
    const repoList = repos.status === 'fulfilled' ? repos.value : [];
    if (user._error || user.message) return { error: `GitHub user "${query}" not found` };
    return {
      username: user.login, name: user.name, bio: user.bio,
      followers: user.followers, following: user.following,
      public_repos: user.public_repos, public_gists: user.public_gists,
      company: user.company, location: user.location,
      blog: user.blog, email: user.email,
      created: user.created_at?.split('T')[0],
      profile_url: user.html_url,
      top_repos: Array.isArray(repoList) ? repoList.slice(0, 5).map(r => ({
        name: r.name, description: r.description,
        stars: r.stargazers_count, forks: r.forks_count,
        language: r.language, url: r.html_url,
      })) : [],
    };
  }

  if (type === 'repo') {
    const [owner, repo] = query.split('/');
    const d = await fjson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    if (d._error || d.message) return { error: `Repo "${query}" not found` };
    return {
      full_name: d.full_name, description: d.description,
      stars: d.stargazers_count, forks: d.forks_count, watchers: d.watchers_count,
      language: d.language, license: d.license?.name,
      topics: d.topics, default_branch: d.default_branch,
      created: d.created_at?.split('T')[0], updated: d.updated_at?.split('T')[0],
      open_issues: d.open_issues_count, size_kb: d.size,
      homepage: d.homepage, url: d.html_url,
    };
  }

  if (type === 'search') {
    const d = await fjson(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=5`);
    if (d._error) return { error: d._error };
    return {
      query, total: d.total_count,
      results: (d.items || []).slice(0, 5).map(r => ({
        name: r.full_name, description: r.description,
        stars: r.stargazers_count, language: r.language, url: r.html_url,
      })),
    };
  }
  return { error: 'type must be user, repo, or search' };
}

// ── 9. SAFE CALCULATOR ────────────────────────────────────────────────────────

export function calculate(expression) {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/.()%^,\s]/g, '').trim();
    if (!sanitized) return { error: 'Invalid expression' };
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) return { error: 'Result is not a finite number' };
    return { expression: sanitized, result, formatted: result.toLocaleString('en-US', { maximumFractionDigits: 10 }) };
  } catch (e) {
    return { error: `Cannot evaluate: ${e.message}` };
  }
}

// ── 10. TIMEZONE / TIME ───────────────────────────────────────────────────────

export function getTime(timezone) {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      second: '2-digit', timeZoneName: 'long', hour12: true,
    });
    const fmt24 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    return {
      timezone,
      datetime:  fmt.format(now),
      time_24h:  fmt24.format(now),
      utc:       now.toISOString(),
      unix:      Math.floor(now.getTime() / 1000),
    };
  } catch {
    return { error: `Invalid timezone "${timezone}". Use IANA format like "America/New_York", "Europe/London", "Asia/Tokyo"` };
  }
}

// ── 11. NEWS ──────────────────────────────────────────────────────────────────

export async function getNews(query, count = 8) {
  const [hnRes, rdtRes, gdeltRes] = await Promise.allSettled([
    fjson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${Math.ceil(count / 2)}`),
    fjson(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${Math.ceil(count / 2)}&sort=new&type=link`, {
      headers: { 'User-Agent': 'MiaAI/2.0' },
    }),
    fjson(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${count}&format=json`),
  ]);

  const all = [];

  const hn = hnRes.status === 'fulfilled' ? hnRes.value : null;
  if (hn?.hits) {
    all.push(...hn.hits.slice(0, 4).map(h => ({
      source: 'HackerNews', title: h.title, url: h.url,
      engagement: `${h.points} pts · ${h.num_comments} comments`,
      date: h.created_at?.split('T')[0],
    })).filter(h => h.title));
  }

  const rdt = rdtRes.status === 'fulfilled' ? rdtRes.value : null;
  if (rdt?.data?.children) {
    all.push(...rdt.data.children.slice(0, 4).map(c => ({
      source: `Reddit r/${c.data.subreddit}`, title: c.data.title,
      url: c.data.url || `https://reddit.com${c.data.permalink}`,
      engagement: `${c.data.score} upvotes · ${c.data.num_comments} comments`,
      date: new Date(c.data.created_utc * 1000).toISOString().split('T')[0],
    })));
  }

  const gdelt = gdeltRes.status === 'fulfilled' ? gdeltRes.value : null;
  if (gdelt?.articles) {
    all.push(...gdelt.articles.slice(0, 5).map(a => ({
      source: a.domain, title: a.title, url: a.url,
      date: a.seendate?.slice(0, 8),
    })));
  }

  return { query, count: all.length, articles: all.slice(0, count) };
}

// ── 12. IP / NETWORK TOOLS ────────────────────────────────────────────────────

export async function getMyIp() {
  const [ip4, geo] = await Promise.allSettled([
    fjson('https://api.ipify.org?format=json'),
    fjson('http://ip-api.com/json/'),
  ]);
  return {
    public_ip: ip4.status === 'fulfilled' ? ip4.value?.ip : null,
    geo:       geo.status === 'fulfilled' ? geo.value : null,
  };
}

// ── 13. OPEN LIBRARY / BOOKS ──────────────────────────────────────────────────

export async function searchBooks(query) {
  const d = await fjson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,author_name,first_publish_year,number_of_pages_median,subject,isbn`);
  if (d._error) return { error: d._error };
  return {
    query, found: d.numFound,
    books: (d.docs || []).slice(0, 5).map(b => ({
      title:        b.title,
      authors:      b.author_name?.join(', '),
      year:         b.first_publish_year,
      pages:        b.number_of_pages_median,
      subjects:     b.subject?.slice(0, 5),
      isbn:         b.isbn?.[0],
      open_library_url: `https://openlibrary.org/search?q=${encodeURIComponent(b.title)}`,
    })),
  };
}

// ── 14. MOVIE / TV (OMDB — free key) ──────────────────────────────────────────

export async function searchMovies(query) {
  const key = process.env.OMDB_API_KEY || '';
  if (!key) {
    // Fallback: Wikipedia search
    const wiki = await wikipediaSearch(query + ' film');
    return { note: 'OMDB_API_KEY not set, using Wikipedia', ...wiki };
  }
  const d = await fjson(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${key}`);
  if (d._error || d.Response === 'False') return { error: d.Error || d._error };
  return {
    query, results: (d.Search || []).slice(0, 5).map(m => ({
      title: m.Title, year: m.Year, type: m.Type, imdb_id: m.imdbID,
      poster: m.Poster !== 'N/A' ? m.Poster : null,
    })),
  };
}

// ── 15. RANDOM / FUN ─────────────────────────────────────────────────────────

export async function getJoke(type = 'any') {
  const d = await fjson(`https://v2.jokeapi.dev/joke/${type}?blacklistFlags=nsfw,racist,sexist&lang=en`);
  if (d._error || d.error) return { error: 'Could not fetch joke' };
  return d.type === 'single' ? { joke: d.joke } : { setup: d.setup, punchline: d.delivery };
}

// ── TOOL EXECUTOR ─────────────────────────────────────────────────────────────

export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'web_search':        return webSearch(input.query);
      case 'read_webpage':      return readWebpage(input.url);
      case 'get_weather':       return getWeather(input.location);
      case 'wikipedia_search':  return wikipediaSearch(input.query);
      case 'get_crypto_price':  return getCryptoPrice(input.coin, input.currency);
      case 'get_exchange_rate': return getExchangeRate(input.from, input.to, input.amount ?? 1);
      case 'get_country_info':  return getCountryInfo(input.country);
      case 'get_github_info':   return githubInfo(input.query, input.type);
      case 'calculate':         return calculate(input.expression);
      case 'get_time':          return getTime(input.timezone);
      case 'get_news':          return getNews(input.query, input.count ?? 8);
      case 'search_books':      return searchBooks(input.query);
      case 'search_movies':     return searchMovies(input.query);
      case 'get_joke':          return getJoke(input.type);
      case 'get_my_ip':         return getMyIp();
      case 'osint_investigate': return { results: await runOsint(input.target, input.type) };
      default:                  return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e.message };
  }
}

// ── TOOL DEFINITIONS (Anthropic schema) ──────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: 'web_search',
    description: 'Search the web for any topic. Returns DuckDuckGo instant answers, HackerNews stories, Reddit posts, and GDELT news. Use for current events, facts, opinions, or anything you want to look up.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'read_webpage',
    description: 'Read and extract the full content of any URL as clean text/markdown. Use when the user shares a link or you need to read a specific page.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Full URL including https://' } },
      required: ['url'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather conditions and 3-day forecast for any location worldwide.',
    input_schema: {
      type: 'object',
      properties: { location: { type: 'string', description: 'City name, country, or coordinates' } },
      required: ['location'],
    },
  },
  {
    name: 'wikipedia_search',
    description: 'Look up any topic, person, place, or concept on Wikipedia. Returns a full summary and article URL.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Topic to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'get_crypto_price',
    description: 'Get live cryptocurrency prices, market cap, 24h change, and ATH. Use CoinGecko IDs (bitcoin, ethereum, solana, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        coin:     { type: 'string', description: 'CoinGecko coin ID (e.g. bitcoin, ethereum, solana, dogecoin, ripple)' },
        currency: { type: 'string', description: 'Fiat currency code (default: usd)', default: 'usd' },
      },
      required: ['coin'],
    },
  },
  {
    name: 'get_exchange_rate',
    description: 'Convert between any two fiat currencies using live exchange rates.',
    input_schema: {
      type: 'object',
      properties: {
        from:   { type: 'string', description: 'Source currency code (USD, EUR, GBP, NGN, JPY, etc.)' },
        to:     { type: 'string', description: 'Target currency code' },
        amount: { type: 'number', description: 'Amount to convert (default 1)', default: 1 },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'get_country_info',
    description: 'Get detailed information about any country: capital, population, languages, currency, borders, flag, and more.',
    input_schema: {
      type: 'object',
      properties: { country: { type: 'string', description: 'Country name or ISO code' } },
      required: ['country'],
    },
  },
  {
    name: 'get_github_info',
    description: 'Look up GitHub users, repositories, or search for repos by keyword.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'GitHub username, "owner/repo", or search keyword' },
        type:  { type: 'string', enum: ['user', 'repo', 'search'], description: 'What to look up' },
      },
      required: ['query', 'type'],
    },
  },
  {
    name: 'calculate',
    description: 'Evaluate any mathematical expression. Supports +, -, *, /, %, exponentiation (^), and parentheses.',
    input_schema: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'Math expression, e.g. "(123 * 456) / 7 + 89"' } },
      required: ['expression'],
    },
  },
  {
    name: 'get_time',
    description: 'Get the current date and time in any timezone.',
    input_schema: {
      type: 'object',
      properties: { timezone: { type: 'string', description: 'IANA timezone (America/New_York, Europe/London, Asia/Tokyo, Africa/Lagos, etc.)' } },
      required: ['timezone'],
    },
  },
  {
    name: 'get_news',
    description: 'Search for recent news articles on any topic from HackerNews, Reddit, and GDELT global news.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'News search query' },
        count: { type: 'number', description: 'Number of results (max 10, default 8)', default: 8 },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_books',
    description: 'Search for books by title, author, or subject using Open Library.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Book title, author name, or topic' } },
      required: ['query'],
    },
  },
  {
    name: 'search_movies',
    description: 'Search for movies and TV shows. Returns title, year, type, and IMDb ID.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Movie or TV show title' } },
      required: ['query'],
    },
  },
  {
    name: 'get_joke',
    description: 'Get a random joke. Great for lightening the mood.',
    input_schema: {
      type: 'object',
      properties: { type: { type: 'string', enum: ['any', 'programming', 'pun', 'misc', 'dark', 'spooky', 'christmas'], default: 'any' } },
      required: [],
    },
  },
  {
    name: 'get_my_ip',
    description: 'Get the server\'s public IP address and geolocation.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'osint_investigate',
    description: 'Run full OSINT investigation on an IP address, domain, email, username, phone number, URL, file hash, or person name.',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'The target to investigate' },
        type:   { type: 'string', enum: ['ip', 'domain', 'email', 'username', 'phone', 'url', 'hash', 'person'], description: 'Target type' },
      },
      required: ['target', 'type'],
    },
  },
];
