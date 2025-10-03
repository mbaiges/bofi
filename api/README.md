# API Service

This folder contains the backend API service for the trading bot system.

## Structure
- `server.js` - Main Express server
- `tradingview-ws.js` - TradingView WebSocket client
- `routes/` - API route handlers
- `services/` - Business logic services
- `utils/` - Utility functions
- `config/` - Configuration files

## Dependencies
- Express.js
- TradingView WebSocket client
- Technical indicators
- Database (if needed)

## Usage
```bash
cd api
npm start
```

## API Endpoints
- `GET /api/candles` - Get candlestick data for a symbol
  - Query params: 
    - `symbol` (string, default: 'GOOGL')
    - `timeframe` (string, default: '1D')
    - `amount` (number, default: 100)
    - `from` (string, optional): Start date for candle data (e.g., '2025-01-01').
    - `to` (string, optional): End date for candle data (e.g., '2025-01-02').
    - `hydrate` (boolean, optional): If true, adds technical indicators to the candle data.

### Example

**Request:**
```bash
curl --location 'http://127.0.0.1:3000/api/candles?symbol=GOOGL&timeframe=1D&from=2025-01-01&to=2025-01-02&amount=2&hydrate=true'
```

**Response:**
```json
[
    {
        "timestamp": 1759325400,
        "date": "2025-10-01T13:30:00.000Z",
        "open": 240.75,
        "high": 246.3,
        "low": 238.61,
        "close": 244.9,
        "volume": 31658234,
        "indicators": {
            "dmi": {
                "adx": 25.3,
                "di_positive": 22.5,
                "di_negative": 18.9
            }
        }
    },
    {
        "timestamp": 1759411800,
        "date": "2025-10-02T13:30:00.000Z",
        "open": 245.15,
        "high": 246.81,
        "low": 242.3,
        "close": 245.69,
        "volume": 25483298,
        "indicators": {
            "dmi": {
                "adx": 26.1,
                "di_positive": 23.1,
                "di_negative": 18.2
            }
        }
    }
]
```
