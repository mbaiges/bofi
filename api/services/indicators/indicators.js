import DMIIndicator from './dmi_indicator.js';
import BollingerBandsIndicator from './bb_indicator.js';

export const indicators = [
  new DMIIndicator(14),
  new BollingerBandsIndicator(20, 2)
];

export function hydrateWithIndicators(candles) {
  let hydratedCandles = [...candles];
  for (const indicator of indicators) {
    hydratedCandles = indicator.calculate(hydratedCandles);
  }
  return hydratedCandles;
}
