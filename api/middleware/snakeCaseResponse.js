import { toSnakeCase } from '../utils/caseConverter.js';

const snakeCaseResponse = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    const snakeCaseBody = toSnakeCase(body);
    originalJson.call(this, snakeCaseBody);
  };
  next();
};

export { snakeCaseResponse };

