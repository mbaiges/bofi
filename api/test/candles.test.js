const request = require('supertest');
const app = require('../server.js'); // Your Express app

describe('Candles API', () => {
    // Test for fetching default number of candles
    it('should return 100 candles by default for GOOGL (1D)', async () => {
        const res = await request(app)
            .get('/api/candles')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(100);
        expect(res.body[0]).toHaveProperty('timestamp');
        expect(res.body[0]).toHaveProperty('date');
        expect(res.body[0]).toHaveProperty('open');
        expect(res.body[0]).toHaveProperty('high');
        expect(res.body[0]).toHaveProperty('low');
        expect(res.body[0]).toHaveProperty('close');
        expect(res.body[0]).toHaveProperty('volume');
    });

    // Test for fetching a specific amount of candles
    it('should return 50 candles for AAPL (1H)', async () => {
        const res = await request(app)
            .get('/api/candles?symbol=AAPL&timeframe=1H&amount=50')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(50);
    });

    // Test for fetching candles within a date range
    it('should return candles within a specified date range for MSFT (1D)', async () => {
        const fromDate = new Date('2022-01-01T00:00:00Z').getTime() / 1000;
        const toDate = new Date('2022-01-31T23:59:59Z').getTime() / 1000;

        const res = await request(app)
            .get(`/api/candles?symbol=MSFT&timeframe=1D&from=${fromDate}&to=${toDate}`)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(res.body).toBeInstanceOf(Array);
        // For daily candles over a month, expect around 30-31 candles
        expect(res.body.length).toBeGreaterThanOrEqual(20);
        expect(res.body.length).toBeLessThanOrEqual(31);

        res.body.forEach(candle => {
            expect(candle.timestamp).toBeGreaterThanOrEqual(fromDate);
            expect(candle.timestamp).toBeLessThanOrEqual(toDate);
        });
    });

    // Test for invalid symbol
    it('should return an error for an invalid symbol', async () => {
        const res = await request(app)
            .get('/api/candles?symbol=INVALID_SYMBOL&timeframe=1D')
            .expect(500);

        expect(res.body).toHaveProperty('error');
    });

    // Test for no data in range
    it('should return an empty array for a date range with no data', async () => {
        const futureDate = new Date('2050-01-01T00:00:00Z').getTime() / 1000;
        const evenFurtherFutureDate = new Date('2050-01-02T00:00:00Z').getTime() / 1000;
        const res = await request(app)
            .get(`/api/candles?symbol=GOOGL&timeframe=1D&from=${futureDate}&to=${evenFurtherFutureDate}`)
            .expect(200);

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body).toHaveLength(0);
    });
});
