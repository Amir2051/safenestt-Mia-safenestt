#!/usr/bin/env node --no-deprecation
import { Command } from 'commander';
import { header, ok, fail, info, section, box, dim } from './utils/display.js';
import { config } from './utils/config.js';
import { streamChat } from './services/aiService.js';
import { getAlerts, logActivity } from './db/index.js';
import chalk from 'chalk';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

import { caseCmd }     from './commands/case.js';
import { cryptoCmd }   from './commands/crypto.js';
import { searchCmd }   from './commands/search.js';
import { documentCmd } from './commands/document.js';
import { reportCmd }   from './commands/report.js';
import { alertsCmd }   from './commands/alerts.js';

const program = new Command();

program
  .name('mia')
  .description('Mia — Investigation Intelligence Terminal | SafeNestT / RZ Core')
  .version('1.0.0')
  .hook('preAction', () => {
    // Check unacknowledged alerts before any command
    try {
      const alerts = getAlerts(true);
      if (alerts.length) {
        console.log(chalk.red(`\n  ⚠  ${alerts.length} unacknowledged alert(s) — run: mia alerts check\n`));
      }
    } catch { /* db not ready yet */ }
  });

// ── Subcommands ───────────────────────────────────────────────────────────────
program.addCommand(caseCmd);
program.addCommand(cryptoCmd);
program.addCommand(searchCmd);
program.addCommand(documentCmd);
program.addCommand(reportCmd);
program.addCommand(alertsCmd);

// ── Chat (interactive REPL) ───────────────────────────────────────────────────
program
  .command('chat')
  .description('Start interactive AI investigation chat session')
  .option('-c, --case-id <id>', 'Attach to a case (gives Mia context)')
  .action(async (opts) => {
    header();
    section('INVESTIGATION CHAT SESSION');

    if (!config.anthropicKey) {
      fail('ANTHROPIC_API_KEY not set. Add it to cli/.env or backend/.env');
      process.exit(1);
    }

    if (opts.caseId) {
      const { getCaseById } = await import('./db/index.js');
      const c = getCaseById(opts.caseId.toUpperCase());
      if (c) {
        info(`Case context loaded: ${c.title} (${c.case_id})`);
      } else {
        fail(`Case ${opts.caseId} not found`);
      }
    }

    info('Type your query. Commands: /exit  /clear  /help');
    console.log('');

    const messages = [];

    if (opts.caseId) {
      const { getCaseById, getEvidence } = await import('./db/index.js');
      const c = getCaseById(opts.caseId.toUpperCase());
      if (c) {
        const evidence = getEvidence(opts.caseId.toUpperCase());
        messages.push({
          role: 'user',
          content: `[SYSTEM CONTEXT] I am working on case ${c.case_id}: "${c.title}". Type: ${c.type}. Victim: ${c.victim || 'unknown'}. Suspect: ${c.suspect || 'unknown'}. Description: ${c.description || 'N/A'}. Evidence items: ${evidence.length}. Please keep this context in mind for all my questions.`,
        });
        messages.push({ role: 'assistant', content: `Understood. I have loaded case ${c.case_id} — "${c.title}". Ready for investigation queries.` });
      }
    }

    const rl = readline.createInterface({ input, output });

    process.on('SIGINT', () => {
      console.log('\n');
      ok('Session ended');
      rl.close();
      process.exit(0);
    });

    while (true) {
      const line = await rl.question(chalk.green('  mia> ')).catch(() => '/exit');

      if (!line.trim()) continue;

      if (line.trim() === '/exit' || line.trim() === '/quit') {
        ok('Session ended');
        break;
      }

      if (line.trim() === '/clear') {
        messages.length = 0;
        console.clear();
        header();
        ok('Context cleared');
        continue;
      }

      if (line.trim() === '/help') {
        box(
          'CHAT COMMANDS:\n' +
          '  /exit    — End session\n' +
          '  /clear   — Clear conversation context\n' +
          '  /help    — Show this help\n\n' +
          'INVESTIGATION QUERIES:\n' +
          '  "Analyze this wallet: 0x..."\n' +
          '  "What are red flags for romance scam?"\n' +
          '  "Help me write an IC3 complaint"\n' +
          '  "Explain pig butchering fraud"\n' +
          '  "What evidence should I collect for crypto fraud?"'
        );
        continue;
      }

      messages.push({ role: 'user', content: line });

      try {
        process.stdout.write(chalk.cyan('\n  Mia: '));
        await streamChat(messages);
        // Capture the last response for context
        messages.push({ role: 'assistant', content: '[response]' });
      } catch (err) {
        fail(`AI error: ${err.message}`);
      }
    }

    rl.close();
  });

// ── Status dashboard ──────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show system status and case dashboard')
  .action(async () => {
    header();

    section('SYSTEM STATUS');
    console.log(`  AI Model:      ${chalk.green(config.aiModel)}`);
    console.log(`  Anthropic Key: ${config.anthropicKey ? chalk.green('✓ Configured') : chalk.red('✗ Missing')}`);
    console.log(`  Etherscan Key: ${config.etherscanKey ? chalk.green('✓ Configured') : chalk.yellow('⚠ Missing (wallet lookups limited)')}`);
    console.log(`  Database:      ${chalk.green(config.dbPath)}`);
    console.log(`  Cases Dir:     ${chalk.green(config.casesDir)}`);
    console.log('');

    const { getCases } = await import('./db/index.js');
    const cases = getCases();
    const open   = cases.filter(c => c.status === 'open').length;
    const closed = cases.filter(c => c.status === 'closed').length;

    section('CASE SUMMARY');
    console.log(`  Total Cases:   ${chalk.cyan(cases.length)}`);
    console.log(`  Open:          ${chalk.green(open)}`);
    console.log(`  Closed:        ${chalk.gray(closed)}`);
    console.log('');

    const alerts = getAlerts(true);
    if (alerts.length) {
      section('PENDING ALERTS');
      alerts.slice(0, 5).forEach(a => {
        const color = a.severity === 'high' || a.severity === 'critical' ? chalk.red : chalk.yellow;
        console.log(`  ${color(`[${a.severity.toUpperCase()}]`)} ${a.message.slice(0, 60)}`);
      });
      if (alerts.length > 5) dim(`  ... and ${alerts.length - 5} more`);
      console.log('');
    }

    section('QUICK COMMANDS');
    dim('  mia case new                    — Open new case');
    dim('  mia case list                   — List all cases');
    dim('  mia crypto scan <token>         — Risk-score a token');
    dim('  mia crypto wallet <address>     — ETH wallet lookup');
    dim('  mia search news <query>         — Search public news');
    dim('  mia search sanctions <name>     — OFAC check');
    dim('  mia search domain <domain>      — Domain WHOIS');
    dim('  mia document analyze <file>     — AI document analysis');
    dim('  mia report generate <case_id>   — Generate IC3 report');
    dim('  mia chat                        — Interactive AI chat');
    console.log('');
  });

// ── Default: show status if no args ──────────────────────────────────────────
if (process.argv.length <= 2) {
  program.parseAsync(['node', 'mia', 'status']).catch(() => program.help());
} else {
  program.parseAsync(process.argv).catch(err => {
    fail(err.message);
    process.exit(1);
  });
}
