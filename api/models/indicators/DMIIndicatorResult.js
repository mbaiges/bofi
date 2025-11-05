class DMIIndicatorResult {
    /**
     * @param {object} dmiData
     * @param {number|null} dmiData.adx
     * @param {number|null} dmiData.diPositive
     * @param {number|null} dmiData.diNegative
     */
    constructor({ adx, diPositive, diNegative }) {
        this.adx = adx;
        this.diPositive = diPositive;
        this.diNegative = diNegative;
    }
}

export default DMIIndicatorResult;
