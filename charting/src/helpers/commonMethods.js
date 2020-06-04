import CheckboxCellRenderer from '../components/cellRenderers/checkboxCellRenderer';
import nodeServer from './nodeServer';

export const isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};

export const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

export const isNullOrEmptyString = (str) => {
  return str === null || str === '';
};

// any fields on the object that are empty objects get removed
export const isEmptyObject = (obj) => {
  return isObject(obj) && Object.keys(obj).length === 0;
};

export const toTwoDecimals = (n) =>
  isNullOrUndefined(n) ? '' : Math.round(n * 100) / 100;

export const getMongoFilter = (filterString) => {
  const parseValue = (v) => {
    if (v === 'true') {
      return true;
    } else if (v === 'false') {
      return false;
    } else if (v.includes(',')) {
      return v.split(',').map((s) => (isNaN(s) ? s : parseFloat(s)));
    } else {
      return isNaN(v) ? v : parseFloat(v);
    }
  };

  if (isNullOrEmptyString(filterString) || isNullOrUndefined(filterString)) {
    return { valid: false };
  }

  let cropped = `${filterString}`;
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
      mongo: parseValue(cropped),
    };
  }
  if (cropped === '') {
    return { valid: false };
  }

  return {
    valid: true,
    mongo: {
      [operator]: parseValue(cropped),
    },
  };
};

export const getSimulationColDefs = async () => {
  return [
    {
      headerName: 'Criteria (past)',
      marryChildren: true,
      children: [
        {
          headerName: 'symbol',
          field: 'criteria.symbol',
          flatField: 'symbol',
          headerClass: 'criteria-grid-header',
          choices: await getAvailablePatternStatsJobRunSymbols(),
        },
        {
          headerName: '# of bars',
          field: 'criteria.numberOfBars',
          flatField: 'numberOfBars',
          headerClass: 'criteria-grid-header',
          choices: await getAvailableNumberOfBars(),
        },
        {
          headerName: 'significant bar',
          field: 'criteria.significantBar',
          flatField: 'significantBar',
          headerClass: 'criteria-grid-header',
          choices: await getSignificantBars(),
          width: 140,
        },
        {
          headerName: 'other symbols',
          field: 'criteria.includeOtherSymbolsTargets',
          flatField: 'includeOtherSymbolsTargets',
          headerClass: 'criteria-grid-header',
          editable: false,
          cellRendererFramework: CheckboxCellRenderer,
          choices: [],
        },
      ],
    },

    {
      headerName: 'Config (past)',
      headerClass: 'criteria-config-grid-header-group',
      marryChildren: true,
      children: [
        {
          headerName: 'max avg score',
          field: 'criteria.config.max_avgScore',
          flatField: 'max_avgScore',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 6, 7, 8, 9, 10, 11, 12],
          width: 140,
        },
        {
          headerName: 'min score count',
          field: 'criteria.config.min_scoreCount',
          flatField: 'min_scoreCount',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 1, 2, 5, 10, 15, 20],
          width: 140,
        },
        {
          headerName: 'min % p at bar',
          field: 'criteria.config.min_percentProfitable_atBarX',
          flatField: 'min_percentProfitable_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          width: 140,
        },
        {
          headerName: 'min % p by 1% by bar',
          field: 'criteria.config.min_percentProfitable_by_1_percent_atBarX',
          flatField: 'min_percentProfitable_by_1_percent_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          width: 165,
        },
        {
          headerName: 'min % p by 2% by bar',
          field: 'criteria.config.min_percentProfitable_by_2_percent_atBarX',
          flatField: 'min_percentProfitable_by_2_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min % p by 5% by bar',
          field: 'criteria.config.min_percentProfitable_by_5_percent_atBarX',
          flatField: 'min_percentProfitable_by_5_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min % p by 10% by bar',
          field: 'criteria.config.min_percentProfitable_by_10_percent_atBarX',
          flatField: 'min_percentProfitable_by_10_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min up/down by bar',
          field: 'criteria.config.min_upsideDownsideRatio_byBarX',
          flatField: 'min_upsideDownsideRatio_byBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 0.25, 0.5, 1, 1.5, 2, 2.5],
          valueFormatter: numberFormatter,
          width: 160,
        },
        {
          headerName: 'min avg max-up-% by bar',
          field: 'criteria.config.min_avg_maxUpsidePercent_byBarX',
          flatField: 'min_avg_maxUpsidePercent_byBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 1, 2, 5],
          valueFormatter: numberFormatter,
          width: 190,
        },
        {
          headerName: 'min avg p by bar',
          field: 'criteria.config.min_avg_profitLossPercent_atBarX',
          flatField: 'min_avg_profitLossPercent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 1, 2, 5],
          valueFormatter: numberFormatter,
          width: 190,
        },
      ],
    },

    {
      headerName: 'Results (future)',
      headerClass: 'results-grid-header-group',
      marryChildren: true,
      children: [
        {
          headerName: 'avg pl %',
          field: 'results.avgProfitLossPercent',
          valueFormatter: numberFormatter,
          headerClass: 'results-grid-header',
        },
        {
          headerName: '% profitable',
          field: 'results.percentProfitable',
          valueFormatter: numberFormatter,
          headerClass: 'results-grid-header',
        },
        {
          headerName: 'trade count',
          field: 'results.tradeCount',
          headerClass: 'results-grid-header',
        },
        {
          headerName: 'days evaluated',
          field: 'results.daysEvaluatedCount',
          headerClass: 'results-grid-header',
          width: 140,
        },
        {
          headerName: 'trade count/yr',
          field: 'results.tradeCountPerYear',
          headerClass: 'results-grid-header',
          width: 140,
        },
      ],
    },
  ];
};

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

export const numberFormatter = (params) => {
  if (isNaN(params.value)) {
    return '';
  }
  return Math.round(params.value * 10) / 10;
};

export const currencyFormatter = (params) => {
  if (isNaN(params.value)) {
    return '';
  }
  return parseFloat(`${params.value}`).toFixed(2);
};
