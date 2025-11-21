import { getCandles } from './candles.js';
import { getConfiguredStrategyInstance } from './strategies.js';
import moment from 'moment';
import FullStrategy from '../strategies/FullStrategy.js';

/**
 * Process recommendations for multiple tradings and strategies
 * @param {Object} input - Input object with tradings array
 * @returns {Object} Recommendations results
 */
export async function processRecommendations(input) {
    const { tradings, currentDate } = input;

    if (!Array.isArray(tradings)) {
        throw new Error('tradings must be an array');
    }

    const tradingsResults = [];

    for (const trading of tradings) {
        const { ticker, strategies } = trading;

        if (!ticker) {
            tradingsResults.push({
                ticker: null,
                error: 'Missing ticker in trading configuration'
            });
            continue;
        }

        if (!Array.isArray(strategies) || strategies.length === 0) {
            tradingsResults.push({
                ticker,
                error: 'Missing or empty strategies array'
            });
            continue;
        }

        const strategiesResults = [];

        for (const strategyConfig of strategies) {
            // Accept both confStrategyId and conf_strategy_id
            const confStrategyId = strategyConfig.confStrategyId || strategyConfig.conf_strategy_id;
            const timespan = strategyConfig.timespan;
            const upgradeable = strategyConfig.upgradeable;
            const avgEntryPrice = strategyConfig.avgEntryPrice || strategyConfig.avg_entry_price;

            if (!confStrategyId) {
                strategiesResults.push({
                    confStrategyId: null,
                    error: 'Missing conf_strategy_id in strategy configuration'
                });
                continue;
            }

            if (!timespan) {
                strategiesResults.push({
                    confStrategyId,
                    error: 'Missing timespan in strategy configuration'
                });
                continue;
            }

            try {
                // Build strategy instance from configured strategy
                const strategyInstance = getConfiguredStrategyInstance(confStrategyId);

                if (!(strategyInstance instanceof FullStrategy)) {
                    strategiesResults.push({
                        confStrategyId,
                        error: `Configured strategy ${confStrategyId} must be a FullStrategy`
                    });
                    continue;
                }

                // Calculate date range: from = 1 week ago, to = currentDate or today
                const to = currentDate || moment().format('YYYY-MM-DD');
                const from = moment(to).subtract(1, 'week').format('YYYY-MM-DD');

                // Fetch candles with hydration for indicators
                const candles = await getCandles({
                    symbol: ticker,
                    from,
                    to,
                    range: 1,
                    timespan,
                    hydrate: true
                });

                if (!candles || candles.length === 0) {
                    strategiesResults.push({
                        confStrategyId,
                        timespan,
                        error: `No candles found for ticker ${ticker} with timespan ${timespan}`
                    });
                    continue;
                }

                // Process candles through strategy to get recommendations
                // Get the last candle's recommendation (today's recommendation)
                const inPosition = avgEntryPrice && avgEntryPrice > 0;
                const entryPrice = inPosition ? avgEntryPrice : null;
                const lastCandleIndex = candles.length - 1;
                const strategyResult = strategyInstance.process(candles, inPosition, entryPrice);
                const exitStrategyResult = strategyResult.exitStrategyResult;
                // Extract recommended operation from last candle
                const recommendedOperation = strategyResult.recommendedOperation || 'HOLD';

                // TODO: Implement timespan upgrade logic
                // Analyze market conditions to suggest upgrading from shorter to longer timespan
                // For now: return null or keep current timespan
                let recommendedUpgradedTimespan = null;
                if (upgradeable) {
                    // Placeholder for future implementation
                    // Example logic would analyze volatility, trends, etc. to suggest:
                    // - Moving from "day" to "week" if conditions are met
                    // - Moving from "week" to "month" if conditions are met
                    // For now, return null (no upgrade recommended)
                    recommendedUpgradedTimespan = null;
                }

                strategiesResults.push({
                    confStrategyId,
                    timespan,
                    recommendedOperation,
                    exitStrategyResult,
                    recommendedUpgradedTimespan
                });

            } catch (error) {
                console.error(`Error processing strategy ${confStrategyId} for ticker ${ticker}:`, error);
                strategiesResults.push({
                    confStrategyId,
                    timespan,
                    error: error.message
                });
            }
        }

        tradingsResults.push({
            ticker,
            strategiesResults
        });
    }

    return {
        tradingsResults
    };
}

