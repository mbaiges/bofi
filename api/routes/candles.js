import { Router } from 'express'
import { getCandles } from '../services/candles.js'

const router = Router()

router.get('/', async (req, res) => {
  const { symbol = 'GOOGL', range = 1, timespan = 'day', limit = 100, hydrate, from, to } = req.query
  
  try {
    console.log(`Fetching ${symbol} data...`)
    
    const data = await getCandles({ symbol, range, timespan, limit, hydrate, from, to })

    console.log(`Loaded ${data.length} candles for ${symbol}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
