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

exports.getMongoFilter = (stringFilterModel) => {
  let fieldValue = stringFilterModel.filter;
  if (fieldValue !== 0 && !fieldValue) {
    return { valid: null };
  }

  const strFieldValue = `${fieldValue}`;

  if (strFieldValue.startsWith('!')) {
    const cropped = strFieldValue.slice(1).trim();
    if (cropped.includes(',')) {
      return {
        valid: true,
        mongo: {
          $nin: cropped
            .split(',')
            .map((c) => (isNaN(c.trim()) ? c.trim() : parseFloat(c.trim()))),
        },
      };
    } else {
      return {
        valid: true,
        mongo: {
          $ne: isNaN(cropped) ? cropped : parseFloat(cropped),
        },
      };
    }
  }

  if (strFieldValue.includes(',')) {
    return {
      valid: true,
      mongo: {
        $in: strFieldValue
          .split(',')
          .map((c) => (isNaN(c.trim()) ? c.trim() : parseFloat(c.trim()))),
      },
    };
  }

  if (strFieldValue.startsWith('>=')) {
    const cropped = strFieldValue.slice(2).trim();
    return {
      valid: true,
      mongo: {
        $gte: isNaN(cropped) ? cropped : parseFloat(cropped),
      },
    };
  }

  if (strFieldValue.startsWith('<=')) {
    const cropped = strFieldValue.slice(2).trim();
    return {
      valid: true,
      mongo: {
        $lte: isNaN(cropped) ? cropped : parseFloat(cropped),
      },
    };
  }

  if (strFieldValue.startsWith('>')) {
    const cropped = strFieldValue.slice(1).trim();
    return {
      valid: true,
      mongo: {
        $gt: isNaN(cropped) ? cropped : parseFloat(cropped),
      },
    };
  }

  if (strFieldValue.startsWith('<')) {
    const cropped = strFieldValue.slice(1).trim();
    return {
      valid: true,
      mongo: {
        $lt: isNaN(cropped) ? cropped : parseFloat(cropped),
      },
    };
  }

  if (strFieldValue.startsWith('=')) {
    const cropped = strFieldValue.slice(1).trim();
    return {
      valid: true,
      mongo: isNaN(cropped) ? cropped : parseFloat(cropped),
    };
  }

  if (strFieldValue.toLowerCase() === 'true') {
    return {
      valid: true,
      mongo: true,
    };
  }

  if (strFieldValue.toLowerCase() === 'false') {
    return {
      valid: true,
      mongo: false,
    };
  }

  return {
    valid: true,
    mongo: isNaN(fieldValue) ? fieldValue : parseFloat(fieldValue),
  };
};
