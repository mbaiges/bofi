import Strategy from './Strategy.js';
import StrategyResult from '../models/strategies/StrategyResult.js';
import Operation from '../models/strategies/Operation.js';

class StandardDMIStrategy extends Strategy {
    adxStrengthThreshold = 20;
    dmiId = 'dmi-14'; // Define the indicator ID this strategy uses

    constructor(adxStrengthThreshold = 20) {
        super(
            'standard-dmi',
            // ... (rest of description)
        );
        this.adxStrengthThreshold = adxStrengthThreshold;
    }

    /**
     * @param {any[]} candles
     * @returns {StrategyResult}
     */
    process(candles) {
        const lastCandle = candles[candles.length - 1];
        const previousCandle = candles[candles.length - 2];

        if (!lastCandle || !previousCandle || !lastCandle.indicators[this.dmiId] || !previousCandle.indicators[this.dmiId]) {
            return new StrategyResult(Operation.ERROR);
        }

        const { adx: lastAdx, diPositive: lastDiPositive, diNegative: lastDiNegative } = lastCandle.indicators[this.dmiId];
        const { diPositive: prevDiPositive, diNegative: prevDiNegative } = previousCandle.indicators[this.dmiId];

        if (lastAdx === null || lastDiPositive === null || lastDiNegative === null || prevDiPositive === null || prevDiNegative === null) {
            return new StrategyResult(Operation.ERROR);
        }

        const adxStrength = lastAdx > this.adxStrengthThreshold;
        const buySignal = prevDiPositive < prevDiNegative && lastDiPositive > lastDiNegative;
        const sellSignal = prevDiPositive > prevDiNegative && lastDiPositive < lastDiNegative;

        if (adxStrength && buySignal) {
            return new StrategyResult(Operation.BUY);
        }

        if (adxStrength && sellSignal) {
            return new StrategyResult(Operation.SELL);
        }

        return new StrategyResult(Operation.HOLD);
    }
}

export default StandardDMIStrategy;