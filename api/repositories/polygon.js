import axios from 'axios'

export async function getCandles({ ticker, from, to, range, timespan = 'day', limit }) {
  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY environment variable not set')
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${range}/${timespan}/${from}/${to}`

  try {
    const response = await axios.get(url, {
      params: {
        adjusted: true,
        sort: 'asc',
        limit: limit,
        apiKey: apiKey,
      },
    })

    if (response.data && response.data.results) {
      return response.data.results.map(c => ({
        timestamp: c.t / 1000,
        date: new Date(c.t).toISOString(),
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
        volume: c.v
      }));
    }

    return []
  } catch (error) {
    console.error('Error fetching candles from Polygon.io:', error)
    throw error
  }
}
