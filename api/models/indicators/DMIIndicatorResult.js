class DMIIndicatorResult {
    /**
     * @param {object} dmiData
     * @param {number|null} dmiData.adx
     * @param {number|null} dmiData.di_positive
     * @param {number|null} dmiData.di_negative
     */
    constructor({ adx, di_positive, di_negative }) {
        this.adx = adx;
        this.di_positive = di_positive;
        this.di_negative = di_negative;
    }
}

export default DMIIndicatorResult;
