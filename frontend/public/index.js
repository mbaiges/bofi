let chart = null;

function processStrategyData(candles) {
    const buyData = [];
    const sellData = [];
    
    candles.forEach(candle => {
        const time = candle.date.split('T')[0];
        let buyCount = 0;
        let sellCount = 0;
        
        // Process each strategy result
        if (candle.strategiesResults) {
            Object.values(candle.strategiesResults).forEach(strategyResult => {
                if (strategyResult && strategyResult.recommendedOperation) {
                    switch (strategyResult.recommendedOperation) {
                        case 'BUY':
                            buyCount++;
                            break;
                        case 'SELL':
                            sellCount++;
                            break;
                        // HOLD and ERROR are ignored (0 value)
                    }
                }
            });
        }
        
        // Add data points for all time periods (including 0 values)
        buyData.push({
            time: time,
            value: buyCount,
            color: 'rgba(38, 166, 154, 0.8)'
        });
        
        sellData.push({
            time: time,
            value: -sellCount, // Negative value for sell signals
            color: 'rgba(239, 83, 80, 0.8)'
        });
    });
    
    return { buyData, sellData };
}

async function loadChart(symbol = 'GOOGL', range = 1, timespan = 'day', limit = 100, from, to) {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('chart').style.display = 'none';
        
        const loadButton = document.getElementById('load-chart');
        loadButton.disabled = true;
        loadButton.textContent = 'Loading...';
        
        let url = `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&timespan=${timespan}&hydrate=true`;
        if (from && to) {
            url += `&from=${from}&to=${to}&limit=50000`;
        } else {
            url += `&limit=${limit}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        const candles = responseData.candles;
        
        if (!candles || candles.length === 0) {
            throw new Error('No data received');
        }
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart').style.display = 'block';
        
        if (chart) chart.remove();
        
        const chartElement = document.getElementById('chart');
        chart = LightweightCharts.createChart(chartElement, {
            width: chartElement.clientWidth,
            height: 500,
            layout: {
                background: { color: '#2d2d2d' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#444' },
                horzLines: { color: '#444' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            timeScale: {
                borderColor: '#485c7b',
            },
        });
        
        // Pane 0 (default) for candlesticks
        const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }, 0);

        // Pane 1 for Volume
        const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
        }, 1); // <-- Correct API: Pass pane index as 2nd argument

        // Pane 2 for DMI
        const adxSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2, title: 'ADX' }, 2);
        const pdiSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#26a69a', lineWidth: 2, title: '+DI' }, 2);
        const ndiSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#ef5350', lineWidth: 2, title: '-DI' }, 2);

        // Pane 3 for Strategy Signals
        const buySignalsSeries = chart.addSeries(LightweightCharts.HistogramSeries, { 
            color: '#26a69a', 
            priceFormat: { type: 'volume' },
            title: 'Buy Signals'
        }, 3);
        const sellSignalsSeries = chart.addSeries(LightweightCharts.HistogramSeries, { 
            color: '#ef5350', 
            priceFormat: { type: 'volume' },
            title: 'Sell Signals'
        }, 3);

        const chartData = candles.map(candle => ({
            time: candle.date.split('T')[0],
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        }));

        const volumeData = candles.map(candle => ({
            time: candle.date.split('T')[0],
            value: candle.volume,
            color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }));
        
        candlestickSeries.setData(chartData);
        volumeSeries.setData(volumeData);

        const dmiData = candles.map(c => ({
            time: c.date.split('T')[0],
            adx: c.indicators?.dmi?.adx,
            pdi: c.indicators?.dmi?.di_positive,
            ndi: c.indicators?.dmi?.di_negative
        })).filter(d => d.adx !== null);
        
        adxSeries.setData(dmiData.map(d => ({ time: d.time, value: d.adx })));
        pdiSeries.setData(dmiData.map(d => ({ time: d.time, value: d.pdi })));
        ndiSeries.setData(dmiData.map(d => ({ time: d.time, value: d.ndi })));

        // Process and set strategy signals data
        const strategyData = processStrategyData(candles);
        buySignalsSeries.setData(strategyData.buyData);
        sellSignalsSeries.setData(strategyData.sellData);

        chart.timeScale().fitContent();
        
        document.getElementById('current-symbol').textContent = symbol;
        document.getElementById('current-timespan').textContent = `${range} ${timespan.charAt(0).toUpperCase() + timespan.slice(1)}`;
        document.getElementById('chart-title').textContent = `${symbol} Candlestick Chart`;
        
        console.log(`Chart loaded with ${candles.length} candles for ${symbol} (${range} ${timespan})`);
        
    } catch (error) {
        console.error('Error loading chart:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = `Error: ${error.message}`;
    } finally {
        const loadButton = document.getElementById('load-chart');
        loadButton.disabled = false;
        loadButton.textContent = 'Load Chart';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(toDate.getMonth() - 3);
    document.getElementById('to-date').value = toDate.toISOString().split('T')[0];
    document.getElementById('from-date').value = fromDate.toISOString().split('T')[0];
    
    loadChart(
        'GOOGL',
        1,
        'day',
        100,
        document.getElementById('from-date').value,
        document.getElementById('to-date').value
    );
    
    document.getElementById('load-chart').addEventListener('click', function() {
        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const range = parseInt(document.getElementById('range').value) || 1;
        const timespan = document.getElementById('timespan').value;
        const limit = parseInt(document.getElementById('limit').value) || 100;
        const from = document.getElementById('from-date').value;
        const to = document.getElementById('to-date').value;
        
        if (!symbol) {
            alert('Please enter a symbol');
            return;
        }
        
        if (from && to) {
            loadChart(symbol, range, timespan, null, from, to);
        } else {
            loadChart(symbol, range, timespan, limit);
        }
    });
    
    document.getElementById('symbol').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('load-chart').click();
        }
    });
});

window.addEventListener('resize', () => {
    if (chart) {
        chart.applyOptions({
            width: document.getElementById('chart').clientWidth,
        });
    }
});