import Strategy from './Strategy.js';
import StrategyResult from '../models/strategies/StrategyResult.js';
import Operation from '../models/strategies/Operation.js';

class StandardBollingerBandsStrategy extends Strategy {
    period;
    stdDev;
    adxStrengthThreshold;

    constructor(period = 20, stdDev = 2, adxStrengthThreshold = 20) {
        super(
            'standard-bollinger-bands',
            'Standard Bollinger Bands Strategy',
            'Uses Bollinger Bands to identify overbought and oversold conditions, combined with ADX for trend strength.'
        );
        this.period = period;
        this.stdDev = stdDev;
        this.adxStrengthThreshold = adxStrengthThreshold;
    }

    process(candles) {
        const lastCandle = candles[candles.length - 1];

        if (!lastCandle || !lastCandle.indicators.bb || !lastCandle.indicators.dmi) {
            return new StrategyResult(Operation.ERROR);
        }

        const { adx } = lastCandle.indicators.dmi;
        const { upper, lower } = lastCandle.indicators.bb;

        if (adx === null || upper === null || lower === null) {
            return new StrategyResult(Operation.ERROR);
        }

        const adxStrength = adx < this.adxStrengthThreshold;

        if (adxStrength) {
            if (lastCandle.close < lower) {
                return new StrategyResult(Operation.BUY);
            }
            if (lastCandle.close > upper) {
                return new StrategyResult(Operation.SELL);
            }
        }

        return new StrategyResult(Operation.HOLD);
    }
}

export default StandardBollingerBandsStrategy;
