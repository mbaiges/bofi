import { Router } from 'express';
import { getCandles } from '../services/candles.js';
import HydratedCandle from '../models/HydratedCandle.js';
import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
import TakeProfitExitStrategy from '../exit_strategies/TakeProfitExitStrategy.js';
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
  if (id === 'TakeProfitExit' || id === 'TakeProfitExitStrategy' || id === 'take-profit-exit') {
    const pct = config.pct ?? 0.1;
    return new TakeProfitExitStrategy(pct);
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
    // Parse entry_time setting (case-insensitive): 'day' or 'next_day'
    const entryTime = settings.entryTime ? settings.entryTime.toLowerCase() : 'day';
    if (entryTime !== 'day' && entryTime !== 'next_day') {
      return res.status(400).json({ error: 'Invalid entryTime: must be "day" or "next_day"' });
    }

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
        
        // Entry logic: buy based on entry_time setting
        if (!inPosition && stratResult.recommendedOperation === 'BUY' && cash > 0) {
          let entryPriceCandle;
          let entryCandleIndex;
          
          if (entryTime === 'day') {
            // Buy at close price on the same day the signal is generated
            entryPriceCandle = c.close;
            entryCandleIndex = i;
          } else if (entryTime === 'next_day') {
            // Buy at open price on the next day (skip if this is the last candle)
            if (i < candles.length - 1) {
              entryPriceCandle = candles[i + 1].open;
              entryCandleIndex = i + 1;
            } else {
              // Can't buy on next day if this is the last candle
              entryPriceCandle = null;
            }
          }
          
          if (entryPriceCandle) {
            let nominalsToBuy = cash / (entryPriceCandle * (1 + feePct));

            if (settings.truncateNominals) {
              nominalsToBuy = Math.floor(nominalsToBuy);
            }

            if (nominalsToBuy > 0) {
              inPosition = true;
              entryPrice = entryPriceCandle;
              entryIndex = entryCandleIndex;
              currentNominals = nominalsToBuy;
              const cost = currentNominals * entryPrice;
              entryFees = cost * feePct;
              totalFees += entryFees;
              if (settings.truncateNominals) {
                cash -= (cost + entryFees);
              } else {
                cash = 0;
              }
              const entryDate = entryTime === 'day' ? c.date : candles[entryCandleIndex].date;
              console.log('Bought at', entryPrice, 'on', entryDate);
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
          
          // If no exit strategy or exit strategy didn't trigger, check trading strategy's SELL signal
          if (!shouldExitByExitStrategy) {
            if (entryTime === 'day') {
              // Check SELL signal on same day
              if (stratResult.recommendedOperation === 'SELL') {
                shouldExitByStrategy = true;
              }
            } else if (entryTime === 'next_day') {
              // Check previous day's SELL signal (sell on current day at open)
              if (i > 0) {
                const previousStratResult = tradingCandles[i - 1]?.strategyResult;
                if (previousStratResult && previousStratResult.recommendedOperation === 'SELL') {
                  shouldExitByStrategy = true;
                }
              }
            }
          }

          let exitPrice;
          let exitDate;
          if (shouldExitByExitStrategy) {
            exitPrice = exitStrategyInst.getExitPrice(entryPrice);
            exitDate = c.date;
          } else if (shouldExitByStrategy) {
            if (entryTime === 'day') {
              exitPrice = c.close; // Sell at close price on the same day
              exitDate = c.date;
            } else if (entryTime === 'next_day') {
              exitPrice = c.open; // Sell at open price on the current day (next day after signal)
              exitDate = c.date;
            }
          }

          if (shouldExitByExitStrategy || shouldExitByStrategy) {
            console.log('Sold at', exitPrice, 'on', exitDate);
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
