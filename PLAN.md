# Project Plan

This document outlines the remaining tasks to complete the project.

## Candles API

- [x] Get candles from the data provider.
- [x] Calculate ADX, +DI, and -DI indicators.
- [x] Implement a `Strategy` base class to define conditions for buy/sell signals. (DMI)
- [x] Implement a backtesting module to verify the effectiveness of strategies over historical data.

## WhatsApp Bot

- [x] Implement the basic functionality to receive and reply to messages.

## Integration

- [ ] Create a subscription system for users to receive notifications from the Candles API.
- [ ] Implement a notification system where the Candles API triggers the bot to send alerts to subscribed users.

## Backlog
- [x] Implement a stacked strategy with lag config (number of periods). Should have description of which are used. 
- [x] Implement rules to stacked strategy to decide when to add point from each strategy.
- [ ] Research and add other common technical indicators and trading strategies.
- [ ] Fully implement specific strategies as classes
  - [x]  Moving Average Crossover Strategy - Trending Market (adx > 25)
  - [x]  Bollinger bands - Bouncing Market (adx < 25)
  - [x]  RSI - Bouncing Market (adx < 25)
  - [ ]  Supports and resistance
- [ ] Visualize market characteristics (trending/bouncing/Bullish/bearish)
- [x] Set stop limit loss
- [ ] Set stop limit take profit 
- [ ] Set trailing stop limit
- [ ] Be able to automatically notify when the preiod could be longer (upgrade to month?)

