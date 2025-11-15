class Indicator {
  constructor(properties = {}) {
    this.properties = properties
    this.id = ''; // All indicators will define their unique ID
  }

  calculate(candles) {
    throw new Error("Method 'calculate(candles)' must be implemented.")
  }

  periodsRequired(requestedPeriods) {
    throw new Error("Method 'periodsRequired(requestedPeriods)' must be implemented.")
  }
}

export default Indicator;