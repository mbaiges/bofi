class CompositeStrategyResult {
    /**
     * @param {string} strategyId
     * @param {import('./StrategyResult.js').default[]} strategyResults
     */
    constructor(strategyId, strategyResults) {
        this.strategyId = strategyId;
        this.strategyResults = strategyResults;
    }
}

export default CompositeStrategyResult;
