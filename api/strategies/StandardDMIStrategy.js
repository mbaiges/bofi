import Strategy from './Strategy.js';
import StrategyResult from './StrategyResult.js';
import Operation from './Operation.js';

class StandardDMIStrategy extends Strategy {
    adxStrengthThreshold = 20;

    constructor(adxStrengthThreshold = 20) {
        super(
            'standard-dmi',
            'Standard DMI Strategy',
            'The core of this strategy is to identify a strong trend and then act on signals indicating the trend\'s direction.\\n\\n' +
            'Trend Strength (ADX): The Average Directional Index (ADX) measures the strength of a trend. A value over 20 (or 25) is typically considered a strong trend. The strategy should only consider signals when the ADX is above 20.\\n\\n' +
            'Buy Signal (+DI/-DI Crossover): A buy signal occurs when the Positive Directional Indicator (+DI) crosses above the Negative Directional Indicator (-DI). This suggests that upward momentum is taking over.\\n\\n' +
            'Sell Signal (-DI/+DI Crossover): A sell signal occurs when the -DI crosses above the +DI, indicating that downward momentum is prevailing.'
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

        if (!lastCandle || !previousCandle || !lastCandle.indicators.dmi || !previousCandle.indicators.dmi) {
            return new StrategyResult(Operation.HOLD);
        }

        const { adx: lastAdx, di_positive: lastDiPositive, di_negative: lastDiNegative } = lastCandle.indicators.dmi;
        const { di_positive: prevDiPositive, di_negative: prevDiNegative } = previousCandle.indicators.dmi;

        if (lastAdx === null || lastDiPositive === null || lastDiNegative === null || prevDiPositive === null || prevDiNegative === null) {
            return new StrategyResult(Operation.HOLD);
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
