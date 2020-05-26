import CheckboxCellRenderer from '../components/cellRenderers/checkboxCellRenderer';
import nodeServer from './nodeServer';
import { isObject } from './commonMethods';

let cachedSymbols = null;
export const getAvailableSymbols = async () => {
  if (!cachedSymbols) {
    cachedSymbols = (await nodeServer.get('availableSymbols')).data;
  }
  return cachedSymbols;
};

let cachedAvailablePatternStatsJobSymbols = null;
export const getAvailablePatternStatsJobRunSymbols = async () => {
  if (!cachedAvailablePatternStatsJobSymbols) {
    cachedAvailablePatternStatsJobSymbols = (
      await nodeServer.get('patternStatsJobRunSymbols')
    ).data;
  }
  return cachedAvailablePatternStatsJobSymbols;
};

let cachedAvailableBars = null;
export const getAvailableNumberOfBars = async () => {
  if (!cachedAvailableBars) {
    cachedAvailableBars = (await nodeServer.get('availableNumberOfBars')).data;
  }
  return cachedAvailableBars;
};

let cachedSignificantBars = null;
export const getSignificantBars = async () => {
  if (!cachedSignificantBars) {
    cachedSignificantBars = (await nodeServer.get('significantBars')).data;
  }
  return cachedSignificantBars;
};

const numberFormatter = (params) => {
  if (isObject(params.value)) {
    const firstKey = Object.keys(params.value)[0];
    return params.value[firstKey];
  } else {
    return params.value;
  }
};
