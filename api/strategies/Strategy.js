class Strategy {
    name = '';
    description = '';

    /**
     * @param {string} name 
     * @param {string} description 
     */
    constructor(name, description) {
        if (this.constructor === Strategy) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.name = name;
        this.description = description;
    }

    /**
     * @param {any[]} candles
     * @returns {import('../models/strategies/StrategyResult')}
     */
    process(candles) {
        throw new Error("Method 'process()' must be implemented.");
    }
}

export default Strategy;
