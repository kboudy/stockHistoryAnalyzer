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

exports.chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

exports.isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};

exports.percentile = (arr, p) => {
  if (arr.length === 0) return 0;
  if (typeof p !== 'number') throw new TypeError('p must be a number');
  if (p <= 0) return arr[0];
  if (p >= 1) return arr[arr.length - 1];

  var index = (arr.length - 1) * p,
    lower = Math.floor(index),
    upper = lower + 1,
    weight = index % 1;

  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
};
