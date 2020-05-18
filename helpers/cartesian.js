const _ = require('lodash');

/*
will turn this:

const variables = {
  animal: ["dog", "monkey", "bird"],
  number: [1, 2, 3, 4],
  thing: ["squash", "banana"]
};

into an exhaustive cartesian array of objects:
[
  {
    animal:"dog",
    number:1,
    thing:"squash"
  },
  {
    animal:"dog",
    number:1,
    thing:"banana"
  },
  ...(22 more)
]
*/

const getNext = (cartesianArgArrays, currentState) => {
  if (!currentState) {
    const result = [];
    for (const a of cartesianArgArrays) {
      result.push(a[0]);
    }
    return result;
  }
  const nextState = [...currentState];
  for (const idx in nextState) {
    const thisField = nextState[idx];
    const cArg = cartesianArgArrays[idx];
    const isLast = cArg.indexOf(thisField) === cArg.length - 1;
    if (!isLast) {
      nextState[idx] = cArg[cArg.indexOf(thisField) + 1];
    }
  }
};

const cartesianProductOf = (
  a,
  maxOptionalVariables,
  mandatoryVariableCount
) => {
  // a = array of array
  var i,
    j,
    l,
    m,
    a1,
    o = [];
  if (!a || a.length == 0) return a;

  a1 = a.splice(0, 1)[0]; // the first array of a
  a = cartesianProductOf(a, maxOptionalVariables, mandatoryVariableCount);
  for (i = 0, l = a1.length; i < l; i++) {
    if (a && a.length) {
      for (j = 0, m = a.length; j < m; j++) {
        const newItem = [a1[i]].concat(a[j]);
        const nonNullLength = newItem.filter((i) => i !== null).length;
        if (nonNullLength <= maxOptionalVariables + mandatoryVariableCount) {
          o.push(newItem);
        }
      }
    } else {
      o.push([a1[i]]);
    }
  }
  return o;
};

// an optional variable has a "null" as a possibility, meaning it's non-essential
// if maxOptionalIndicators = 4, it means that you might have RSI, MACD, KST & ACL + the mandatory ones (like, perhaps, stopLoss), but no others
exports.getAllPossibleCombinations = (variables, maxOptionalVariables = 4) => {
  const cartesianArgArrays = [];
  const varNames = Object.keys(variables);
  let mandatoryVariableCount = 0;

  for (const varName of varNames) {
    if (!variables[varName].includes(null)) {
      mandatoryVariableCount++;
    }
    cartesianArgArrays.push(variables[varName]);
  }

  const cartesianResults = cartesianProductOf(
    cartesianArgArrays,
    maxOptionalVariables,
    mandatoryVariableCount
  );

  const hydratedResult = [];
  for (const cartesianResult of cartesianResults) {
    const o = {};
    for (const idx in cartesianResult) {
      if (cartesianResult[idx] !== null) {
        o[varNames[idx]] = cartesianResult[idx];
      }
    }
    hydratedResult.push(o);
  }
  return hydratedResult;
};
