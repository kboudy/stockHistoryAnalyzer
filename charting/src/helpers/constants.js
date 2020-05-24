import CheckboxCellRenderer from '../components/cellRenderers/checkboxCellRenderer';
import nodeServer from './nodeServer';
import { isObject } from './miscMethods';

export const nodeServerPort = 3059;

let cachedSymbols = null;
export const getAvailableSymbols = async () => {
  if (!cachedSymbols) {
    cachedSymbols = (await nodeServer.get('availableSymbols')).data;
  }
  return cachedSymbols;
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

const filterTest = {};

export const getSimulationColDefs = async () => {
  return [
    {
      headerName: 'Criteria (past)',
      marryChildren: true,
      children: [
        {
          headerName: 'symbol',
          filter: 'agTextColumnFilter',
          field: 'criteria.symbol',
          flatField: 'symbol',
          headerClass: 'criteria-grid-header',
          choices: await getAvailableSymbols(),
        },
        {
          headerName: '# of bars',
          filter: 'agNumberColumnFilter',
          field: 'criteria.numberOfBars',
          flatField: 'numberOfBars',
          headerClass: 'criteria-grid-header',
          choices: await getAvailableNumberOfBars(),
        },
        {
          headerName: 'significant bar',
          filter: 'agNumberColumnFilter',
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
          filter: 'partialMatchFilter',
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
          filter: 'agNumberColumnFilter',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
          width: 140,
        },
        {
          headerName: 'min score count',
          field: 'criteria.config.min_scoreCount',
          flatField: 'min_scoreCount',
          filter: 'agNumberColumnFilter',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 1, 2, 5, 10, 15, 20],
          width: 140,
        },
        {
          headerName: 'min % p at bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_atBarX',
          flatField: 'min_percentProfitable_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          width: 140,
        },
        {
          headerName: 'min % p by 1% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_1_percent_atBarX',
          flatField: 'min_percentProfitable_by_1_percent_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          width: 165,
        },
        {
          headerName: 'min % p by 2% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_2_percent_atBarX',
          flatField: 'min_percentProfitable_by_2_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min % p by 5% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_5_percent_atBarX',
          flatField: 'min_percentProfitable_by_5_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min % p by 10% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_10_percent_atBarX',
          flatField: 'min_percentProfitable_by_10_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min up/down by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_upsideDownsideRatio_byBarX',
          flatField: 'min_upsideDownsideRatio_byBarX',
          headerClass: 'criteria-config-grid-header',
          choices: [null, 0.25, 0.5, 1, 1.5, 2, 2.5],
          valueFormatter: numberFormatter,
          width: 160,
        },
        {
          headerName: 'min avg max-up-% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_avg_maxUpsidePercent_byBarX',
          flatField: 'min_avg_maxUpsidePercent_byBarX',
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
          filter: 'agNumberColumnFilter',
          valueFormatter: numberFormatter,
          headerClass: 'results-grid-header',
        },
        {
          headerName: '% profitable',
          filter: 'agNumberColumnFilter',
          field: 'results.percentProfitable',
          valueFormatter: numberFormatter,
          headerClass: 'results-grid-header',
        },
        {
          headerName: 'trade count',
          filter: 'agNumberColumnFilter',
          field: 'results.tradeCount',
          headerClass: 'results-grid-header',
        },
        {
          headerName: 'days evaluated',
          filter: 'agNumberColumnFilter',
          field: 'results.daysEvaluatedCount',
          headerClass: 'results-grid-header',
          width: 140,
        },
        {
          headerName: 'trade count/yr',
          filter: 'agNumberColumnFilter',
          field: 'results.tradeCountPerYear',
          headerClass: 'results-grid-header',
          width: 140,
        },
      ],
    },
  ];
};
