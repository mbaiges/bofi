import StrategyResult from './StrategyResult.js';

class StrategyResultDetail {
    /**
     * @param {string} id
     * @param {string} name
     * @param {string} description
     * @param {StrategyResult} result
     */
    constructor(id, name, description, result) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.result = result;
    }
}

export default StrategyResultDetail;
