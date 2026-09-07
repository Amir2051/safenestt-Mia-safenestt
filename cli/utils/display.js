import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  matrix: '#00ff41',
  amber:  '#ff9500',
  danger: '#ff2d2d',
  cyan:   '#00e5ff',
  purple: '#b388ff',
  muted:  '#2a4a2a',
  text:   '#c8e6c8',
};

// ── ASCII header ─────────────────────────────────────────────────────────────
export function header() {
  console.log(chalk.hex(C.matrix)(`
╔═══════════════════════════════════════════════════════════╗
║  ███╗   ███╗██╗ █████╗     ██╗   ██╗██████╗              ║
║  ████╗ ████║██║██╔══██╗    ██║   ██║╚════██╗             ║
║  ██╔████╔██║██║███████║    ██║   ██║ █████╔╝             ║
║  ██║╚██╔╝██║██║██╔══██║    ╚██╗ ██╔╝██╔═══╝              ║
║  ██║ ╚═╝ ██║██║██║  ██║     ╚████╔╝ ███████╗             ║
║  ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝      ╚═══╝  ╚══════╝             ║
╠═══════════════════════════════════════════════════════════╣
║  Intelligence Terminal v2.0  ·  SafeNestT · RZ Core      ║
║  ██ NEURAL LINK ACTIVE ██  ·  By Ronzoro                 ║
╚═══════════════════════════════════════════════════════════╝`));
}

// ── Log helpers ──────────────────────────────────────────────────────────────
export const ok   = (m) => console.log(chalk.hex(C.matrix) (`  ✓  ${m}`));
export const fail = (m) => console.log(chalk.hex(C.danger)  (`  ✗  ${m}`));
export const warn = (m) => console.log(chalk.hex(C.amber)   (`  ⚠  ${m}`));
export const info = (m) => console.log(chalk.hex(C.cyan)    (`  ℹ  ${m}`));
export const dim  = (m) => console.log(chalk.hex(C.muted)   (`     ${m}`));
export const sys  = (m) => console.log(chalk.hex(C.matrix)  (
  `  ${chalk.dim('[')}${new Date().toTimeString().slice(0,8)}${chalk.dim(']')}  ${m}`
));

// ── Section header ───────────────────────────────────────────────────────────
export function section(title) {
  const line = '─'.repeat(55);
  console.log('\n' + chalk.hex(C.matrix)(`  ┌${line}`));
  console.log(chalk.hex(C.matrix)        (`  │  ${chalk.bold(title.toUpperCase())}`));
  console.log(chalk.hex(C.matrix)        (`  └${line}\n`));
}

// ── Box ──────────────────────────────────────────────────────────────────────
// box(content) or box(content, type)
export function box(content, type = 'info') {
  const borderColor = type === 'success' ? 'greenBright'
    : type === 'error'   ? 'redBright'
    : type === 'warn'    ? 'yellowBright'
    : 'cyanBright';

  const text = Array.isArray(content) ? content.join('\n') : String(content);

  console.log(boxen(text, {
    padding:     { top: 0, bottom: 0, left: 2, right: 2 },
    margin:      { top: 1, bottom: 1, left: 2 },
    borderStyle: 'single',
    borderColor,
  }));
}

// ── Table ────────────────────────────────────────────────────────────────────
export function table(headers, rows, colWidths) {
  const opts = {
    head: headers.map(h => chalk.hex(C.matrix)(h.toUpperCase())),
    style: { border: ['grey'], head: [] },
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼', right: '│', 'right-mid': '┤', middle: '│'
    },
  };
  if (colWidths) opts.colWidths = colWidths;
  const t = new Table(opts);
  rows.forEach(r => t.push(r));
  console.log(t.toString());
}

// ── Risk badge ───────────────────────────────────────────────────────────────
export function riskBadge(score) {
  if (score >= 70) return chalk.hex(C.danger).bold(`[HIGH RISK  ${score}/100]`);
  if (score >= 40) return chalk.hex(C.amber).bold( `[MED RISK   ${score}/100]`);
  return chalk.hex(C.matrix).bold(                  `[LOW RISK   ${score}/100]`);
}

// ── Status badge ─────────────────────────────────────────────────────────────
export function statusBadge(status) {
  const map = {
    open:         chalk.hex(C.cyan).bold('[OPEN]'),
    investigating:chalk.hex(C.amber).bold('[INVESTIGATING]'),
    closed:       chalk.hex(C.muted)('[CLOSED]'),
    escalated:    chalk.hex(C.danger).bold('[ESCALATED]'),
  };
  return map[status] || chalk.white(`[${status?.toUpperCase()}]`);
}

// ── Divider ──────────────────────────────────────────────────────────────────
export const divider = () => console.log(chalk.hex(C.muted)('  ' + '─'.repeat(57)));
export const nl      = ()  => console.log();
