import Strategy from './Strategy.js';
import Operation from '../models/strategies/Operation.js';
import CompositeStrategyResult from '../models/strategies/CompositeStrategyResult.js';
import DelayedCompositeStrategyResult from '../models/strategies/DelayedCompositeStrategyResult.js';

class DelayedCompositeStrategy extends Strategy {
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

    process(candles) {
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
                const result = strategy.process(candleSubset);
                strategyResultsInWindow.push(result);

                if (result.recommendedOperation === Operation.BUY) {
                    totalBuySignals++;
                } else if (result.recommendedOperation === Operation.SELL) {
                    totalSellSignals++;
                }
            }
            compositeResults.push(new CompositeStrategyResult(strategy.id, strategyResultsInWindow));
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
