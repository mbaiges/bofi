let currentChart = null;

async function loadChart(symbol = 'GOOGL', timeframe = '1D', amount = 100, from, to) {
    try {
        // Show loading state
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('chart').style.display = 'none';
        
        // Disable the load button
        const loadButton = document.getElementById('load-chart');
        loadButton.disabled = true;
        loadButton.textContent = 'Loading...';
        
        let url = `/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`;
        if (from && to) {
            url += `&from=${from}&to=${to}`;
        } else {
            url += `&amount=${amount}`;
        }

        // Fetch data from API
        const response = await fetch(url);
        
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
    // Set default dates (3 months ago to today)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - 3);
    document.getElementById('to-date').value = toDate.toISOString().split('T')[0];
    document.getElementById('from-date').value = fromDate.toISOString().split('T')[0];
    
    // Load initial chart
    loadChart(
        'GOOGL',
        '1D',
        100,
        document.getElementById('from-date').value,
        document.getElementById('to-date').value
    );
    
    // Load chart button click handler
    document.getElementById('load-chart').addEventListener('click', function() {
        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const timeframe = document.getElementById('timeframe').value;
        const amount = parseInt(document.getElementById('amount').value) || 100;
        const from = document.getElementById('from-date').value;
        const to = document.getElementById('to-date').value;
        
        if (!symbol) {
            alert('Please enter a symbol');
            return;
        }
        
        if (from && to) {
            loadChart(symbol, timeframe, null, from, to);
        } else {
            loadChart(symbol, timeframe, amount);
        }
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