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
    if (!settings || typeof settings.initialBalance !== 'number') {
      return res.status(400).json({ error: 'Invalid settings: missing initialBalance' });
    }
    if (!Array.isArray(tradings)) {
      return res.status(400).json({ error: 'tradings should be an array' });
    }
    const timespan = settings.timespan || 'day';
    const range = settings.range || 1;
    const feePct = Number(settings.fee) || 0;

    const tradingsResults = [];
    for (const trading of tradings) {
      const {
        ticker,
        strategy,
        outStrategy,
        outStrategies // for extensibility
      } = trading;
      // Fetch and hydrate candles
      const candles = await getCandles({ symbol: ticker, hydrate: true, from: settings.from, to: settings.to, range, timespan });
      if (!candles?.length) {
        tradingsResults.push({ error: `No candles for ticker ${ticker}` });
        continue;
      }
      // Prepare strategy instance
      const strategyInst = getStrategyInstance(strategy.id, strategy.config);
      // Main simulation vars:
      let inPosition = false;
      let entryPrice = null, entryIndex = null, entryFees = 0;
      let positions = [];
      let cash = settings.initialBalance, currentNominals = 0;
      let totalFees = 0, totalWins = 0, totalLosses = 0, winTrades = 0, lossTrades = 0;
      const tradingCandles = [];

      // Initials
      const initialBalance = settings.initialBalance;

      // Simulation over candles
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        // Run main strategy
        const stratResult = strategyInst.process(candles.slice(0, i + 1));
        // Out strategy: SKIP for now -- demo can be added as extension
        // Simulate trade logic (dumb demo) -- replace with portfolio logic
        if (!inPosition && stratResult.recommendedOperation === 'BUY' && cash > 0) {
          const entryPriceCandle = c.open;
          let nominalsToBuy = cash / (entryPriceCandle * (1 + feePct));

          if (settings.truncateNominals) {
            nominalsToBuy = Math.floor(nominalsToBuy);
          }

          if (nominalsToBuy > 0) {
            inPosition = true;
            entryPrice = entryPriceCandle;
            entryIndex = i;
            currentNominals = nominalsToBuy;
            const cost = currentNominals * entryPrice;
            entryFees = cost * feePct;
            totalFees += entryFees;
            cash -= (cost + entryFees);
          }
        } else if (inPosition && stratResult.recommendedOperation === 'SELL') {
          inPosition = false;
          const exitPrice = c.open;
          const gross = (exitPrice - entryPrice) * currentNominals;
          const thisFee = exitPrice * currentNominals * feePct;
          totalFees += thisFee;
          const net = gross - entryFees - thisFee;
          if (net >= 0) {
            totalWins += net;
            winTrades++;
          } else {
            totalLosses += net;
            lossTrades++;
          }
          cash += (currentNominals * exitPrice) - thisFee;
          currentNominals = 0;
          entryPrice = null;
          entryIndex = null;
          entryFees = 0;
        }
        // Final balance (if not in trade will be just cash, otherwise mark-to-market)
        const calculatedBalance = cash + (currentNominals ? currentNominals * c.close : 0);
        tradingCandles.push({
          timestamp: c.timestamp,
          date: c.date,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          indicators: c.indicators,
          strategyResult: stratResult,
          currentBalance: cash,
          calculatedBalance,
          currentNominals: currentNominals
        });
      }
      // Settle: if inPosition at end, sell at last/close, fee applies
      if (inPosition && candles.length) {
        const lastCandle = candles[candles.length - 1];
        const exitPrice = lastCandle.close;
        const gross = (exitPrice - entryPrice) * currentNominals;
        const thisFee = exitPrice * currentNominals * feePct;
        totalFees += thisFee;
        const net = gross - entryFees - thisFee;
        if (net >= 0) {
          totalWins += net;
          winTrades++;
        } else {
          totalLosses += net;
          lossTrades++;
        }
        cash += (currentNominals * exitPrice) - thisFee;
        currentNominals = 0;
      }
      const finalNominals = currentNominals;
      const finalBalance = cash + (finalNominals ? finalNominals * candles.at(-1).close : 0);
      const roi = (finalBalance - initialBalance) / initialBalance;

      tradingsResults.push({
        tradingCandles,
        balance: {
          roi,
          initialBalance,
          finalBalance,
          finalNominals,
          winningTrades: winTrades,
          losingTrades: lossTrades,
          totalWins,
          totalLosses,
          totalFees
        },
        strategyDef: strategy
      });
    }
    // Benchmark: best by roi
    let bestRoi = null;
    let bestStrategy = null;
    for (const tr of tradingsResults) {
      if (tr?.balance && (bestRoi == null || tr.balance.roi > bestRoi)) {
        bestRoi = tr.balance.roi;
        bestStrategy = tr.strategyDef;
      }
    }
    res.json({ tradingsResults, benchmark: { bestRoi, bestStrategy } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
