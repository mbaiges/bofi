import StrategyResult from './StrategyResult.js';

class FullStrategyResult extends StrategyResult {
    /**
     * @param {string} recommendedOperation
     * @param {StrategyResult} tradingStrategyResult
     * @param {boolean} exitStrategyResult
     */
    constructor(recommendedOperation, tradingStrategyResult, exitStrategyResult) {
        super(recommendedOperation);
        this.tradingStrategyResult = tradingStrategyResult;
        this.exitStrategyResult = exitStrategyResult;
    }
}

export default FullStrategyResult;
