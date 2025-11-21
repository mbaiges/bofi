let chart = null;
let backtestSeries = null;
let backtestMarkers = [];
let candlestickSeries = null;

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
        
        candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }, 0);

        const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
        }, 1);

        const adxSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2, title: 'ADX' }, 2);
        const pdiSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#26a69a', lineWidth: 2, title: '+DI' }, 2);
        const ndiSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#ef5350', lineWidth: 2, title: '-DI' }, 2);

        const strategyColors = ['#26a69a', '#ef5350', '#ff9800', '#9c27b0', '#2196f3', '#4caf50', '#ff5722', '#795548', '#607d8b', '#e91e63'];
        const strategySeries = {};
        let colorIndex = 0;
        
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

        const strategyData = processStrategyDataByStrategy(candles, strategiesDetails);
        
        Object.keys(strategySeries).forEach(strategyId => {
            if (strategyData[strategyId]) {
                strategySeries[strategyId].setData(strategyData[strategyId]);
            }
        });

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

function displayBacktestResults(results) {
    const resultsContainer = document.getElementById('backtest-results');
    if (!resultsContainer) return;

    // Check for both camelCase and snake_case property names
    const tradingsResults = results.tradingsResults || results.tradings_results;
    
    if (tradingsResults && tradingsResults.length > 0) {
        const tradingResult = tradingsResults[0];
        const balance = tradingResult.balance;
        const benchmark = results.benchmark;

        // Handle both camelCase and snake_case property names
        const roi = balance.roi || 0;
        const initialBalance = balance.initialBalance || balance.initial_balance || 0;
        const finalBalance = balance.finalBalance || balance.final_balance || 0;
        const totalFees = balance.totalFees || balance.total_fees || 0;
        const winningTrades = balance.winningTrades || balance.winning_trades || 0;
        const losingTrades = balance.losingTrades || balance.losing_trades || 0;
        const totalWins = balance.totalWins || balance.total_wins || 0;
        const totalLosses = balance.totalLosses || balance.total_losses || 0;
        const bestRoi = benchmark?.bestRoi ?? benchmark?.best_roi ?? null;

        const roiPercent = (roi * 100).toFixed(2);
        const roiColor = roi >= 0 ? '#26a69a' : '#ef5350';
        
        resultsContainer.innerHTML = `
            <h3>Backtest Results</h3>
            <div class="backtest-stats">
                <div class="stat-item">
                    <span class="stat-label">ROI:</span>
                    <span class="stat-value" style="color: ${roiColor}">${roiPercent}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Initial Balance:</span>
                    <span class="stat-value">$${initialBalance.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Final Balance:</span>
                    <span class="stat-value">$${finalBalance.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Fees:</span>
                    <span class="stat-value">$${totalFees.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Winning Trades:</span>
                    <span class="stat-value" style="color: #26a69a">${winningTrades}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Losing Trades:</span>
                    <span class="stat-value" style="color: #ef5350">${losingTrades}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Wins:</span>
                    <span class="stat-value" style="color: #26a69a">$${totalWins.toFixed(2)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Losses:</span>
                    <span class="stat-value" style="color: #ef5350">$${totalLosses.toFixed(2)}</span>
                </div>
            </div>
            ${bestRoi !== null ? `
                <div class="benchmark-info">
                    <strong>Best ROI:</strong> <span style="color: ${bestRoi >= 0 ? '#26a69a' : '#ef5350'}">${(bestRoi * 100).toFixed(2)}%</span>
                </div>
            ` : ''}
        `;
        resultsContainer.style.display = 'block';
    }
}

async function runBacktest() {
    const backtestButton = document.getElementById('run-backtest');
    try {
        backtestButton.disabled = true;
        backtestButton.textContent = 'Running...';

        const symbol = document.getElementById('symbol').value.trim().toUpperCase();
        const from = document.getElementById('from-date').value;
        const to = document.getElementById('to-date').value;
        const backtestConfigRaw = document.getElementById('backtest-json').value;

        if (!symbol || !from || !to) {
            alert('Please ensure symbol, from date, and to date are selected.');
            return;
        }

        let backtestConfig;
        try {
            backtestConfig = JSON.parse(backtestConfigRaw);
        } catch (e) {
            alert('Invalid JSON in backtesting configuration.');
            return;
        }

        const response = await fetch(`/api/backtesting?symbol=${symbol}&from=${from}&to=${to}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(backtestConfig)
        });

        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            throw new Error(`Failed to parse response: ${e.message}`);
        }
        
        // Check if the response itself is an error
        if (!response.ok) {
            const errorMsg = responseData.error || responseData.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMsg);
        }
        
        // Debug: log the response structure
        console.log('Backtest response status:', response.status);
        console.log('Backtest response:', responseData);
        console.log('Response keys:', Object.keys(responseData || {}));

        // Check for both camelCase and snake_case property names
        const tradingsResults = responseData.tradingsResults || responseData.tradings_results;
        
        // Get the first trading result (assuming single trading for now)
        if (!tradingsResults) {
            console.error('tradingsResults is undefined/null. Full response:', JSON.stringify(responseData, null, 2));
            throw new Error('No tradingsResults property in response. Check console for details.');
        }
        
        if (tradingsResults.length === 0) {
            console.error('tradingsResults array is empty. Full response:', JSON.stringify(responseData, null, 2));
            throw new Error('No trading results returned from backtest (empty array). Check console for details.');
        }

        const tradingResult = tradingsResults[0];
        
        // Check if there's an error in the result
        if (tradingResult.error) {
            throw new Error(tradingResult.error);
        }
        
        // Check for both camelCase and snake_case property names
        const tradingCandles = tradingResult.tradingCandles || tradingResult.trading_candles;

        if (!tradingCandles || tradingCandles.length === 0) {
            console.error('No tradingCandles found. Trading result:', tradingResult);
            throw new Error('No candles in backtest results');
        }

        // Load chart with backtest candles
        await loadBacktestChart(symbol, tradingCandles, responseData);

        // Display results
        displayBacktestResults(responseData);

    } catch (error) {
        console.error('Error running backtest:', error);
        alert(`Error running backtest: ${error.message}`);
    } finally {
        backtestButton.disabled = false;
        backtestButton.textContent = 'Run Backtest';
    }
}

async function loadBacktestChart(symbol, candles, backtestResults) {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('chart').style.display = 'none';

        if (chart) {
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

        candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }, 0);

        // Prepare chart data with markers
        let previousNominals = 0;
        const chartData = candles.map((candle, index) => {
            const time = candle.date.split('T')[0];
            const currentNominals = candle.current_nominals || 0;
            
            const dataPoint = {
                time: time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            };

            // Add markers to the data point for buy/sell signals
            // Detect buy signal (transition from 0 to >0 nominals)
            if (previousNominals === 0 && currentNominals > 0) {
                // Include marker in the data point
                dataPoint.markers = [{
                    time: time,
                    position: 'belowBar',
                    color: '#26a69a',
                    shape: 'arrowUp',
                    text: 'BUY',
                    size: 2
                }];
            }
            // Detect sell signal (transition from >0 to 0 nominals)
            else if (previousNominals > 0 && currentNominals === 0) {
                // Include marker in the data point
                dataPoint.markers = [{
                    time: time,
                    position: 'aboveBar',
                    color: '#ef5350',
                    shape: 'arrowDown',
                    text: 'SELL',
                    size: 2
                }];
            }

            previousNominals = currentNominals;
            return dataPoint;
        });

        candlestickSeries.setData(chartData);

        // Add volume series
        const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
        }, 1);

        const volumeData = candles.map(candle => ({
            time: candle.date.split('T')[0],
            value: candle.volume,
            color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }));

        volumeSeries.setData(volumeData);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('chart').style.display = 'block';

        chart.timeScale().fitContent();
        document.getElementById('current-symbol').textContent = symbol;
        document.getElementById('chart-title').textContent = `${symbol} Backtest Results`;

        console.log(`Backtest chart loaded with ${candles.length} candles for ${symbol}`);

    } catch (error) {
        console.error('Error loading backtest chart:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = `Error: ${error.message}`;
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

    document.getElementById('run-backtest').addEventListener('click', runBacktest);
    
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
