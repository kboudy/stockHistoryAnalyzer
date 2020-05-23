exports.isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

exports.toTwoDecimals = (n) => Math.round(n * 100) / 100;

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

exports.isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};
