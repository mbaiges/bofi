let chart = null;

function processStrategyDataByStrategy(candles, strategiesDetails) {
    const strategyData = {};
    
    // Initialize data arrays for each strategy
    if (strategiesDetails) {
        Object.keys(strategiesDetails).forEach(strategyId => {
            strategyData[strategyId] = [];
        });
    }
    
    candles.forEach(candle => {
        const time = candle.date.split('T')[0];
        
        // Process each strategy result
        if (candle.strategies_results) {
            Object.keys(candle.strategies_results).forEach(strategyId => {
                const strategyResult = candle.strategies_results[strategyId];
                const strategyInfo = strategiesDetails ? strategiesDetails[strategyId] : null;
                
                let signalValue = 0;
                let tooltipText = '';
                
                if (strategyResult && strategyResult.recommended_operation) {
                    switch (strategyResult.recommended_operation) {
                        case 'BUY':
                            signalValue = 1;
                            tooltipText = strategyInfo ? `${strategyInfo.name}: BUY\n${strategyInfo.description}` : 'BUY';
                            break;
                        case 'SELL':
                            signalValue = -1;
                            tooltipText = strategyInfo ? `${strategyInfo.name}: SELL\n${strategyInfo.description}` : 'SELL';
                            break;
                        case 'HOLD':
                            signalValue = 0;
                            tooltipText = strategyInfo ? `${strategyInfo.name}: HOLD\n${strategyInfo.description}` : 'HOLD';
                            break;
                        case 'ERROR':
                            signalValue = 0;
                            tooltipText = strategyInfo ? `${strategyInfo.name}: ERROR\n${strategyInfo.description}` : 'ERROR';
                            break;
                    }
                }
                
                // Add data point for this strategy
                strategyData[strategyId].push({
                    time: time,
                    value: signalValue,
                    color: 'rgba(38, 166, 154, 0.8)', // Color will be overridden by series color
                    customData: {
                        strategyId: strategyId,
                        strategyName: strategyInfo ? strategyInfo.name : strategyId,
                        strategyDescription: strategyInfo ? strategyInfo.description : '',
                        operation: strategyResult ? strategyResult.recommended_operation : 'UNKNOWN',
                        tooltipText: tooltipText
                    }
                });
            });
        }
    });
    
    return strategyData;
}

function addStrategyTooltip(chart, strategySeries, strategiesDetails) {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'strategy-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 300px;
        white-space: pre-line;
        display: none;
    `;
    document.body.appendChild(tooltip);

    // Add mouse move listener to chart
    chart.subscribeCrosshairMove((param) => {
        if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
            tooltip.style.display = 'none';
            return;
        }

        // Check if we're hovering over strategy signals (pane 3)
        const seriesData = param.seriesData;
        let tooltipContent = '';
        let foundStrategy = false;

        // Check each strategy series
        Object.keys(strategySeries).forEach(strategyId => {
            const series = strategySeries[strategyId];
            const data = seriesData.get(series);
            
            if (data && data.value !== 0) {
                const strategyInfo = strategiesDetails ? strategiesDetails[strategyId] : null;
                const operation = data.value > 0 ? 'BUY' : 'SELL';
                
                if (tooltipContent) tooltipContent += '\n\n';
                tooltipContent += `${strategyInfo ? strategyInfo.name : strategyId}: ${operation}`;
                if (strategyInfo && strategyInfo.description) {
                    tooltipContent += `\n${strategyInfo.description}`;
                }
                foundStrategy = true;
            }
        });

        if (foundStrategy) {
            tooltip.innerHTML = tooltipContent;
            tooltip.style.left = param.point.x + 10 + 'px';
            tooltip.style.top = param.point.y - 10 + 'px';
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    });
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
        const strategiesDetails = responseData.strategies_details;
        
        if (!candles || candles.length === 0) {
            throw new Error('No data received');
        }
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart').style.display = 'block';
        
        if (chart) {
            // Clean up existing tooltip
            const existingTooltip = document.getElementById('strategy-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
            }
            chart.remove();
        }
        
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

        // Pane 3 for Strategy Signals - Create one series per strategy
        const strategyColors = [
            '#26a69a', '#ef5350', '#ff9800', '#9c27b0', '#2196f3', 
            '#4caf50', '#ff5722', '#795548', '#607d8b', '#e91e63'
        ];
        
        const strategySeries = {};
        let colorIndex = 0;
        
        // Create series for each strategy
        if (strategiesDetails) {
            Object.keys(strategiesDetails).forEach(strategyId => {
                const strategyInfo = strategiesDetails[strategyId];
                const color = strategyColors[colorIndex % strategyColors.length];
                
                strategySeries[strategyId] = chart.addSeries(LightweightCharts.HistogramSeries, {
                    color: color,
                    priceFormat: { type: 'volume' },
                    title: strategyInfo.name
                }, 3);
                
                colorIndex++;
            });
        }

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

        // Process and set strategy signals data for each strategy
        const strategyData = processStrategyDataByStrategy(candles, strategiesDetails);
        
        // Set data for each strategy series
        Object.keys(strategySeries).forEach(strategyId => {
            if (strategyData[strategyId]) {
                strategySeries[strategyId].setData(strategyData[strategyId]);
            }
        });

        // Add custom tooltip for strategy signals
        addStrategyTooltip(chart, strategySeries, strategiesDetails);

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