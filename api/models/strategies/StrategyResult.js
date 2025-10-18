const Operation = require("./Operation");

class StrategyResult {
    /**
     * @param {string} recommendedOperation 
     */
    constructor(recommendedOperation) {
        this.recommendedOperation = recommendedOperation;
    }
}

module.exports = StrategyResult;
