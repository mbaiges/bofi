import FullStrategy from './FullStrategy.js';
import Operation from '../models/strategies/Operation.js';
import OperationDayTime from '../models/strategies/OperationDayTime.js';
import CompositeStrategyResults from '../models/strategies/CompositeStrategyResults.js';
import DelayedCompositeStrategyResult from '../models/strategies/DelayedCompositeStrategyResult.js';

class DelayedCompositeStrategy extends FullStrategy {
    strategies;
    minSignals;
    delayMin;
    delayMax;

    constructor(id, name, description, strategies, minSignals, delayMin, delayMax) {
        super(id, name, description);
        this.strategies = strategies;
        this.minSignals = minSignals;
        this.delayMin = delayMin;
        this.delayMax = delayMax;
    }

    process(candles, inPosition, entryPrice) {
        let totalBuySignals = 0;
        let totalSellSignals = 0;
        const compositeResults = [];

        const lastCandleIndex = candles.length - 1;
        const startIndex = Math.max(0, lastCandleIndex - this.delayMax);
        const endIndex = Math.max(0, lastCandleIndex - this.delayMin);

        for (const strategy of this.strategies) {
            const strategyResultsInWindow = [];
            for (let i = startIndex; i <= endIndex; i++) {
                const candleSubset = candles.slice(0, i + 1);
                
                const result = (strategy instanceof FullStrategy)
                    ? strategy.process(candleSubset, inPosition, entryPrice)
                    : strategy.process(candleSubset);

                strategyResultsInWindow.push(result);

                if (result.recommendedOperation === Operation.BUY) {
                    totalBuySignals++;
                } else if (result.recommendedOperation === Operation.SELL) {
                    totalSellSignals++;
                }
            }
            compositeResults.push(new CompositeStrategyResults(strategy.id, strategyResultsInWindow));
        }

        let recommendedOperation = Operation.HOLD;
        if (totalBuySignals >= this.minSignals) {
            recommendedOperation = Operation.BUY;
        } else if (totalSellSignals >= this.minSignals) {
            recommendedOperation = Operation.SELL;
        }

        return new DelayedCompositeStrategyResult(recommendedOperation, compositeResults);
    }

    getOperationDayTime() {
        // If delayMin is greater than 0, means we are buying on the day after the signal, 
        // so we have to operate on the open price of the current day
        return this.delayMin > 0 ? OperationDayTime.OPEN : OperationDayTime.CLOSE;
    }
}

export default DelayedCompositeStrategy;
