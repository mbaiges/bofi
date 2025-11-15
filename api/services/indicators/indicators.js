import DMIIndicator from './dmi_indicator.js';
import BollingerBandsIndicator from './bb_indicator.js';
import RSIIndicator from './rsi_indicator.js';

export const indicators = [
  new DMIIndicator(14),
  new BollingerBandsIndicator(20, 2), // For your existing BB strategy
  new BollingerBandsIndicator(30, 2), // For the new transcript strategy
  new RSIIndicator(13)                  // For the new transcript strategy
];

export function hydrateWithIndicators(candles) {
  let hydratedCandles = [...candles];
  for (const indicator of indicators) {
    hydratedCandles = indicator.calculate(hydratedCandles);
  }
  return hydratedCandles;
}