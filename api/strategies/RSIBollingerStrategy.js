import Strategy from './Strategy.js';
import StrategyResult from '../models/strategies/StrategyResult.js';
import Operation from '../models/strategies/Operation.js';

class RsiBollingerStrategy extends Strategy {
    // Indicator IDs this strategy depends on
    bbId = 'bb-30-2';
    rsiId = 'rsi-13';

    // Strategy parameters from transcript
    rsiOversold = 25;
    rsiOverbought = 75;

    constructor() {
        super(
            'rsi-bollinger-strategy',
            'RSI + Bollinger Strategy',
            'Mean reversion strategy using Bollinger Bands (30, 2) and RSI (13). ' +
            'BUY when price < lower BB AND RSI < 25. ' +
            'SELL when price > upper BB AND RSI > 75.'
        );
    }

    /**
     * @param {any[]} candles
     * @returns {StrategyResult}
     */
    process(candles) {
        const lastCandle = candles[candles.length - 1];

        if (!lastCandle || !lastCandle.indicators[this.bbId] || !lastCandle.indicators[this.rsiId]) {
            return new StrategyResult(Operation.ERROR);
        }

        const { upper, lower } = lastCandle.indicators[this.bbId];
        const { rsi } = lastCandle.indicators[this.rsiId];

        if (rsi === null || upper === null || lower === null) {
            return new StrategyResult(Operation.ERROR);
        }

        // BUY Signal (Long)
        if (lastCandle.close < lower && rsi < this.rsiOversold) {
            return new StrategyResult(Operation.BUY);
        }

        // SELL Signal (Short)
        if (lastCandle.close > upper && rsi > this.rsiOverbought) {
            return new StrategyResult(Operation.SELL);
        }

        return new StrategyResult(Operation.HOLD);
    }
}

export default RsiBollingerStrategy;