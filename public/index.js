let currentChart = null;

async function loadChart(symbol = 'GOOGL', timeframe = '1D', amount = 100) {
    try {
        // Show loading state
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('chart').style.display = 'none';
        
        // Disable the load button
        const loadButton = document.getElementById('load-chart');
        loadButton.disabled = true;
        loadButton.textContent = 'Loading...';
        
        // Fetch data from API
        const response = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&amount=${amount}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const candles = await response.json();
        
        if (!candles || candles.length === 0) {
            throw new Error('No data received');
        }
        
        // Hide loading, show chart
        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart').style.display = 'block';
        
        // Destroy existing chart if it exists
        if (currentChart) {
            currentChart.remove();
        }
        
        // Create the chart
        currentChart = LightweightCharts.createChart(document.getElementById('chart'), {
            width: document.getElementById('chart').clientWidth,
            height: 500,
            layout: {
                background: { color: '#2d2d2d' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2d2d2d' },
                horzLines: { color: '#2d2d2d' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#485c7b',
            },
            timeScale: {
                borderColor: '#485c7b',
            },
        });
        
        // Create candlestick series
        const candlestickSeries = currentChart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        
        // Convert our data to the format expected by the chart
        const chartData = candles.map(candle => ({
            time: candle.date.split('T')[0], // Convert to YYYY-MM-DD format
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        }));
        
        // Set the data
        candlestickSeries.setData(chartData);
        
        // Create a separate pane for volume (smaller height)
        const volumePane = currentChart.addPane({
            height: 120, // Smaller height for volume pane
        });
        
        // Add volume series to the separate pane
        const volumeSeries = volumePane.addSeries(LightweightCharts.HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Separate price scale for volume
        });
        
        // Configure volume scale margins for better display
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.2, // Small margin at top
                bottom: 0, // No margin at bottom
            },
        });
        
        const volumeData = candles.map(candle => ({
            time: candle.date.split('T')[0],
            value: candle.volume,
            color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
        }));
        
        // Set the volume data
        volumeSeries.setData(volumeData);
        
        // Fit the chart to the data
        currentChart.timeScale().fitContent();
        
        // Update info display
        document.getElementById('current-symbol').textContent = symbol;
        document.getElementById('current-timeframe').textContent = timeframe;
        document.getElementById('chart-title').textContent = `${symbol} Candlestick Chart`;
        
        console.log(`Chart loaded with ${candles.length} candles for ${symbol} (${timeframe})`);
        
    } catch (error) {
        console.error('Error loading chart:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = `Error: ${error.message}`;
    } finally {
        // Re-enable the load button
        const loadButton = document.getElementById('load-chart');
        loadButton.disabled = false;
        loadButton.textContent = 'Load Chart';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load initial chart
    loadChart();
    
    // Load chart button click handler
    document.getElementById('load-chart').addEventListener('click', function() {
        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const timeframe = document.getElementById('timeframe').value;
        const amount = parseInt(document.getElementById('amount').value) || 100;
        
        if (!symbol) {
            alert('Please enter a symbol');
            return;
        }
        
        loadChart(symbol, timeframe, amount);
    });
    
    // Enter key handler for symbol input
    document.getElementById('symbol').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('load-chart').click();
        }
    });
});

// Handle window resize
window.addEventListener('resize', () => {
    if (currentChart) {
        currentChart.applyOptions({
            width: document.getElementById('chart').clientWidth,
        });
    }
});