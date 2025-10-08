import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import apiRouter from './routes/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, 'config/.env') })

const app = express()
const PORT = 3000

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend/public')))

// API routes
app.use('/api/candles', apiRouter)

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Ready to fetch data dynamically!')
})