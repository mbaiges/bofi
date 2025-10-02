// Bot Configuration
export const BOT_CONFIG = {
  // Monitoring settings
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
  timeframe: '1D',
  amount: 50,
  
  // Schedule settings
  checkInterval: '*/5 * * * *', // Every 5 minutes
  enabled: true,
  
  // Notification settings
  notifications: {
    enabled: true,
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      },
      to: []
    },
    discord: {
      enabled: false,
      webhookUrl: ''
    },
    console: {
      enabled: true
    }
  },
  
  // Technical indicators
  indicators: {
    rsi: {
      enabled: true,
      period: 14,
      overbought: 70,
      oversold: 30
    },
    macd: {
      enabled: true,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9
    },
    sma: {
      enabled: true,
      periods: [20, 50, 200]
    }
  },
  
  // Signal thresholds
  signals: {
    minVolume: 1000000, // Minimum volume for signal
    priceChangeThreshold: 0.02, // 2% price change
    rsiThreshold: 5, // RSI change threshold
  }
}

export default BOT_CONFIG
