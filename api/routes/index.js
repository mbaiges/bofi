import { Router } from 'express'
import candlesRouter from './candles.js'

const router = Router()

router.use('/', candlesRouter)

export default router
