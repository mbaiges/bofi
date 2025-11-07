import { Router } from 'express'
import { getCandles } from '../services/candles.js'
import { calculateStrategy } from '../services/strategies.js'

const router = Router()

router.get('/', async (req, res) => {
  const { symbol = 'GOOGL', range = 1, timespan = 'day', limit = 100, hydrate, from, to } = req.query
  
  try {
    console.log(`Fetching ${symbol} data...`)
    
    const data = await getCandles({ symbol, range, timespan, limit, hydrate, from, to })

    const dmiStrategyResult = calculateStrategy(data, 'standard-dmi')

    // Hydrate the candles with the strategy results
    for (let i = 0; i < data.length; i++) {
      data[i].strategiesResults = {
        'standard-dmi': dmiStrategyResult.result[i]
      };
    }

    console.log(`Loaded ${data.length} candles for ${symbol}`)
    res.json({
      	"candles": data,
        "strategiesDetails": {
          "standard-dmi": {
            "id": dmiStrategyResult.id,
            "name": dmiStrategyResult.name,
            "description": dmiStrategyResult.description
          }
        }
      })
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
