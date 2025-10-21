# Backtesting Endpoint Architecture

## Overview
The `/backtesting` endpoint provides automated multi-strategy financial backtesting across multiple assets and strategies, returning detailed candle-by-candle trading simulation and performance benchmarking. This document explains its design, expected input/output structures, data flows, core components, and system interactions.

---

## 1. API Endpoint Specification

- **Route:** `POST /api/backtesting`
- **Purpose:** Accepts a set of trading configurations and timeframes, then runs backtests for each trading setup, simulating each step and returning results and benchmarks.

### Example Request
```json
{
  "settings": {
    "initial_nominals": 10000,
    "from": "2023-01-01",
    "to": "2023-12-31",
    "range": 1,
    "timespan": "day",
    "fee": 0.001
  },
  "tradings": [
    {
      "ticker": "AAPL",
      "strategy": { "id": "StandardDMIStrategy", "config": {"paramA": 5} },
      "out_strategy": { "id": "TakeProfitExit", "config": {"pct": 10} }
    }
  ]
}
```

### Example Response
```json
{
  "tradings_results": [
    {
      "trading_candles": [
        {
          "timestamp": 1661318357000,
          "date": "2023-02-13T00:00:00Z",
          "open": 145,
          "high": 150,
          "low": 144,
          "close": 148,
          "volume": 1000000,
          "indicators": {"dmi": "..."},
          "strategy_result": {"recommendedOperation": "BUY"},
          "current_balance": 10500.50,
          "current_nominals": 70
        },
        {
          "timestamp": 1661404757000,
          "date": "2023-02-14T00:00:00Z",
          "open": 148,
          "high": 153,
          "low": 145,
          "close": 150,
          "volume": 1200000,
          "indicators": {"dmi": "..."},
          "strategy_result": {"recommendedOperation": "HOLD"},
          "current_balance": 10700.90,
          "current_nominals": 70
        }
      ],
      "balance": {
        "roi": 0.11,
        "initial_balance": 1450000.00,
        "initial_nominals": 10000,
        "final_balance": 11100.00,
        "final_nominals": 70,
        "winning_trades": 7,
        "losing_trades": 3,
        "total_wins": 8000.50,
        "total_losses": -3200.20,
        "total_fees": 210.13
      },
      "strategyDef": {
        "id": "StandardDMIStrategy",
        "config": {"paramA": 5}
      }
    }
  ],
  "benchmark": {
    "best_roi": 0.11,
    "best_strategy": { "id": "StandardDMIStrategy", "config": {"paramA": 5} }
  }
}
```

---

## 2. Request Structure Details
- **settings:**  
  - `initial_nominals` (`int`): The number of units/shares/contracts to hold for each trading. **Not a starting cash, but quantity.**
  - `from` / `to` (`date`): Time window for all simulations.  
  - `range` (`int`): Number of timespans (typically 1) for each period in backtesting.
  - `timespan` (`string`): Interval of each candle (e.g., `day`).
  - `fee` (`float`, 0 to 1): Transaction fee as a percentage.

- **tradings:** Array of trading setups. Each:
  - `ticker` (`string`): Asset symbol.
  - `strategy` (`{id, config}`): Entry/holding strategy identifier and params.
  - `out_strategy` (`{id, config}`): Exit/stop/TP strategy definition. See notes below regarding support for multiple out strategies.

---

## 3. Response Structure Details
- **tradings_results (array):** One per trading setup. Each object:
  - `trading_candles` (array): Sequence of candle-level records, each:
    - OHLCV: `timestamp`, `date`, `open`, `high`, `low`, `close`, `volume`
    - `indicators`: Calculated values used for decisions.
    - `strategy_result`: Output per strategy for the candle (conforms to `@StrategyResult.js`).
    - `current_balance`: Portfolio value evolution.
    - `current_nominals` (int): Asset quantity at this candle (integer).
  - **balance** (object):
    - `roi`: Return on investment (final/initial - 1.0).
    - `initial_balance`: Product of `initial open price` x `initial_nominals` at simulation start.
    - `initial_nominals` (int): Nominals as at simulation start.
    - `final_balance`: Cash + asset value at end.
    - `final_nominals` (int): Final asset quantity (integer, not float).
    - `winning_trades`, `losing_trades`: Win/loss count for trades closed.
    - `total_wins`: Cumulative net gain for all winning trades (sum of each [sell price - buy price - fees], if positive).
    - `total_losses`: Cumulative net loss for all losing trades (sum of each [sell price - buy price - fees], if negative).
    - `total_fees`: Accumulated transaction/operation fees across all trades (sum of all single-trade fees, including commissions, slippage, etc.).
  - `strategyDef`: Object; the strategy used, including its `id` and `config`.

- **benchmark:**
  - `best_roi`: Highest ROI across all setups.
  - `best_strategy`: Object with `id` and `config` for the best performer.

---

## 4. System Flow & Component Architecture

### 4.1. Input Handling & Validation
- Parse request, required fields check, type validation (dates, numerics, enum for timespan, fee is a number in [0,1]).
- If validation fails: return `400 Bad Request` with details.

### 4.2. Data Preparation
- For each trading setup:
  - Look up ticker historical data using data provider (e.g. Polygon/TradingView via `api/repositories/polygon.js` or `api/services/candles.js`).
  - Collect candles as per settings.
  - If insufficient data or error, skip or return error entry in results.

### 4.3. Strategy Instantiation
- **Strategy/OutStrategy:**
  - Dynamically import corresponding classes/modules by `id` from `api/strategies`.
  - Instantiate with `config` for each simulation.
- **Indicators:**
  - Load and run requested indicators in `api/services/indicators/`.

### 4.4. Simulation Loop
- For each **trading**, for each **candle** (matches the request structure):
  1. Compute indicators.
  2. Run `strategy` to decide entry/hold/exit actions.
  3. If in-position, run `out_strategy` for exit/halt/trailing/take-profit logic.
  4. Update balances (cash, nominal value), log trades, apply fees on trade events.
  5. Track cumulative `total_wins`, `total_losses`, and `total_fees` with each completed trade.
  6. Build candle-level record with all results (`trading_candles`).

### 4.5. Aggregation
- Compute trade-level stats (`winning_trades`, `losing_trades`, `total_wins`, `total_losses`, `total_fees`, final ROI, etc.).
- For all results, extract best performing strategy to populate `benchmark`.

### 4.6. Output Formatting
- Bundle all arrays/objects according to specs above. Use ISO string for dates, floats for currency, integer for nominals, etc.

---

## 5. File & Module Organization

- `api/routes/backtesting.js` — Route & entrypoint.
- `api/services/backtesting.js` — Core logic orchestration (can be new or integrated in strategies.js/candles.js).
- `api/strategies/` — Dynamically loaded strategy modules.
- `api/services/indicators/` — Indicator calculators.
- `api/repositories/polygon.js` — External data fetch.
- `api/models/` — Data shape models (optional, for JSDoc/TS or validation).

---

## 6. Error Handling & Edge Cases
- Report any validation or data provider failure clearly per `trading` slot.
- Handle overlapping tickers, missing/unknown strategy IDs, unavailable data, out-of-range requests.
- Return partial results if possible, with clear error fields on failures.

---

## 7. Design Considerations
- **ESM modules only:** Use `import`/`export` exclusively.
- **Extensible strategies:** Plug in new strategy modules by adding JS file in `api/strategies`.
- **Asynchronous data fetch and processing:** Utilize async/await, handle parallel computation safely.
- **Test coverage:** Add unit and API integration tests for each component.

---

## 8. Example Usage

#### Request (cURL):
```bash
curl -X POST http://localhost:3000/api/backtesting \
  -H "Content-Type: application/json" \
  -d '{"settings": {"initial_nominals":10000, "from":"2023-01-01", "to":"2023-06-01", "range":1, "timespan":"day", "fee":0.001 }, "tradings": [{"ticker":"MSFT", "strategy":{"id":"StandardDMIStrategy","config":{}}, "out_strategy": {"id":"TakeProfitExit","config":{"pct":5}}}]}'
```

#### Example Partial Output
```json
{
  "tradings_results": [ {
      "trading_candles": [
        { "timestamp": ..., "current_nominals": 70, "strategy_result": {"recommendedOperation":"BUY"} ... },
        { "timestamp": ..., "current_nominals": 70, "strategy_result": {"recommendedOperation":"HOLD"} ... }
      ],
      "balance": { "final_nominals": 70, "initial_balance": 1450000.00, "initial_nominals": 10000, "total_wins":8000.5, "total_losses":-3200.2, "total_fees":210.13, ... },
      "strategyDef": { "id": "StandardDMIStrategy", "config": {"paramA": 5} }
  } ],
  "benchmark": {"best_roi": ..., "best_strategy": {"id":"...", ...}}
}
```

---

## 9. Out Strategy Extensibility (e.g. for Stop Limit)
To support the use case of multiple out strategies per trading (for example: both a stop loss and a take profit or custom logic):
- **Proposed data model:** Allow `out_strategies` to be an array on each `trading`, e.g.:
```json
{
  "ticker": "AAPL",
  "strategy": { ... },
  "out_strategies": [
    { "id": "StopLossOut", "config": {"min": 130} },
    { "id": "LimitOut", "config": {"max": 160} }
  ]
}
```
- **Implementation:**
  - The simulation should run all `out_strategies` for a given trading, executing the first fulfillment condition per step.
  - Backwards-compatible: support both legacy `out_strategy` (object) and new `out_strategies` (array).
  - Each `out_strategy` should be modular—new conditions/rules can be added as modules.

---

End of file.
