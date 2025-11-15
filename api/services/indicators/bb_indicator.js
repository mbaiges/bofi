import { BollingerBands } from 'technicalindicators';
import Indicator from './indicator.js';
import BBIndicatorResult from '../../models/indicators/BBIndicatorResult.js';

class BollingerBandsIndicator extends Indicator {
    constructor(period = 20, stdDev = 2) {
        super(); // No properties needed in base
        this.period = period;
        this.stdDev = stdDev;
        this.id = `bb-${period}-${stdDev}`; // Set unique ID
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
                    candle.indicators[this.id] = new BBIndicatorResult( // Use ID as key
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