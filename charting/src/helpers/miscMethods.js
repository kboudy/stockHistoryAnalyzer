exports.isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};

exports.isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};
