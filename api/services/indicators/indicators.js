import DMIIndicator from './dmi_indicator.js';

export const indicators = [
  new DMIIndicator(14)
];

export function hydrateWithIndicators(candles) {
  let hydratedCandles = [...candles];
  for (const indicator of indicators) {
    hydratedCandles = indicator.calculate(hydratedCandles);
  }
  return hydratedCandles;
}
