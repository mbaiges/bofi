import { BollingerBands } from 'technicalindicators';
import Indicator from './indicator.js';
import BBIndicatorResult from '../../models/indicators/BBIndicatorResult.js';

class BollingerBandsIndicator extends Indicator {
    constructor(period = 20, stdDev = 2) {
        super(`bb(${period}, ${stdDev})`, `Bollinger Bands (p=${period}, stdDev=${stdDev})`, `Bollinger Bands are a type of statistical chart characterizing the prices and volatility over time of a financial instrument or commodity.`);
        this.period = period;
        this.stdDev = stdDev;
    }

    calculate(candles) {
        const closePrices = candles.map(c => c.close);
        const bbResults = BollingerBands.calculate({
            period: this.period,
            values: closePrices,
            stdDev: this.stdDev
        });

        return candles.map((candle, index) => {
            if (index >= this.period - 1) {
                const bbValue = bbResults[index - (this.period - 1)];
                if (bbValue) {
                    candle.indicators.bb = new BBIndicatorResult(
                        bbValue.middle,
                        bbValue.upper,
                        bbValue.lower
                    );
                }
            }
            return candle;
        });
    }

    periodsRequired(requestedPeriods) {
        return requestedPeriods + this.period;
    }
}

export default BollingerBandsIndicator;
