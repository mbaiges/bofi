# Project Plan

This document outlines the remaining tasks to complete the project.

## Candles API

- [x] Get candles from the data provider.
- [x] Calculate ADX, +DI, and -DI indicators.
- [ ] Implement a `Strategy` base class to define conditions for buy/sell signals.
- [ ] Research and add other common technical indicators and trading strategies.
- [ ] Fully implement specific strategies as classes (e.g., DMI Strategy, Moving Average Crossover Strategy).
- [ ] Implement a backtesting module to verify the effectiveness of strategies over historical data.

## WhatsApp Bot

- [ ] Implement the basic functionality to receive and reply to messages.

## Integration

- [ ] Create a subscription system for users to receive notifications from the Candles API.
- [ ] Implement a notification system where the Candles API triggers the bot to send alerts to subscribed users.
