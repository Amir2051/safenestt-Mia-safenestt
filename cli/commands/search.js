import { Command } from 'commander';
import { searchNews, searchWikipedia, checkSanctions, lookupDomain } from '../services/searchService.js';
import { addEvidence } from '../db/index.js';
import { ok, fail, info, warn, dim, section, box, table } from '../utils/display.js';
import chalk from 'chalk';

export const searchCmd = new Command('search');
searchCmd.description('Public records — news, Wikipedia, OFAC sanctions, domain WHOIS');

// ── news ──────────────────────────────────────────────────────────────────────
searchCmd
  .command('news <query>')
  .description('Search public news for a person, company, or topic')
  .option('-n, --max <n>', 'Max results', '8')
  .option('-c, --case-id <id>', 'Save results to case')
  .action(async (query, opts) => {
    section(`NEWS SEARCH — "${query}"`);

    const ora = (await import('ora')).default;
    const spinner = ora('Searching news...').start();

    let results;
    try {
      results = await searchNews(query, parseInt(opts.max) || 8);
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    if (!results.length) { info('No news results found'); return; }

    results.forEach((r, i) => {
      console.log(chalk.cyan(`\n  [${i + 1}] ${r.title}`));
      dim(`      ${r.source || 'Unknown'} | ${r.publishedAt || 'date unknown'}`);
      if (r.summary) dim(`      ${r.summary.slice(0, 120)}...`);
      dim(`      ${r.url}`);
    });

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'news_search',
        description: `News search: "${query}" — ${results.length} results`,
        content:     JSON.stringify(results),
        file_path:   null,
        hash:        null,
      });
      ok(`\n  Saved to case ${opts.caseId}`);
    }
  });

// ── wiki ──────────────────────────────────────────────────────────────────────
searchCmd
  .command('wiki <query>')
  .description('Wikipedia summary for a person or entity')
  .option('-c, --case-id <id>', 'Save to case')
  .action(async (query, opts) => {
    section(`WIKIPEDIA — "${query}"`);

    const ora = (await import('ora')).default;
    const spinner = ora('Fetching Wikipedia...').start();

    let result;
    try {
      result = await searchWikipedia(query);
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    if (!result) { info('No Wikipedia entry found'); return; }

    box(`${result.title}\n\n${result.summary}`);
    dim(`  Source: ${result.url}`);

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'wikipedia',
        description: `Wikipedia: ${result.title}`,
        content:     result.summary,
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }
  });

// ── sanctions ─────────────────────────────────────────────────────────────────
searchCmd
  .command('sanctions <name>')
  .description('Check OFAC / consolidated sanctions list (public API)')
  .option('-c, --case-id <id>', 'Save to case')
  .action(async (name, opts) => {
    section(`SANCTIONS CHECK — "${name}"`);

    const ora = (await import('ora')).default;
    const spinner = ora('Querying OFAC / Trade.gov...').start();

    let result;
    try {
      result = await checkSanctions(name);
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    if (!result.checked) {
      warn(`  Check unavailable: ${result.reason}`);
      return;
    }

    if (result.isFlagged) {
      warn(chalk.red.bold(`  ⚠  MATCHES FOUND ON SANCTIONS LIST`));
      console.log('');
      table(
        ['Name', 'Type', 'Source', 'Country'],
        result.hits.map(h => [h.name, h.type || '-', h.source || '-', h.country || '-'])
      );
    } else {
      ok(`  No matches on sanctions list for "${name}"`);
    }

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'sanctions_check',
        description: `Sanctions check: "${name}" — ${result.isFlagged ? `${result.hits.length} MATCHES` : 'CLEAR'}`,
        content:     JSON.stringify(result),
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }
  });

// ── domain ────────────────────────────────────────────────────────────────────
searchCmd
  .command('domain <domain>')
  .description('WHOIS / RDAP lookup for a domain')
  .option('-c, --case-id <id>', 'Save to case')
  .action(async (domain, opts) => {
    section(`DOMAIN LOOKUP — ${domain}`);

    const ora = (await import('ora')).default;
    const spinner = ora('Querying RDAP...').start();

    let result;
    try {
      result = await lookupDomain(domain);
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    if (!result) { fail('Domain lookup failed or not found'); return; }

    box(
      `Domain:     ${result.domain}\n` +
      `Registered: ${result.registered?.split('T')[0] || 'Unknown'}\n` +
      `Expires:    ${result.expires?.split('T')[0] || 'Unknown'}\n` +
      `Registrar:  ${result.registrar || 'Unknown'}\n` +
      `Status:     ${(result.status || []).join(', ') || 'Unknown'}`
    );

    // Flag fresh domains
    if (result.registered) {
      const ageDays = (Date.now() - new Date(result.registered).getTime()) / 86400000;
      if (ageDays < 90) {
        warn(`  Domain registered only ${Math.ceil(ageDays)} days ago — HIGH phishing risk`);
      }
    }

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'domain_whois',
        description: `Domain WHOIS: ${domain} — registered ${result.registered?.split('T')[0] || 'unknown'}`,
        content:     JSON.stringify(result),
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }
  });
