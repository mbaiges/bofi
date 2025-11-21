import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
import StrategyResultDetail from '../models/strategies/StrategyResultDetail.js';
import TakeProfitExitStrategy from '../exit_strategies/TakeProfitExitStrategy.js';
import DefaultFullStrategy from '../strategies/DefaultFullStrategy.js';
import DelayedCompositeStrategy from '../strategies/DelayedCompositeStrategy.js';
import StandardBollingerBandsStrategy from '../strategies/StandardBollingerBandsStrategy.js';
import RSIBollingerStrategy from '../strategies/RSIBollingerStrategy.js';
import FullStrategy from '../strategies/FullStrategy.js';
import { getConfiguredStrategy } from '../repositories/strategies.js';

const STRATEGIES = [
    new StandardDMIStrategy(20),
];

const strategiesMap = new Map(STRATEGIES.map(strategy => [strategy.id, strategy]));

/**
 * Build a strategy instance from configuration
 * @param {Object} strategyConfig - Strategy configuration with { id, config }
 * @returns {Strategy} The instantiated strategy class
 */
export function buildStrategy({ id, config }) {
    switch (id) {
        case 'standard-dmi-strategy':
        case 'StandardDMIStrategy':
            return new StandardDMIStrategy(config.adxStrengthThreshold);

        case 'take-profit-exit-strategy':
        case 'TakeProfitExitStrategy':
            return new TakeProfitExitStrategy(config.pct);

        case 'standard-bollinger-bands-strategy':
        case 'StandardBollingerBandsStrategy':
            return new StandardBollingerBandsStrategy(
                config.period,
                config.stdDev,
                config.adxStrengthThreshold
            );
        
        case 'rsi-bollinger-strategy':
        case 'RSIBollingerStrategy':
            return new RSIBollingerStrategy();

        case 'default-full-strategy':
        case 'DefaultFullStrategy': {
            const tradingStrategy = buildStrategy(config.tradingStrategy);
            const exitStrategy = buildStrategy(config.exitStrategy);
            return new DefaultFullStrategy(
                'default-full-strategy',
                'Default Full Strategy',
                'Combines a trading and an exit strategy',
                tradingStrategy,
                exitStrategy
            );
        }

        case 'delayed-composite-strategy':
        case 'DelayedCompositeStrategy': {
            const strategies = config.strategies.map(stratConfig => buildStrategy(stratConfig));
            return new DelayedCompositeStrategy(
                'delayed-composite-strategy',
                'Delayed Composite Strategy',
                'Aggregates signals from multiple strategies',
                strategies,
                config.minSignals,
                config.delayMin,
                config.delayMax
            );
        }

        default:
            throw new Error(`Unknown strategy id: ${id}`);
    }
}

/**
 * Get a configured strategy instance from the repository
 * @param {string} configuredStrategyId - The unique ID of the configured strategy
 * @returns {Strategy} The instantiated strategy class
 */
export function getConfiguredStrategyInstance(configuredStrategyId) {
    const configuredStrategy = getConfiguredStrategy(configuredStrategyId);
    
    if (!configuredStrategy) {
        throw new Error(`Configured strategy with id ${configuredStrategyId} not found`);
    }
    
    // The configured strategy's config has { id, config } structure
    return buildStrategy(configuredStrategy.config);
}

/**
 * @param {HydratedCandle[]} candles
 * @param {string} strategyId
 * @returns {StrategyResultDetail}
 */
function calculateStrategy(candles, strategyId) {
    const strategy = strategiesMap.get(strategyId);

    if (!strategy) {
        throw new Error(`Strategy with id ${strategyId} not found`);
    }

    const results = [];

    for (let i = 0; i < candles.length; i++) {
        const subCandles = candles.slice(0, i+1);
        const result = strategy.process(subCandles);
        results.push(result);
    }

    return new StrategyResultDetail(strategy.id, strategy.name, strategy.description, results);
}

export {
    calculateStrategy,
};
