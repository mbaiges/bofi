import { ADX } from 'technicalindicators';
import DMIIndicatorResult from '../../models/indicators/DMIIndicatorResult.js';
import Indicator from './indicator.js';

class DMIIndicator extends Indicator {
    constructor(period = 14) {
        super({ period })
    }

    periodsRequired(requestedPeriods) {
        if (requestedPeriods <= 0) {
            return 0
        }
        return requestedPeriods + (2 * this.properties.period - 1)
    }

    calculate(candles) {
        const { period } = this.properties

        if (candles.length < 2 * period) {
            return candles.map(c => ({
                ...c,
                indicators: {
                    ...c.indicators,
                    dmi: new DMIIndicatorResult({
                        adx: null,
                        diPositive: null,
                        diNegative: null,
                    })
                }
            }))
        }

        const high = candles.map(c => c.high)
        const low = candles.map(c => c.low)
        const close = candles.map(c => c.close)

        const adxResult = ADX.calculate({
            high,
            low,
            close,
            period
        })

        const candlesWithDMI = [...candles]
        let adxResultIndex = 0
        for (let i = 0; i < candlesWithDMI.length; i++) {
            if (i >= period * 2 - 1) {
                const indicatorData = adxResult[adxResultIndex]
                candlesWithDMI[i].indicators = {
                    ...candlesWithDMI[i].indicators,
                    dmi: new DMIIndicatorResult({
                        adx: indicatorData.adx,
                        diPositive: indicatorData.pdi,
                        diNegative: indicatorData.mdi
                    })
                }
                adxResultIndex++
            } else {
                candlesWithDMI[i].indicators = {
                    ...candlesWithDMI[i].indicators,
                    dmi: new DMIIndicatorResult({
                        adx: null,
                        diPositive: null,
                        diNegative: null
                    })
                }
            }
        }

        return candlesWithDMI
    }
}

export default DMIIndicator;
