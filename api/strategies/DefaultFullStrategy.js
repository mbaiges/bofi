import FullStrategy from './FullStrategy.js';
import StrategyResult from '../models/strategies/StrategyResult.js';
import Operation from '../models/strategies/Operation.js';

class DefaultFullStrategy extends FullStrategy {
    tradingStrategy;
    exitStrategy;

    constructor(id, name, description, tradingStrategy, exitStrategy) {
        super(id, name, description);
        this.tradingStrategy = tradingStrategy;
        this.exitStrategy = exitStrategy;
    }

    process(candles, inPosition, entryPrice) {
        const tradingResult = this.tradingStrategy.process(candles);
        let operation = tradingResult.recommendedOperation;
        let exitPrice = null;

        if (inPosition && entryPrice) {
            const currentCandle = candles[candles.length - 1];
            const shouldExit = this.exitStrategy.shouldExit(entryPrice, currentCandle.low, candles);
            const tradingSell = tradingResult.recommendedOperation === Operation.SELL;

            if (shouldExit || tradingSell) {
                operation = Operation.SELL;
                if (shouldExit) {
                    exitPrice = this.exitStrategy.calculateExitPrice(entryPrice, currentCandle.low, candles);
                }
            }
        }

        const result = new StrategyResult(operation);
        if (operation === Operation.SELL && exitPrice !== null) {
            result.exitPrice = exitPrice;
        }
        return result;
    }
}

export default DefaultFullStrategy;
