const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};
exports.isObject = isObject;

// any fields on the object that are empty objects get removed
exports.isEmptyObject = (obj) => {
  return isObject(obj) && Object.keys(obj).length === 0;
};

exports.toTwoDecimals = (n) => Math.round(n * 100) / 100;

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

exports.isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};
