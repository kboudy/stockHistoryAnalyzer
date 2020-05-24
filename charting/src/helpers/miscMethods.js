exports.isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};

const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};
exports.isObject = isObject;

exports.isNullOrEmptyString = (str) => {
  return str === null || str === '';
};

// any fields on the object that are empty objects get removed
exports.isEmptyObject = (obj) => {
  return isObject(obj) && Object.keys(obj).length === 0;
};
