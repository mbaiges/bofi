import { connect, getCandles as getCandlesFromRepository } from '../repositories/tradingview.js'
import { hydrateWithIndicators } from '../utils/indicators.js'

export async function getCandles(options) {
  const { symbol, timeframe, amount, hydrate, from, to } = options

  const connection = await connect()
  
  const period = 14
  const extraCandles = hydrate ? (period * 2 - 1) : 0
  
  const repoOptions = {
    connection,
    symbols: [symbol],
    timeframe,
    from,
    to,
    extraCandles
  }

  if (!from && amount) {
    repoOptions.amount = parseInt(amount) + extraCandles
  }

  const candles = await getCandlesFromRepository(repoOptions)
  await connection.close()
  
  let data = candles[0] || []
  
  if (hydrate) {
    data = hydrateWithIndicators(data, period)
  }

  if (from) {
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000)
    const toTimestamp = to ? Math.floor(new Date(to).getTime() / 1000) : null
    data = data.filter(c => c.timestamp >= fromTimestamp && (!toTimestamp || c.timestamp <= toTimestamp))
  } else if (amount) {
    data = data.slice(-(parseInt(amount)))
  }

  return data
}
