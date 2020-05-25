const isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};
exports.isNullOrUndefined = isNullOrUndefined;

const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};
exports.isObject = isObject;

const isNullOrEmptyString = (str) => {
  return str === null || str === '';
};
exports.isNullOrEmptyString = isNullOrEmptyString;

// any fields on the object that are empty objects get removed
exports.isEmptyObject = (obj) => {
  return isObject(obj) && Object.keys(obj).length === 0;
};

exports.getMongoFilter = (filterModel) => {
  const { type, filter } = filterModel;

  if (isNullOrEmptyString(filter) || isNullOrUndefined(filter)) {
    return { valid: false };
  }

  let cropped = `${filter}`;
  let operator = null;
  if (cropped.startsWith('>=')) {
    operator = '$gte';
    cropped = cropped.slice(2).trim();
  } else if (cropped.startsWith('<=')) {
    operator = '$lte';
    cropped = cropped.slice(2).trim();
  } else if (cropped.startsWith('>')) {
    operator = '$gt';
    cropped = cropped.slice(1).trim();
  } else if (cropped.startsWith('<')) {
    operator = '$lt';
    cropped = cropped.slice(1).trim();
  } else if (cropped.startsWith('!')) {
    cropped = cropped.slice(1).trim();
    if (cropped.includes(',')) {
      operator = '$nin';
    } else {
      operator = '$ne';
    }
  } else if (cropped.includes(',')) {
    operator = '$in';
  }
  if (operator === null) {
    return {
      valid: true,
      mongo: cropped,
    };
  }
  if (cropped === '') {
    return { valid: false };
  }

  let parsedValue;
  if (cropped === 'true' || cropped === 'false') {
    parsedValue = Boolean(cropped);
  } else if (cropped.includes(',')) {
    parsedValue = cropped.split(',').map((s) => (isNaN(s) ? s : parseFloat(s)));
  } else {
    parsedValue = isNaN(cropped) ? cropped : parseFloat(cropped);
  }
  return {
    valid: true,
    mongo: {
      [operator]: parsedValue,
    },
  };
};
