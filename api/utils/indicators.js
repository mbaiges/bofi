import { ADX } from 'technicalindicators'

function addDMI(candles, period = 14) {
  if (candles.length <= period) {
    return candles.map(c => ({
      ...c,
      indicators: {
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
        dmi: {
          adx: indicatorData.adx,
          di_positive: indicatorData.pdi,
          di_negative: indicatorData.mdi
        }
      }
      adxResultIndex++
    } else {
      candlesWithDMI[i].indicators = {
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

export function hydrateWithIndicators(candles, period = 14) {
  return addDMI(candles, period)
}
