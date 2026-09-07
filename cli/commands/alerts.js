import { Command } from 'commander';
import { getAlerts, ackAlert, createAlert } from '../db/index.js';
import { ok, fail, warn, info, dim, section, table } from '../utils/display.js';
import chalk from 'chalk';

export const alertsCmd = new Command('alerts');
alertsCmd.description('Alerts — view and manage investigation alerts');

const severityColor = (s) => {
  if (s === 'critical') return chalk.red.bold(s.toUpperCase());
  if (s === 'high')     return chalk.red(s.toUpperCase());
  if (s === 'medium')   return chalk.yellow(s.toUpperCase());
  return chalk.gray(s.toUpperCase());
};

// ── check ─────────────────────────────────────────────────────────────────────
alertsCmd
  .command('check')
  .description('Show unacknowledged alerts')
  .option('-a, --all', 'Show all alerts including acknowledged')
  .action((opts) => {
    const alerts = getAlerts(!opts.all);
    section(`ALERTS${opts.all ? ' (ALL)' : ' (UNACKNOWLEDGED)'}`);

    if (!alerts.length) {
      ok('No active alerts');
      return;
    }

    table(
      ['ID', 'Severity', 'Type', 'Message', 'Case', 'Time'],
      alerts.map(a => [
        String(a.id),
        severityColor(a.severity),
        a.type,
        a.message.slice(0, 45),
        a.case_id || '-',
        a.created_at.split(' ')[0],
      ])
    );

    if (!opts.all) {
      dim(`\n  Acknowledge: mia alerts ack <id>`);
      dim('  View all:   mia alerts check --all');
    }
  });

// ── ack ───────────────────────────────────────────────────────────────────────
alertsCmd
  .command('ack <id>')
  .description('Acknowledge (dismiss) an alert')
  .action((id) => {
    const alerts = getAlerts(false);
    const alert = alerts.find(a => a.id === parseInt(id));

    if (!alert) {
      // Try all alerts
      const all = getAlerts(false);
      if (!all.find(a => a.id === parseInt(id))) {
        fail(`Alert ${id} not found`);
        return;
      }
    }

    ackAlert(parseInt(id));
    ok(`Alert ${id} acknowledged`);
  });

// ── ack-all ───────────────────────────────────────────────────────────────────
alertsCmd
  .command('ack-all')
  .description('Acknowledge all unacknowledged alerts')
  .action(() => {
    const alerts = getAlerts(true);
    if (!alerts.length) { info('No unacknowledged alerts'); return; }

    alerts.forEach(a => ackAlert(a.id));
    ok(`Acknowledged ${alerts.length} alert(s)`);
  });

// ── add ───────────────────────────────────────────────────────────────────────
alertsCmd
  .command('add')
  .description('Manually add an alert')
  .option('--type <type>', 'Alert type (fraud|wallet|sanction|phishing|other)', 'other')
  .option('--severity <s>', 'Severity (low|medium|high|critical)', 'medium')
  .option('-m, --message <msg>', 'Alert message')
  .option('-c, --case-id <id>', 'Link to case')
  .action((opts) => {
    if (!opts.message) { fail('--message required'); return; }

    createAlert({
      type:     opts.type,
      severity: opts.severity,
      message:  opts.message,
      case_id:  opts.caseId || null,
      data:     null,
    });

    ok(`Alert created [${opts.severity.toUpperCase()}]: ${opts.message}`);
  });
