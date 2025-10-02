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
  - Query params: symbol, timeframe, amount
