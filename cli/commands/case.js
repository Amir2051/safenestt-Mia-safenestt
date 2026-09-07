import { Command } from 'commander';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import {
  createCase, getCases, getCaseById, updateCase,
  addEvidence, getEvidence, logActivity,
} from '../db/index.js';
import { ok, fail, info, dim, section, box, table, statusBadge } from '../utils/display.js';
import { analyze } from '../services/aiService.js';

export const caseCmd = new Command('case');
caseCmd.description('Case management — create, view, update cases and evidence');

// ── new ───────────────────────────────────────────────────────────────────────
caseCmd
  .command('new')
  .description('Open a new investigation case')
  .option('-t, --title <title>', 'Case title')
  .option('--type <type>', 'Case type (fraud|cyber|romance|investment|phishing)', 'fraud')
  .option('--victim <victim>', 'Victim name or ID')
  .option('--suspect <suspect>', 'Suspect name or ID')
  .option('-d, --description <desc>', 'Brief description')
  .action(async (opts) => {
    const rl = readline.createInterface({ input, output });
    const ask = async (prompt, def) => {
      const ans = await rl.question(`  ${prompt}${def ? ` [${def}]` : ''}: `);
      return ans.trim() || def || '';
    };

    section('NEW INVESTIGATION CASE');

    const title       = opts.title       || await ask('Case title');
    const type        = opts.type        || await ask('Case type (fraud/cyber/romance/investment/phishing)', 'fraud');
    const victim      = opts.victim      || await ask('Victim name / ID', '');
    const suspect     = opts.suspect     || await ask('Suspect name / ID (if known)', '');
    const description = opts.description || await ask('Brief description', '');

    rl.close();

    if (!title) { fail('Case title is required'); process.exit(1); }

    const caseId = createCase({ title, type, victim, suspect, description });
    ok(`Case created: ${caseId}`);
    box(`Title:   ${title}\nType:    ${type}\nVictim:  ${victim || 'Unknown'}\nSuspect: ${suspect || 'Unknown'}\n\nStatus:  OPEN\nID:      ${caseId}`);
    info(`Run: mia case view ${caseId}`);
  });

// ── list ──────────────────────────────────────────────────────────────────────
caseCmd
  .command('list')
  .description('List all cases')
  .option('-s, --status <status>', 'Filter by status (open|closed|pending)')
  .action((opts) => {
    const cases = getCases(opts.status ? { status: opts.status } : {});
    if (!cases.length) { info('No cases found'); return; }

    section(`CASES (${cases.length})`);
    table(
      ['Case ID', 'Title', 'Type', 'Status', 'Victim', 'Created'],
      cases.map(c => [
        c.case_id,
        c.title.slice(0, 35),
        c.type,
        statusBadge(c.status),
        (c.victim || '-').slice(0, 20),
        c.created_at.split(' ')[0],
      ])
    );
  });

// ── view ──────────────────────────────────────────────────────────────────────
caseCmd
  .command('view <caseId>')
  .description('View full case details and evidence')
  .action((caseId) => {
    const c = getCaseById(caseId.toUpperCase());
    if (!c) { fail(`Case not found: ${caseId}`); process.exit(1); }

    section(`CASE FILE — ${c.case_id}`);
    box(
      `Title:       ${c.title}\n` +
      `Type:        ${c.type}\n` +
      `Status:      ${c.status.toUpperCase()}\n` +
      `Victim:      ${c.victim || 'Unknown'}\n` +
      `Suspect:     ${c.suspect || 'Unknown'}\n` +
      `Description: ${c.description || 'N/A'}\n` +
      `Tags:        ${c.tags || 'none'}\n` +
      `Created:     ${c.created_at}\n` +
      `Updated:     ${c.updated_at}`
    );

    const evidence = getEvidence(caseId.toUpperCase());
    if (evidence.length) {
      section(`EVIDENCE (${evidence.length})`);
      table(
        ['#', 'Type', 'Description', 'Added'],
        evidence.map((e, i) => [
          String(i + 1),
          e.type,
          (e.description || e.content || '').slice(0, 50),
          e.added_at.split(' ')[0],
        ])
      );
    } else {
      dim('  No evidence logged yet');
    }
  });

// ── update ────────────────────────────────────────────────────────────────────
caseCmd
  .command('update <caseId>')
  .description('Update case fields')
  .option('-s, --status <status>', 'New status (open|closed|pending)')
  .option('--suspect <suspect>', 'Update suspect')
  .option('-t, --title <title>', 'Update title')
  .option('--tags <tags>', 'Comma-separated tags')
  .action((caseId, opts) => {
    const c = getCaseById(caseId.toUpperCase());
    if (!c) { fail(`Case not found: ${caseId}`); process.exit(1); }

    const fields = {};
    if (opts.status)  fields.status  = opts.status;
    if (opts.suspect) fields.suspect = opts.suspect;
    if (opts.title)   fields.title   = opts.title;
    if (opts.tags)    fields.tags    = opts.tags;

    if (!Object.keys(fields).length) { fail('No fields to update. Use --status, --suspect, --title, --tags'); return; }

    updateCase(caseId.toUpperCase(), fields);
    ok(`Case ${caseId} updated`);
    Object.entries(fields).forEach(([k, v]) => info(`  ${k}: ${v}`));
  });

// ── add-evidence ──────────────────────────────────────────────────────────────
caseCmd
  .command('add-evidence <caseId>')
  .description('Add an evidence entry to a case')
  .option('--type <type>', 'Evidence type (wallet|document|screenshot|chat|email|url|other)', 'other')
  .option('--desc <desc>', 'Description')
  .option('--content <content>', 'Raw content or note')
  .option('--file <file>', 'File path reference')
  .action(async (caseId, opts) => {
    const c = getCaseById(caseId.toUpperCase());
    if (!c) { fail(`Case not found: ${caseId}`); process.exit(1); }

    let { type, desc, content, file } = opts;

    if (!desc && !content) {
      const rl = readline.createInterface({ input, output });
      desc    = await rl.question('  Description: ');
      content = await rl.question('  Content/note (optional): ');
      rl.close();
    }

    addEvidence({
      case_id:     caseId.toUpperCase(),
      type:        type || 'other',
      description: desc || '',
      content:     content || null,
      file_path:   file || null,
      hash:        null,
    });

    ok(`Evidence added to ${caseId.toUpperCase()}`);
  });

// ── summarize ─────────────────────────────────────────────────────────────────
caseCmd
  .command('summarize <caseId>')
  .description('AI-powered case summary')
  .action(async (caseId) => {
    const c = getCaseById(caseId.toUpperCase());
    if (!c) { fail(`Case not found: ${caseId}`); process.exit(1); }

    const evidence = getEvidence(caseId.toUpperCase());

    section(`AI SUMMARY — ${caseId}`);
    const ora = (await import('ora')).default;
    const spinner = ora('Generating case summary...').start();

    const prompt = `Summarize this fraud investigation case in 3 paragraphs.
Case: ${c.title}
Type: ${c.type}
Victim: ${c.victim || 'Unknown'}
Suspect: ${c.suspect || 'Unknown'}
Description: ${c.description || 'N/A'}
Evidence count: ${evidence.length}
Evidence types: ${[...new Set(evidence.map(e => e.type))].join(', ') || 'none'}

Provide: (1) Case overview, (2) Key evidence summary, (3) Recommended next steps.`;

    try {
      const summary = await analyze(prompt, 800);
      spinner.stop();
      box(summary);
    } catch (err) {
      spinner.fail('AI analysis failed');
      fail(err.message);
    }
  });
