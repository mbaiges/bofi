import Strategy from './Strategy.js';

/**
 * @abstract
 */
class FullStrategy extends Strategy {
    constructor(id, name, description) {
        super(id, name, description);
        if (this.constructor === FullStrategy) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    /**
     * @param {any[]} candles
     * @param {boolean} [inPosition]
     * @param {number} [entryPrice]
     * @returns {import('../models/strategies/StrategyResult')}
     */
    process(candles, inPosition, entryPrice) {
        throw new Error("Method 'process()' must be implemented.");
    }
}

export default FullStrategy;
