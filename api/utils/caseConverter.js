import snakeCase from 'lodash.snakecase';

const snakeToCamel = (s) => {
  return s.replace(/(_\w)/g, (m) => m[1].toUpperCase());
};

const convertKeys = (obj, converter) => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newKey = converter(key);
                newObj[newKey] = convertKeys(obj[key], converter);
            }
        }
        return newObj;
    }
    return obj;
};

const toSnakeCase = (obj) => convertKeys(obj, snakeCase);
const toCamelCase = (obj) => convertKeys(obj, snakeToCamel);

export { toSnakeCase, toCamelCase };
