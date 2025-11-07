import StrategyResult from './StrategyResult.js';

class DelayedCompositeStrategyResult extends StrategyResult {
    /**
     * @param {string} recommendedOperation
     * @param {import('./CompositeStrategyResult.js').default[]} compositeStrategyResult
     */
    constructor(recommendedOperation, compositeStrategyResult) {
        super(recommendedOperation);
        this.compositeStrategyResult = compositeStrategyResult;
    }
}

export default DelayedCompositeStrategyResult;
