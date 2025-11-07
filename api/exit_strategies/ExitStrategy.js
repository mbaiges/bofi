class ExitStrategy {
    id = '';
    name = '';
    description = '';

    /**
     * @param {string} id
     * @param {string} name 
     * @param {string} description 
     */
    constructor(id, name, description) {
        if (this.constructor === ExitStrategy) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.id = id;
        this.name = name;
        this.description = description;
    }

    /**
     * @param {number} entryPrice - The price at which the position was entered
     * @param {number} currentPrice - The current price of the asset
     * @param {any[]} candles - The historic candle data
     * @returns {boolean} - Returns true if the position should be exited
     */
    shouldExit(entryPrice, currentPrice, candles) {
        throw new Error("Method 'shouldExit()' must be implemented.");
    }

    /**
     * @param {number} entryPrice - The price at which the position was entered
     * @param {number} currentPrice - The current price of the asset
     * @param {any[]} candles - The historic candle data
     * @returns {number} - Returns the calculated exit price
     */
    calculateExitPrice(entryPrice, currentPrice, candles) {
        throw new Error("Method 'calculateExitPrice()' must be implemented.");
    }
}

export default ExitStrategy;

