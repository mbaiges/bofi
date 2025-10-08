import { getCandles as getCandlesFromRepository } from '../repositories/polygon.js'
import { hydrateWithIndicators } from '../utils/indicators.js'

export async function getCandles(options) {
  const { symbol, timeframe, amount, hydrate, from, to } = options

  const period = 14
  
  const repoOptions = {
    ticker: symbol,
    from,
    to,
    range: 1, // defaulted to 1, can be changed
    timespan: 'day', // defaulted to 'day', can be changed
    limit: 50000,
  }

  const candles = await getCandlesFromRepository(repoOptions)
  
  let data = candles || []
  
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
