import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { snakeCaseResponse } from './middleware/snakeCaseResponse.js'
import { camelCaseRequest } from './middleware/camelCaseRequest.js'
// import apiRouter from './routes/index.js'
import candlesRouter from './routes/candles.js'
import backtestingRouter from './routes/backtesting.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, 'config/.env') })

const app = express()
app.disable('etag');

// Middlewares
app.use(express.json());
app.use(camelCaseRequest); // Converts request body to camelCase
app.use(snakeCaseResponse); // Converts response body to snake_case

const PORT = 3000

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend/public')))

// API routes
app.use('/api/candles', candlesRouter)
app.use('/api/backtesting', backtestingRouter)

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Ready to fetch data dynamically!')
})