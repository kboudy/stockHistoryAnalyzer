exports.toTwoDecimals = (n) => Math.round(n * 100) / 100;

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
