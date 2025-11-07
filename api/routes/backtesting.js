import { Router } from 'express';
import { getCandles } from '../services/candles.js';
import HydratedCandle from '../models/HydratedCandle.js';
import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
import TakeProfitExit from '../strategies/TakeProfitExit.js';
// Other strategy imports as needed

const router = Router();

/**
 * Helper to dynamically instantiate a trading strategy by id/config
 * Trading strategies determine when to BUY/SELL/HOLD based on market indicators
 */
function getStrategyInstance(id, config) {
  if (id === 'StandardDMIStrategy' || id === 'standard-dmi') {
    return new StandardDMIStrategy(config.paramA ?? 20);
  }
  throw new Error('Unknown trading strategy id: ' + id);
}

/**
 * Helper to dynamically instantiate an exit strategy (out_strategy) by id/config
 * Exit strategies determine when to exit a position based on price movements (e.g., take profit, stop loss)
 * These are separate from trading strategies and work differently
 */
function getExitStrategyInstance(id, config) {
  if (id === 'TakeProfitExit' || id === 'take-profit-exit') {
    const pct = config.pct ?? 0.1;
    return new TakeProfitExit(pct);
  }
  throw new Error('Unknown exit strategy (out_strategy) id: ' + id);
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


    console.log('--------------------------------');
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
      // Prepare trading strategy instance (determines BUY/SELL signals)
      const strategyInst = getStrategyInstance(strategy.id, strategy.config);
      // Prepare exit strategy instance (out_strategy) if provided (determines when to exit positions)
      const exitStrategyInst = outStrategy ? getExitStrategyInstance(outStrategy.id, outStrategy.config) : null;
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
        // Run trading strategy (determines BUY/SELL/HOLD signals)
        const stratResult = strategyInst.process(candles.slice(0, i + 1));
        // Simulate trade logic using previous day's signal (confirmed signal)
        // Skip trading on first day (i=0) since there's no previous day
        if (i > 0) {
          const previousStratResult = tradingCandles[i - 1]?.strategyResult;
          if (previousStratResult) {
            // Entry logic: buy based on previous day's BUY signal from trading strategy
            if (!inPosition && previousStratResult.recommendedOperation === 'BUY' && cash > 0) {
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
                if (settings.truncateNominals) {
                  cash -= (cost + entryFees);
                } else {
                  cash = 0;
                }
                console.log('Bought at', entryPrice, 'on', c.date);
              }
            }
          }
        }

        // Exit logic: check exit strategy (out_strategy) if in position
        // Exit strategies are separate from trading strategies and determine when to exit based on price movements
        if (inPosition && entryPrice) {
          let shouldExitByExitStrategy = false;
          let shouldExitByStrategy = false;
          
          // First, check exit strategy (out_strategy) if provided
          // Exit strategies work differently - they check price-based conditions (take profit, stop loss, etc.)
          if (exitStrategyInst) {
            // Check if exit threshold is met using current candle's close price
            shouldExitByExitStrategy = exitStrategyInst.shouldExit(entryPrice, c.low, c);
          }
          
          // If no exit strategy or exit strategy didn't trigger, fall back to trading strategy's SELL signal
          if (!shouldExitByExitStrategy && i > 0) {
            const previousStratResult = tradingCandles[i - 1]?.strategyResult;
            if (previousStratResult && previousStratResult.recommendedOperation === 'SELL') {
              shouldExitByStrategy = true;
            }
          }

          const exitPrice = shouldExitByExitStrategy ? exitStrategyInst.getExitPrice(entryPrice) : c.open;

          if (shouldExitByExitStrategy || shouldExitByStrategy) {
            console.log('Sold at', exitPrice, 'on', c.date);
            inPosition = false;
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
