import { Router } from 'express';
import { getCandles } from '../services/candles.js';
import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
import TakeProfitExitStrategy from '../exit_strategies/TakeProfitExitStrategy.js';
import DefaultFullStrategy from '../strategies/DefaultFullStrategy.js';
import DelayedCompositeStrategy from '../strategies/DelayedCompositeStrategy.js';
import FullStrategy from '../strategies/FullStrategy.js';

const router = Router();

function buildStrategy({ id, config }) {
    switch (id) {
        case 'standard-dmi-strategy':
        case 'StandardDMIStrategy':
            return new StandardDMIStrategy(config.adxStrengthThreshold);

        case 'take-profit-exit-strategy':
        case 'TakeProfitExitStrategy':
            return new TakeProfitExitStrategy(config.pct);

        case 'default-full-strategy':
        case 'DefaultFullStrategy': {
            const tradingStrategy = buildStrategy(config.tradingStrategy);
            const exitStrategy = buildStrategy(config.exitStrategy);
            return new DefaultFullStrategy(
                'default-full-strategy',
                'Default Full Strategy',
                'Combines a trading and an exit strategy',
                tradingStrategy,
                exitStrategy
            );
        }

        case 'delayed-composite-strategy':
        case 'DelayedCompositeStrategy': {
            const strategies = config.strategies.map(stratConfig => buildStrategy(stratConfig));
            return new DelayedCompositeStrategy(
                'delayed-composite-strategy',
                'Delayed Composite Strategy',
                'Aggregates signals from multiple strategies',
                strategies,
                config.minSignals,
                config.delayMin,
                config.delayMax
            );
        }

        default:
            throw new Error(`Unknown strategy id: ${id}`);
    }
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
      } = trading;
      // Fetch and hydrate candles
      const candles = await getCandles({ symbol: ticker, hydrate: true, from: settings.from, to: settings.to, range, timespan });
      if (!candles?.length) {
        tradingsResults.push({ error: `No candles for ticker ${ticker}` });
        continue;
      }

      const strategyInst = buildStrategy(strategy);

      if (!(strategyInst instanceof FullStrategy)) {
          throw new Error('The top-level strategy for backtesting must be a FullStrategy.');
      }
      
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
        const stratResult = strategyInst.process(candles.slice(0, i + 1), inPosition, entryPrice);
        
        // Entry logic: buy based on entry_time setting
        if (!inPosition && stratResult.recommendedOperation === 'BUY' && cash > 0) {
          const entryPriceCandle = c.close;
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

        // Exit logic: check exit strategy (out_strategy) if in position
        // Exit strategies are separate from trading strategies and determine when to exit based on price movements
        if (inPosition && entryPrice && stratResult.recommendedOperation === 'SELL') {
          const exitPrice = stratResult.exitPrice || c.close;
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
    res.json({ benchmark: { bestRoi, bestStrategy }, tradingsResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
