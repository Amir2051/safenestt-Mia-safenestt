import { Command } from 'commander';
import {
  searchToken, getTokenData, getMarketChart, scoreToken, getWalletInfo,
} from '../services/cryptoService.js';
import { getCases, addEvidence, saveCryptoScan } from '../db/index.js';
import { ok, fail, warn, info, dim, section, box, table, riskBadge } from '../utils/display.js';
import chalk from 'chalk';

export const cryptoCmd = new Command('crypto');
cryptoCmd.description('Crypto analysis — token risk scoring, wallet investigation');

// ── scan ──────────────────────────────────────────────────────────────────────
cryptoCmd
  .command('scan <query>')
  .description('Search and risk-score a cryptocurrency token')
  .option('-c, --case-id <id>', 'Link scan to a case')
  .option('--days <days>', 'Chart history days', '30')
  .action(async (query, opts) => {
    section(`CRYPTO SCAN — ${query.toUpperCase()}`);

    const ora = (await import('ora')).default;
    let spinner = ora('Searching tokens...').start();

    let tokens;
    try {
      tokens = await searchToken(query);
      spinner.stop();
    } catch (err) {
      spinner.fail('Search failed');
      fail(err.message);
      return;
    }

    if (!tokens.length) { fail(`No tokens found for: ${query}`); return; }

    // Pick best match (first result or exact symbol match)
    const best = tokens.find(t => t.symbol?.toLowerCase() === query.toLowerCase()) || tokens[0];

    info(`Matched: ${best.name} (${best.symbol}) — Rank #${best.rank || 'unranked'}`);
    dim(`  ID: ${best.id}`);

    spinner = ora('Fetching token data...').start();
    let data, chart;
    try {
      [data, chart] = await Promise.all([
        getTokenData(best.id),
        getMarketChart(best.id, parseInt(opts.days) || 30),
      ]);
      spinner.stop();
    } catch (err) {
      spinner.fail('Data fetch failed');
      fail(err.message);
      return;
    }

    const { score, flags } = scoreToken(data, chart);

    section('TOKEN INTEL');
    const fmt = (n) => n != null ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : 'N/A';
    box(
      `Name:         ${data.name} (${data.symbol})\n` +
      `Price:        $${data.price?.toLocaleString() || 'N/A'}\n` +
      `24h Change:   ${fmt(data.change24h)}\n` +
      `7d Change:    ${fmt(data.change7d)}\n` +
      `Market Cap:   $${(data.mcap || 0).toLocaleString()}\n` +
      `Volume 24h:   $${(data.volume24h || 0).toLocaleString()}\n` +
      `ATH:          $${data.ath?.toLocaleString() || 'N/A'} (${data.athDate?.split('T')[0] || '?'})\n` +
      `Rank:         ${data.rank ? `#${data.rank}` : 'Unranked'}\n` +
      `Launched:     ${data.launchDate || 'Unknown'}\n` +
      `Website:      ${data.homepage || 'None'}\n` +
      `Platforms:    ${data.platforms?.join(', ') || 'None'}`
    );

    section('RISK ASSESSMENT');
    console.log(`  Risk Score: ${riskBadge(score)}  ${score}/100\n`);

    if (flags.length) {
      flags.forEach(f => warn(`  ⚠  ${f}`));
    } else {
      ok('  No major risk flags detected');
    }

    if (data.description) {
      section('DESCRIPTION');
      dim(`  ${data.description.slice(0, 200)}...`);
    }

    // Save scan
    const result = JSON.stringify({ data, score, flags });
    saveCryptoScan({
      case_id:    opts.caseId || null,
      query:      query,
      chain:      data.platforms?.[0] || 'unknown',
      risk_score: score,
      result,
    });

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'crypto_scan',
        description: `Crypto scan: ${data.name} (${data.symbol}) — Risk ${score}/100`,
        content:     result,
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }

    if (score >= 70) {
      console.log('');
      warn(chalk.red.bold('  HIGH RISK — Do not invest. Report if this token was used to defraud a victim.'));
    }
  });

// ── wallet ────────────────────────────────────────────────────────────────────
cryptoCmd
  .command('wallet <address>')
  .description('Look up an ETH wallet — balance and recent transactions')
  .option('-c, --case-id <id>', 'Link to a case')
  .action(async (address, opts) => {
    section(`WALLET LOOKUP — ${address}`);

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      fail('Invalid ETH address format (must be 0x + 40 hex chars)');
      return;
    }

    const ora = (await import('ora')).default;
    const spinner = ora('Querying Etherscan...').start();

    let wallet;
    try {
      wallet = await getWalletInfo(address);
      spinner.stop();
    } catch (err) {
      spinner.fail('Wallet lookup failed');
      fail(err.message);
      return;
    }

    ok(`Balance: ${wallet.balanceEth.toFixed(6)} ETH`);
    console.log('');

    if (wallet.recentTxs.length) {
      section(`RECENT TRANSACTIONS (last ${wallet.recentTxs.length})`);
      table(
        ['Date', 'From', 'To', 'ETH', 'Status'],
        wallet.recentTxs.map(tx => [
          tx.date,
          tx.from.slice(0, 10) + '...',
          tx.to.slice(0, 10) + '...',
          tx.ethVal,
          tx.status === 'OK' ? chalk.green('OK') : chalk.red('FAIL'),
        ])
      );
    } else {
      dim('  No recent transactions');
    }

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'wallet',
        description: `ETH wallet: ${address} — Balance: ${wallet.balanceEth.toFixed(6)} ETH`,
        content:     JSON.stringify(wallet),
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }
  });

// ── compare ───────────────────────────────────────────────────────────────────
cryptoCmd
  .command('compare <victim> <suspect>')
  .description('Compare two ETH wallets — find linking transactions')
  .option('-c, --case-id <id>', 'Save to case')
  .action(async (victim, suspect, opts) => {
    section('WALLET COMPARISON');

    for (const addr of [victim, suspect]) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        fail(`Invalid address: ${addr}`);
        return;
      }
    }

    const ora = (await import('ora')).default;
    const spinner = ora('Fetching both wallets...').start();

    let vw, sw;
    try {
      [vw, sw] = await Promise.all([getWalletInfo(victim), getWalletInfo(suspect)]);
      spinner.stop();
    } catch (err) {
      spinner.fail();
      fail(err.message);
      return;
    }

    // Find transactions linking the two wallets
    const victimToSuspect = vw.recentTxs.filter(tx =>
      tx.to?.toLowerCase() === suspect.toLowerCase()
    );
    const suspectFromVictim = sw.recentTxs.filter(tx =>
      tx.from?.toLowerCase() === victim.toLowerCase()
    );

    const linked = [...victimToSuspect, ...suspectFromVictim]
      .filter((tx, i, arr) => arr.findIndex(t => t.hash === tx.hash) === i);

    section('WALLET INTEL');
    table(
      ['Wallet', 'Label', 'Balance (ETH)', 'Recent Txs'],
      [
        [victim.slice(0, 18) + '...', 'VICTIM', vw.balanceEth.toFixed(6), String(vw.recentTxs.length)],
        [suspect.slice(0, 18) + '...', 'SUSPECT', sw.balanceEth.toFixed(6), String(sw.recentTxs.length)],
      ]
    );

    section(`LINKED TRANSACTIONS (${linked.length})`);
    if (linked.length) {
      table(
        ['Date', 'Hash', 'Direction', 'ETH'],
        linked.map(tx => [
          tx.date,
          tx.hash.slice(0, 16) + '...',
          tx.from?.toLowerCase() === victim.toLowerCase() ? chalk.red('V→S') : chalk.yellow('S→V'),
          tx.ethVal,
        ])
      );

      const totalSent = linked
        .filter(tx => tx.from?.toLowerCase() === victim.toLowerCase())
        .reduce((sum, tx) => sum + parseFloat(tx.ethVal), 0);

      if (totalSent > 0) {
        warn(`  Victim sent ${totalSent.toFixed(6)} ETH to suspect address`);
      }
    } else {
      info('  No direct linking transactions found in recent history');
      dim('  (Etherscan shows last 10 txs only — full history requires archive node)');
    }

    if (opts.caseId) {
      addEvidence({
        case_id:     opts.caseId.toUpperCase(),
        type:        'wallet_comparison',
        description: `Wallet comparison: victim ${victim.slice(0, 10)}... vs suspect ${suspect.slice(0, 10)}... — ${linked.length} linked txs`,
        content:     JSON.stringify({ victim: vw, suspect: sw, linked }),
        file_path:   null,
        hash:        null,
      });
      ok(`Saved to case ${opts.caseId}`);
    }
  });
