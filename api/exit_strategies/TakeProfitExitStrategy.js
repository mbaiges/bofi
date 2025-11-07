import ExitStrategy from './ExitStrategy.js';

class TakeProfitExitStrategy extends ExitStrategy {
    pct = 0.1; // Percentage threshold: positive for take profit, negative for stop loss

    constructor(pct = 0.1) {
        super(
            'take-profit-exit',
            'Take Profit Exit Strategy',
            'Exits the position when a profit or loss percentage threshold is reached. ' +
            'If pct is positive, exits when profit >= pct (take profit). ' +
            'If pct is negative, exits when loss <= pct (stop loss).'
        );
        this.pct = pct;
    }

    /**
     * @param {number} entryPrice - The price at which the position was entered
     * @param {number} currentPrice - The current price of the asset
     * @param {any[]} candles - The historic candle data
     * @returns {boolean} - Returns true if the position should be exited
     */
    shouldExit(entryPrice, currentPrice, candles) {
        if (!entryPrice || !currentPrice) {
            return false;
        }

        const priceChange = (currentPrice - entryPrice) / entryPrice;
        
        // If pct is positive, it's a take profit (exit when profit >= pct)
        if (this.pct > 0 && priceChange >= this.pct) {
            return true;
        }

        // If pct is negative, it's a stop loss (exit when loss <= pct, meaning loss is more negative)
        if (this.pct < 0 && priceChange <= this.pct) {
            return true;
        }

        return false;
    }

    /**
     * @param {number} entryPrice - The price at which the position was entered
     * @param {number} currentPrice - The current price of the asset
     * @param {any[]} candles - The historic candle data
     * @returns {number}
     */
    calculateExitPrice(entryPrice, currentPrice, candles) {
        return entryPrice * (1 + this.pct);
    }
}

export default TakeProfitExitStrategy;

