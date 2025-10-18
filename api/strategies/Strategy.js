class Strategy {
    id = '';
    name = '';
    description = '';

    /**
     * @param {string} id
     * @param {string} name 
     * @param {string} description 
     */
    constructor(id, name, description) {
        if (this.constructor === Strategy) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.id = id;
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
