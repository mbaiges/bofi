import { connect, getCandles as getCandlesFromRepository } from '../repositories/tradingview.js'
import { hydrateWithIndicators } from '../utils/indicators.js'

export async function getCandles(options) {
  const { symbol, timeframe, amount, hydrate } = options

  const connection = await connect()
  
  const period = 14
  const amountToFetch = hydrate ? parseInt(amount) + (period * 2 - 1) : parseInt(amount)

  const candles = await getCandlesFromRepository({
    connection,
    symbols: [symbol],
    amount: amountToFetch,
    timeframe: timeframe
  })
  await connection.close()
  
  let data = candles[0]
  
  if (hydrate) {
    data = hydrateWithIndicators(data, period)
    data = data.slice(-(parseInt(amount)))
  }

  return data
}
