import Strategy from './Strategy.js';
import StrategyResult from './StrategyResult.js';
import Operation from './Operation.js';

class StandardDMIStrategy extends Strategy {
    constructor() {
        super('Standard DMI Strategy', 'A standard strategy based on Directional Movement Index.');
    }

    /**
     * @param {any[]} candles
     * @returns {StrategyResult}
     */
    process(candles) {
        // Empty for now as requested.
        return new StrategyResult(Operation.HOLD);
    }
}

export default StandardDMIStrategy;
