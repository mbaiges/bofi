import { ADX } from 'technicalindicators'

class Indicator {
  constructor(properties = {}) {
    this.properties = properties
  }

  calculate(candles) {
    throw new Error("Method 'calculate(candles)' must be implemented.")
  }

  periodsRequired(requestedPeriods) {
    throw new Error("Method 'periodsRequired(requestedPeriods)' must be implemented.")
  }
}

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
          dmi: {
            adx: null,
            di_positive: null,
            di_negative: null,
          }
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
          dmi: {
            adx: indicatorData.adx,
            di_positive: indicatorData.pdi,
            di_negative: indicatorData.mdi
          }
        }
        adxResultIndex++
      } else {
        candlesWithDMI[i].indicators = {
          ...candlesWithDMI[i].indicators,
          dmi: {
            adx: null,
            di_positive: null,
            di_negative: null
          }
        }
      }
    }

    return candlesWithDMI
  }
}

export const indicators = [
  new DMIIndicator(14)
]

export function hydrateWithIndicators(candles) {
  let hydratedCandles = [...candles]
  for (const indicator of indicators) {
    hydratedCandles = indicator.calculate(hydratedCandles)
  }
  return hydratedCandles
}
