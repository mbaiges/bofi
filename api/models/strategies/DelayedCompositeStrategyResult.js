import StrategyResult from './StrategyResult.js';

class DelayedCompositeStrategyResult extends StrategyResult {
    /**
     * @param {string} recommendedOperation
     * @param {import('./CompositeStrategyResults.js').default[]} compositeStrategiesResults
     */
    constructor(recommendedOperation, compositeStrategiesResults) {
        super(recommendedOperation);
        this.compositeStrategiesResults = compositeStrategiesResults;
    }
}

export default DelayedCompositeStrategyResult;
