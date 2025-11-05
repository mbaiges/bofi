import { toCamelCase } from '../utils/caseConverter.js';

const camelCaseRequest = (req, res, next) => {
  if (req.body) {
    req.body = toCamelCase(req.body);
  }
  next();
};

export { camelCaseRequest };

