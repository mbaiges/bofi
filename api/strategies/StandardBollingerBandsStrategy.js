import Strategy from './Strategy.js';
import StrategyResult from '../models/strategies/StrategyResult.js';
import Operation from '../models/strategies/Operation.js';

class StandardBollingerBandsStrategy extends Strategy {
    period;
    stdDev;
    adxStrengthThreshold;
    bbId; // ID for the BB indicator
    dmiId = 'dmi-14'; // ID for the DMI indicator

    constructor(period = 20, stdDev = 2, adxStrengthThreshold = 20) {
        super(
            'standard-bollinger-bands',
            // ... (rest of description)
        );
        this.period = period;
        this.stdDev = stdDev;
        this.adxStrengthThreshold = adxStrengthThreshold;
        this.bbId = `bb-${period}-${stdDev}`; // Set the specific BB ID
    }

    process(candles) {
        const lastCandle = candles[candles.length - 1];

        if (!lastCandle || !lastCandle.indicators[this.bbId] || !lastCandle.indicators[this.dmiId]) {
            return new StrategyResult(Operation.ERROR);
        }

        const { adx } = lastCandle.indicators[this.dmiId];
        const { upper, lower } = lastCandle.indicators[this.bbId];

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