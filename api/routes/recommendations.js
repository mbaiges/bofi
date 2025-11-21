import { Router } from 'express';
import { processRecommendations } from '../services/recommendations.js';
import moment from 'moment';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { tradings } = req.body;

        // Input validation
        if (!tradings) {
            return res.status(400).json({ error: 'Missing tradings in request body' });
        }

        if (!Array.isArray(tradings)) {
            return res.status(400).json({ error: 'tradings must be an array' });
        }

        if (tradings.length === 0) {
            return res.status(400).json({ error: 'tradings array cannot be empty' });
        }

        // Validate each trading entry
        for (const trading of tradings) {
            if (!trading.ticker) {
                return res.status(400).json({ error: 'Missing ticker in trading configuration' });
            }

            if (!trading.strategies || !Array.isArray(trading.strategies)) {
                return res.status(400).json({ error: 'Missing or invalid strategies array in trading configuration' });
            }

            if (trading.strategies.length === 0) {
                return res.status(400).json({ error: 'strategies array cannot be empty' });
            }

            // Validate each strategy entry
            for (const strategy of trading.strategies) {
                if (!strategy.confStrategyId) {
                    return res.status(400).json({ error: 'Missing conf_strategy_id in strategy configuration' });
                }

                if (!strategy.timespan) {
                    return res.status(400).json({ error: 'Missing timespan in strategy configuration' });
                }

                // Validate timespan value
                const validTimespans = ['minute', 'hour', 'day', 'week', 'month'];
                if (!validTimespans.includes(strategy.timespan)) {
                    return res.status(400).json({ 
                        error: `Invalid timespan: "${strategy.timespan}". Must be one of: ${validTimespans.join(', ')}` 
                    });
                }
            }
        }

        // Process recommendations
        const results = await processRecommendations({ tradings });

        res.json(results);
    } catch (error) {
        console.error('Error processing recommendations:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

