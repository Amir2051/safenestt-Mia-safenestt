import { Command } from 'commander';
import { existsSync } from 'fs';
import { analyzeDocument, extractPatterns } from '../services/documentService.js';
import { addEvidence, getCaseById } from '../db/index.js';
import { ok, fail, info, warn, dim, section, box, table } from '../utils/display.js';
import chalk from 'chalk';

export const documentCmd = new Command('document');
documentCmd.description('Document analysis — extract text, patterns, and AI investigation insights');

// ── analyze ───────────────────────────────────────────────────────────────────
documentCmd
  .command('analyze <filePath>')
  .description('AI-powered investigation analysis of a document')
  .option('-c, --case-id <id>', 'Save analysis to case')
  .option('--context <context>', 'Extra context for the AI (e.g. "romance scam victim statement")')
  .option('--no-patterns', 'Skip pattern extraction')
  .action(async (filePath, opts) => {
    if (!existsSync(filePath)) {
      fail(`File not found: ${filePath}`);
      return;
    }

    if (opts.caseId) {
      const c = getCaseById(opts.caseId.toUpperCase());
      if (!c) { fail(`Case not found: ${opts.caseId}`); return; }
    }

    section(`DOCUMENT ANALYSIS — ${filePath.split('/').pop()}`);

    const ora = (await import('ora')).default;
    const spinner = ora('Extracting and analyzing document...').start();

    let result;
    try {
      result = await analyzeDocument(filePath, opts.context || '');
      spinner.stop();
    } catch (err) {
      spinner.fail('Analysis failed');
      fail(err.message);
      return;
    }

    info(`File: ${result.fileName} | Type: ${result.fileType} | Pages: ${result.pages} | Chars: ${result.charCount.toLocaleString()}`);
    console.log('');

    section('AI INVESTIGATION ANALYSIS');
    box(result.analysis);

    // Pattern extraction
    if (opts.patterns !== false) {
      const patterns = extractPatterns(result.extractedText);
      const hasPatterns = Object.values(patterns).some(a => a.length > 0);

      if (hasPatterns) {
        section('EXTRACTED PATTERNS');

        if (patterns.emails.length) {
          console.log(chalk.cyan('  Emails:'));
          patterns.emails.forEach(e => dim(`    ${e}`));
        }
        if (patterns.phones.length) {
          console.log(chalk.cyan('  Phones:'));
          patterns.phones.forEach(p => dim(`    ${p}`));
        }
        if (patterns.ethAddresses.length) {
          console.log(chalk.yellow('  ETH Addresses:'));
          patterns.ethAddresses.forEach(a => warn(`    ${a}`));
        }
        if (patterns.btcAddresses.length) {
          console.log(chalk.yellow('  BTC Addresses:'));
          patterns.btcAddresses.forEach(a => warn(`    ${a}`));
        }
        if (patterns.urls.length) {
          console.log(chalk.cyan('  URLs:'));
          patterns.urls.slice(0, 10).forEach(u => dim(`    ${u}`));
        }
        if (patterns.amounts.length) {
          console.log(chalk.green('  Amounts:'));
          patterns.amounts.forEach(a => info(`    ${a}`));
        }
        if (patterns.dates.length) {
          console.log(chalk.cyan('  Dates:'));
          patterns.dates.slice(0, 15).forEach(d => dim(`    ${d}`));
        }
      } else {
        dim('  No patterns extracted (emails, addresses, amounts, etc.)');
      }
    }

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'document',
        description: `Document analysis: ${result.fileName} (${result.fileType}, ${result.pages} pages)`,
        content:     result.analysis,
        file_path:   filePath,
        hash:        null,
      });
      ok(`\n  Analysis saved to case ${opts.caseId}`);
    } else {
      dim('\n  Tip: Add --case-id RZ-XXXX to save this analysis to a case');
    }
  });

// ── patterns ──────────────────────────────────────────────────────────────────
documentCmd
  .command('patterns <filePath>')
  .description('Extract only patterns (emails, addresses, amounts) — no AI')
  .option('-c, --case-id <id>', 'Save to case')
  .action(async (filePath, opts) => {
    if (!existsSync(filePath)) {
      fail(`File not found: ${filePath}`);
      return;
    }

    section(`PATTERN EXTRACTION — ${filePath.split('/').pop()}`);

    const { extractText } = await import('../services/documentService.js');
    const ora = (await import('ora')).default;
    const spinner = ora('Extracting text...').start();

    let text;
    try {
      const result = await extractText(filePath);
      text = result.text;
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    const patterns = extractPatterns(text);

    const rows = [];
    if (patterns.emails.length)        rows.push(['Emails',        patterns.emails.length,        patterns.emails.slice(0, 3).join(', ')]);
    if (patterns.phones.length)        rows.push(['Phones',        patterns.phones.length,        patterns.phones.slice(0, 3).join(', ')]);
    if (patterns.ethAddresses.length)  rows.push(['ETH Addresses', patterns.ethAddresses.length,  patterns.ethAddresses.slice(0, 2).join(', ')]);
    if (patterns.btcAddresses.length)  rows.push(['BTC Addresses', patterns.btcAddresses.length,  patterns.btcAddresses.slice(0, 2).join(', ')]);
    if (patterns.urls.length)          rows.push(['URLs',          patterns.urls.length,          patterns.urls.slice(0, 2).join(', ')]);
    if (patterns.amounts.length)       rows.push(['Amounts',       patterns.amounts.length,       patterns.amounts.slice(0, 5).join(', ')]);
    if (patterns.dates.length)         rows.push(['Dates',         patterns.dates.length,         patterns.dates.slice(0, 5).join(', ')]);

    if (rows.length) {
      table(['Type', 'Count', 'Samples'], rows.map(r => [r[0], String(r[1]), r[2]]));
    } else {
      info('No patterns found in document');
    }
  });
