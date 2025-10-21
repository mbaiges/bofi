import { Router } from 'express';
import { getCandles } from '../services/candles.js';
import HydratedCandle from '../models/HydratedCandle.js';
import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
// Other strategy imports as needed

const router = Router();

/**
 * Helper to dynamically instantiate a strategy by id/config
 */
function getStrategyInstance(id, config) {
  if (id === 'StandardDMIStrategy' || id === 'standard-dmi') {
    return new StandardDMIStrategy(config.paramA ?? 20);
  }
  throw new Error('Unknown strategy id: ' + id);
}

router.post('/', async (req, res) => {
  try {
    const { settings, tradings } = req.body;
    // Input validation (basic)
    if (!settings || typeof settings.initial_nominals !== 'number') {
      return res.status(400).json({ error: 'Invalid settings: missing initial_nominals' });
    }
    if (!Array.isArray(tradings)) {
      return res.status(400).json({ error: 'tradings should be an array' });
    }
    const timespan = settings.timespan || 'day';
    const range = settings.range || 1;
    const feePct = Number(settings.fee) || 0;

    const tradings_results = [];
    for (const trading of tradings) {
      const {
        ticker,
        strategy,
        out_strategy,
        out_strategies // for extensibility
      } = trading;
      // Fetch and hydrate candles
      const candles = await getCandles({ symbol: ticker, hydrate: true, from: settings.from, to: settings.to, range, timespan });
      if (!candles?.length) {
        tradings_results.push({ error: `No candles for ticker ${ticker}` });
        continue;
      }
      // Prepare strategy instance
      const strategyInst = getStrategyInstance(strategy.id, strategy.config);
      // Main simulation vars:
      let inPosition = false;
      let entryPrice = null, entryIndex = null, entryFees = 0;
      let positions = [];
      let cash = 0, current_nominals = settings.initial_nominals;
      let total_fees = 0, total_wins = 0, total_losses = 0, win_trades = 0, loss_trades = 0;
      const trading_candles = [];

      // Initials
      const firstCandle = candles[0];
      const initial_balance = firstCandle.open * settings.initial_nominals;
      const initial_nominals = settings.initial_nominals;
      // Simulation over candles
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        // Run main strategy
        const stratResult = strategyInst.process(candles.slice(0, i + 1));
        // Out strategy: SKIP for now -- demo can be added as extension
        // Simulate trade logic (dumb demo) -- replace with portfolio logic
        if (!inPosition && stratResult.recommendedOperation === 'BUY') {
          inPosition = true;
          entryPrice = c.open;
          entryIndex = i;
          entryFees = entryPrice * current_nominals * feePct;
          total_fees += entryFees;
        } else if (inPosition && stratResult.recommendedOperation === 'SELL') {
          inPosition = false;
          const exitPrice = c.open;
          const gross = (exitPrice - entryPrice) * current_nominals;
          const thisFee = exitPrice * current_nominals * feePct;
          total_fees += thisFee;
          const net = gross - entryFees - thisFee;
          if (net >= 0) {
            total_wins += net;
            win_trades++;
          } else {
            total_losses += net;
            loss_trades++;
          }
          cash += current_nominals * exitPrice;
          current_nominals = 0;
        }
        // Final balance (if not in trade will be just cash, otherwise mark-to-market)
        const current_balance = (current_nominals * c.close) + cash;
        trading_candles.push({
          timestamp: c.timestamp,
          date: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          indicators: c.indicators,
          strategy_result: stratResult,
          current_balance,
          current_nominals: current_nominals
        });
      }
      // Settle: if inPosition at end, sell at last/close, fee applies
      if (inPosition && candles.length) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        const gross = (exitPrice - entryPrice) * current_nominals;
        const thisFee = exitPrice * current_nominals * feePct;
        total_fees += thisFee;
        const net = gross - entryFees - thisFee;
        if (net >= 0) {
          total_wins += net;
          win_trades++;
        } else {
          total_losses += net;
          loss_trades++;
        }
        cash += current_nominals * exitPrice;
        current_nominals = 0;
      }
      const final_nominals = current_nominals;
      const final_balance = cash + (final_nominals ? final_nominals * candles.at(-1).close : 0);
      const roi = (final_balance - initial_balance) / initial_balance;

      tradings_results.push({
        trading_candles,
        balance: {
          roi,
          initial_balance,
          initial_nominals,
          final_balance,
          final_nominals,
          winning_trades: win_trades,
          losing_trades: loss_trades,
          total_wins,
          total_losses,
          total_fees
        },
        strategyDef: strategy
      });
    }
    // Benchmark: best by roi
    let best_roi = null;
    let best_strategy = null;
    for (const tr of tradings_results) {
      if (tr?.balance && (best_roi == null || tr.balance.roi > best_roi)) {
        best_roi = tr.balance.roi;
        best_strategy = tr.strategyDef;
      }
    }
    res.json({ tradings_results, benchmark: { best_roi, best_strategy } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
