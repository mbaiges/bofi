import { getCandles as getCandlesFromRepository } from '../repositories/polygon.js'
import { hydrateWithIndicators, indicators } from '../utils/indicators.js'
import moment from 'moment'

const getRequestedPeriods = (from, to, range, timespan) => {
  const fromDate = moment(from)
  const toDate = moment(to)
  return toDate.diff(fromDate, timespan) / range
}

const calculateRequiredPeriods = (requestedPeriods, indicators) => {
  const requiredPeriods = indicators.map(indicator => indicator.periodsRequired(requestedPeriods))
  return Math.max(...requiredPeriods)
}

const calculateFromDate = (to, totalPeriods, range, timespan) => {
  return moment(to).subtract(totalPeriods * range, timespan).format('YYYY-MM-DD')
}

export async function getCandles(options) {
  const { symbol, hydrate, from, to, limit = 100, range = 1, timespan = 'day' } = options

  let repoFrom = from
  let repoTo = to
  let totalPeriodsToFetch

  if (hydrate) {
    if (from && to) {
      const requestedPeriods = getRequestedPeriods(from, to, range, timespan)
      console.log('requestedPeriods', requestedPeriods)
      totalPeriodsToFetch = 2 * calculateRequiredPeriods(requestedPeriods, indicators)
      repoFrom = calculateFromDate(to, totalPeriodsToFetch, range, timespan)
    } else {
      totalPeriodsToFetch = 2 * calculateRequiredPeriods(limit, indicators)
      repoTo = moment().format('YYYY-MM-DD')
      repoFrom = calculateFromDate(repoTo, totalPeriodsToFetch, range, timespan)
    }
  } else {
    repoFrom = from
    repoTo = to
    totalPeriodsToFetch = getRequestedPeriods(from, to, range, timespan)
  }

  console.log('repoFrom', repoFrom)
  console.log('repoTo', repoTo)
  console.log('totalPeriodsToFetch', totalPeriodsToFetch)

  const repoOptions = {
    ticker: symbol,
    from: repoFrom,
    to: repoTo,
    range,
    timespan,
    limit: options.limit || 50000,
  }

  const candles = await getCandlesFromRepository(repoOptions)

  console.log('number of candles', candles.length)
  console.log('candles', candles)
  
  let data = candles || []
  
  if (hydrate) {
    data = hydrateWithIndicators(data)
  }

  console.log('data', data)

  if (from) {
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000)
    const toTimestamp = to ? Math.floor(new Date(to).getTime() / 1000) : null
    data = data.filter(c => c.timestamp >= fromTimestamp && (!toTimestamp || c.timestamp <= toTimestamp))
  } else {
    data = data.slice(-limit)
  }

  console.log('--------------------------------')

  return data
}
