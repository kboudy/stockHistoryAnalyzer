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

const increment = (state, arrayOfArrays, colIdx = 0) => {
  if (state[colIdx] + 1 < arrayOfArrays[colIdx].length) {
    state[colIdx]++;
    return state;
  }
  state[colIdx] = 0;
  colIdx++;
  if (colIdx === state.length) {
    return null;
  }
  return increment(state, arrayOfArrays, colIdx);
};

exports.getAllPossibleCombinations = (objWithArrays) => {
  const keys = Object.keys(objWithArrays);

  // if a field isn't an array, we'll make it an array of 1
  let arrayOfArrays = keys.map((k) =>
    Array.isArray(objWithArrays[k]) ? objWithArrays[k] : [objWithArrays[k]]
  );

  let state = keys.map((k) => 0);

  const result = [];
  do {
    const r = keys.reduce((reduced, currentField, currentIndex) => {
      const val = arrayOfArrays[currentIndex][state[currentIndex]];
      if (val !== null) {
        reduced[currentField] = val;
      }
      return reduced;
    }, {});
    result.push(r);
    state = increment(state, arrayOfArrays);
  } while (state);
  return result;
};
