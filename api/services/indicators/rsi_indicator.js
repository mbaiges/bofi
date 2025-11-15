import { RSI } from 'technicalindicators';
import Indicator from './indicator.js';
import RSIIndicatorResult from '../../models/indicators/RSIIndicatorResult.js';

class RSIIndicator extends Indicator {
    constructor(period = 14) {
        super();
        this.period = period;
        this.id = `rsi-${period}`;
    }

    periodsRequired(requestedPeriods) {
        return requestedPeriods + this.period;
    }

    calculate(candles) {
        const closePrices = candles.map(c => c.close);
        const rsiResults = RSI.calculate({
            period: this.period,
            values: closePrices
        });

        // Add padding for the periods where RSI isn't calculated
        const padding = Array(this.period).fill(null);
        const paddedResults = padding.concat(rsiResults);

        return candles.map((candle, index) => {
            const rsiValue = (index < paddedResults.length) ? paddedResults[index] : null;
            candle.indicators[this.id] = new RSIIndicatorResult(rsiValue);
            return candle;
        });
    }
}

export default RSIIndicator;