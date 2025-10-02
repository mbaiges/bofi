import { connect, getCandles } from './tradingview-ws.js'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend/public')))

// Store candles data
let candlesData = null

// API endpoint to get candles data
app.get('/api/candles', async (req, res) => {
  const { symbol = 'GOOGL', timeframe = '1D', amount = 100 } = req.query
  
  try {
    console.log(`Fetching ${symbol} data (${timeframe}, ${amount} candles)...`)
    const connection = await connect()
    const candles = await getCandles({
      connection,
      symbols: [symbol],
      amount: parseInt(amount),
      timeframe: timeframe
    })
    await connection.close()
    
    const data = candles[0]
    console.log(`Loaded ${data.length} candles for ${symbol}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Ready to fetch data dynamically!')
})