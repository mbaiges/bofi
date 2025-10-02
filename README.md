# Trading Bot System

A comprehensive trading bot system with API, frontend, and bot services for monitoring stocks and displaying charts.

## 🏗️ Architecture

```
bofi/
├── api/                    # Backend API service
│   ├── server.js          # Express server
│   ├── tradingview-ws.js  # TradingView WebSocket client
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── config/            # Configuration
├── frontend/              # Frontend web application
│   ├── public/            # Static files
│   │   ├── index.html     # Main page
│   │   └── index.js       # Chart logic
│   ├── styles/            # CSS files
│   └── components/        # UI components
└── bot/                   # Trading bot service
    ├── index.js           # Main bot logic
    ├── indicators/        # Technical indicators
    ├── notifications/     # Alert systems
    └── config/            # Bot configuration
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Start API Server
```bash
npm run dev:api
```
The API will be available at `http://localhost:3000`

### 3. Start Bot Service (Optional)
```bash
npm run dev:bot
```

### 4. Access the Application
Open your browser and go to `http://localhost:3000`

## 📊 Features

### API Service
- ✅ TradingView WebSocket integration
- ✅ Dynamic symbol and timeframe selection
- ✅ RESTful API endpoints
- ✅ Real-time data fetching

### Frontend
- ✅ Interactive TradingView charts
- ✅ Symbol and timeframe selection
- ✅ Volume visualization in separate pane
- ✅ Responsive design

### Bot Service
- ✅ Automated stock monitoring
- ✅ Configurable check intervals
- ✅ Multiple symbol support
- ✅ Extensible for technical indicators
- ✅ Notification system (planned)

## 🛠️ Development

### Available Scripts
- `npm start` - Start API server
- `npm run dev:api` - Start API in development mode
- `npm run dev:bot` - Start bot service
- `npm run dev:all` - Start both API and bot
- `npm run install:all` - Install all dependencies

### Adding New Features
1. **API Routes**: Add to `api/routes/`
2. **Services**: Add to `api/services/`
3. **Frontend Components**: Add to `frontend/components/`
4. **Bot Indicators**: Add to `bot/indicators/`
5. **Notifications**: Add to `bot/notifications/`

## 📈 Usage

### Chart Interface
1. Enter a symbol (e.g., AAPL, GOOGL, MSFT)
2. Select timeframe (1M, 1H, 1D, 1W, 1M)
3. Set number of candles (10-1000)
4. Click "Load Chart"

### Bot Monitoring
The bot automatically monitors configured symbols and can be extended with:
- Technical indicators (RSI, MACD, Moving Averages)
- Signal detection
- Email/Discord notifications
- Database storage

## 🔧 Configuration

### API Configuration
Edit `api/config/` files for API settings

### Bot Configuration
Edit `bot/config/config.js` for bot settings:
- Symbols to monitor
- Check intervals
- Notification settings
- Technical indicator parameters

## 📝 License

MIT License
