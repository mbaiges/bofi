import StandardDMIStrategy from '../strategies/StandardDMIStrategy.js';
import StrategyResultDetail from '../models/strategies/StrategyResultDetail.js';

const STRATEGIES = [
    new StandardDMIStrategy(20),
];

const strategiesMap = new Map(STRATEGIES.map(strategy => [strategy.id, strategy]));

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

    const result = strategy.process(candles);

    return new StrategyResultDetail(strategy.id, strategy.name, strategy.description, result);
}

export {
    calculateStrategy,
};
