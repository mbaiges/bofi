import { getCandles as getCandlesFromRepository } from '../repositories/polygon.js';
import { hydrateWithIndicators, indicators } from './indicators/indicators.js';
import moment from 'moment';
import HydratedCandle from '../models/HydratedCandle.js';

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

  // Always fetch from 2023-01-01 or earlier if requested date is earlier
  const MIN_FETCH_DATE = '2023-01-01'

  let repoFrom = from
  let repoTo = to
  let totalPeriodsToFetch

  if (hydrate) {
    if (from && to) {
      const requestedPeriods = getRequestedPeriods(from, to, range, timespan)
      totalPeriodsToFetch = 10 * calculateRequiredPeriods(requestedPeriods, indicators)
      repoFrom = calculateFromDate(to, totalPeriodsToFetch, range, timespan)
    } else {
      totalPeriodsToFetch = 2 * calculateRequiredPeriods(limit, indicators)
      repoTo = moment().format('YYYY-MM-DD')
      repoFrom = calculateFromDate(repoTo, totalPeriodsToFetch, range, timespan)
    }
  } else {
    // For non-hydrated requests, use the requested dates
    repoFrom = from || MIN_FETCH_DATE
    repoTo = to
    totalPeriodsToFetch = from && to ? getRequestedPeriods(from, to, range, timespan) : limit
  }

  // Ensure we always fetch from at least 2023-01-01 (or earlier if requested)
  if (repoFrom) {
    const requestedFromDate = from ? moment(from) : null
    const minFetchMoment = moment(MIN_FETCH_DATE)
    const calculatedFromMoment = moment(repoFrom)
    
    // Use the earliest date: 2023-01-01, calculated from date, or requested from date
    const earliestDate = moment.min(
      minFetchMoment,
      calculatedFromMoment,
      ...(requestedFromDate ? [requestedFromDate] : [])
    )
    repoFrom = earliestDate.format('YYYY-MM-DD')
  } else {
    repoFrom = MIN_FETCH_DATE
  }

  const repoOptions = {
    ticker: symbol,
    from: repoFrom,
    to: repoTo,
    range,
    timespan,
    limit: options.limit || 50000,
  }

  const candlesFromRepo = await getCandlesFromRepository(repoOptions)
  const candles = candlesFromRepo.map(c => new HydratedCandle(c));
  
  let data = candles || []
  
  if (hydrate) {
    data = hydrateWithIndicators(data)
  }

  if (from) {
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000)
    const toTimestamp = to ? Math.floor(new Date(to).getTime() / 1000) : null
    data = data.filter(c => c.timestamp >= fromTimestamp && (!toTimestamp || c.timestamp <= toTimestamp))
  } else {
    data = data.slice(-limit)
  }

  return data
}
