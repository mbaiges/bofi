class HydratedCandle {
    /**
     * @param {object} candleData
     * @param {number} candleData.timestamp
     * @param {string} candleData.date
     * @param {number} candleData.open
     * @param {number} candleData.high
     * @param {number} candleData.low
     * @param {number} candleData.close
     * @param {number} candleData.volume
     */
    constructor({ timestamp, date, open, high, low, close, volume }) {
        this.timestamp = timestamp;
        this.date = date;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
        this.indicators = {};
    }
}

export default HydratedCandle;
