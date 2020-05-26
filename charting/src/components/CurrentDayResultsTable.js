import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import nodeServer from '../helpers/nodeServer';

import _ from 'lodash';
import {
  getSignificantBars,
  getMongoFilter,
  isObject,
} from '../helpers/commonMethods';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import './styles/currentDayGridStyles.css';
import StringParseFloatingFilter from './agGridFilters/StringParseFloatingFilter';

const currentDayTable_columnFiltersKey = 'current_day_table.column_filters';
const useStyles = makeStyles((theme) => ({}));

const CurrentDayResultsTable = (props) => {
  const classes = useStyles();
  const [columnDefs, setColumnDefs] = useState([]);
  const [gridApi, setGridApi] = useState(null);

  const [gridData, setGridData] = useState([]);

  const showThisRow = (row) => {
    if (!row || parseInt(row.scoreCount) < 10) {
      return false;
    }
    const avg_profitLossPercent_atBarX = row['avg_profitLossPercent_atBarX'];
    for (const significantBar in avg_profitLossPercent_atBarX) {
      const avgPL = parseFloat(avg_profitLossPercent_atBarX[significantBar]);
      const sb = parseFloat(significantBar);
      if (avgPL > sb * 1) {
        return true;
      }
    }
    return false;
  };

  const doesFilterPass = (node) => {
    debugger;
    if (!gridApi) {
      return true;
    }
    const filterModel = gridApi.getFilterModel();
    const mongoFilters = {};
    for (const fieldName in filterModel) {
      const mongoFilter = getMongoFilter(filterModel[fieldName].filter);
      if (mongoFilter.valid) {
        mongoFilters[fieldName] = mongoFilter.mongo;
      }
    }
    for (const mfKey in mongoFilters) {
      if (isObject(mongoFilters[mfKey])) {
        const operator = Object.keys(mongoFilters[mfKey])[0];
        const value = mongoFilters[mfKey][operator];
        switch (operator) {
          case '$ne':
            if (node.data[mfKey] === value) {
              return false;
            }
          default:
        }
      } else {
        // no mongo operator, so it's an exact equality check
        if (node.data[mfKey] !== mongoFilters[mfKey]) {
          return false;
        }
      }
    }
    return true;
  };

  useEffect(() => {
    (async () => {
      const { results } = (
        await nodeServer.get('getMostRecentCurrentDayResults')
      ).data;
      const rows = [];
      for (const symbol in results) {
        for (const numberOfBars in results[symbol]) {
          const instanceData = results[symbol][numberOfBars];

          if (showThisRow(instanceData)) {
            rows.push({ symbol, numberOfBars, ...instanceData });
          }
        }
      }
      setGridData(rows);
    })();
  }, []);

  const handleFilterChanged = async (e) => {
    const fm = e.api.getFilterModel();
    if (fm) {
      localStorage.setItem(
        currentDayTable_columnFiltersKey,
        JSON.stringify(fm)
      );
    }
  };

  const handleGridReady = (e) => {
    console.log('handleGridReady');
    setGridApi(e.api);
    setTimeout(() => {
      /*     const strStoredFilterModel = localStorage.getItem(
        currentDayTable_columnFiltersKey
      );
      if (strStoredFilterModel) {
        const storedFilterModel = JSON.parse(strStoredFilterModel);
        e.api.setFilterModel(storedFilterModel);
        e.api.onFilterChanged();
      } */
    }, 500);
  };

  useEffect(() => {
    (async () => {
      const colDefs = [
        {
          headerName: 'Primary criteria',
          headerClass: 'primary-header-group',
          marryChildren: true,
          children: [
            {
              headerName: 'symbol',
              field: 'symbol',
              headerClass: 'primary-header',
            },
            {
              headerName: 'numberOfBars',
              field: 'numberOfBars',
              headerClass: 'primary-header',
            },
            {
              headerName: 'sourceDate',
              field: 'sourceDate',
              headerClass: 'primary-header',
            },
            {
              headerName: 'scoreCount',
              field: 'scoreCount',
              headerClass: 'primary-header',
            },
            {
              headerName: 'avgScore',
              field: 'avgScore',
              headerClass: 'primary-header',
            },
          ],
        },
      ];

      let rotatingCssIndex = 1;
      for (const sb of await getSignificantBars()) {
        colDefs.push({
          headerName: `bar ${sb}`,
          headerClass: `header-${rotatingCssIndex}-group`,
          marryChildren: true,
          children: [
            // {
            //   headerName: `stdDev_maxUpsidePercent_byBarX.${sb}`,
            //   field: `stdDev_maxUpsidePercent_byBarX.${sb}`,
            //   headerTooltip: `stdDev_maxUpsidePercent_byBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `avg_maxDownsidePercent_byBarX.${sb}`,
            //   field: `avg_maxDownsidePercent_byBarX.${sb}`,
            //   headerTooltip: `avg_maxDownsidePercent_byBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `stdDev_maxDownsidePercent_byBarX.${sb}`,
            //   field: `stdDev_maxDownsidePercent_byBarX.${sb}`,
            //   headerTooltip: `stdDev_maxDownsidePercent_byBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            {
              headerName: `avg_profitLossPercent_atBarX.${sb}`,
              field: `avg_profitLossPercent_atBarX.${sb}`,
              headerTooltip: `avg_profitLossPercent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            // {
            //   headerName: `upsideDownsideRatio_byBarX.${sb}`,
            //   field: `upsideDownsideRatio_byBarX.${sb}`,
            //   headerTooltip: `upsideDownsideRatio_byBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            {
              headerName: `percentProfitable_atBarX.${sb}`,
              field: `percentProfitable_atBarX.${sb}`,
              headerTooltip: `percentProfitable_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            // {
            //   headerName: `avg_maxUpsidePercent_byBarX.${sb}`,
            //   field: `avg_maxUpsidePercent_byBarX.${sb}`,
            //   headerTooltip: `avg_maxUpsidePercent_byBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `percentProfitable_by_1_percent_atBarX.${sb}`,
            //   field: `percentProfitable_by_1_percent_atBarX.${sb}`,
            //   headerTooltip: `percentProfitable_by_1_percent_atBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `percentProfitable_by_2_percent_atBarX.${sb}`,
            //   field: `percentProfitable_by_2_percent_atBarX.${sb}`,
            //   headerTooltip: `percentProfitable_by_2_percent_atBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `percentProfitable_by_5_percent_atBarX.${sb}`,
            //   field: `percentProfitable_by_5_percent_atBarX.${sb}`,
            //   headerTooltip: `percentProfitable_by_5_percent_atBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `percentProfitable_by_10_percent_atBarX.${sb}`,
            //   field: `percentProfitable_by_10_percent_atBarX.${sb}`,
            //   headerTooltip: `percentProfitable_by_10_percent_atBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
            // {
            //   headerName: `stdDev_profitLossPercent_atBarX.${sb}`,
            //   field: `stdDev_profitLossPercent_atBarX.${sb}`,
            //   headerTooltip: `stdDev_profitLossPercent_atBarX.${sb}`,
            //   headerClass: `header-${rotatingCssIndex}`,
            // },
          ],
        });
        rotatingCssIndex++;
        if (rotatingCssIndex > 5) {
          rotatingCssIndex = 1;
        }
      }

      setColumnDefs(colDefs);
    })();
  }, []);

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: props.height }}>
        <AgGridReact
          defaultColDef={{
            floatingFilter: true,
            floatingFilterComponent: 'stringParseFloatingFilter',
            filter: 'agTextColumnFilter',
            floatingFilterComponentParams: { suppressFilterButton: true },
            sortable: true,
            resizable: true,
            width: 120,
            enableValue: true,
            filterParams: {
              textCustomComparator: (filter, value, filterText) => {
                const mongoFilter = getMongoFilter(filterText);
                if (!mongoFilter.valid) {
                  return false;
                }

                const typedValue = isNaN(value) ? value : parseFloat(value);
                if (isObject(mongoFilter.mongo)) {
                  const operator = Object.keys(mongoFilter.mongo)[0];
                  const mongoValue = mongoFilter.mongo[operator];
                  const typedMongoValue = isNaN(mongoValue)
                    ? mongoValue
                    : parseFloat(mongoValue);
                  switch (operator) {
                    case '$ne':
                      if (typedValue === typedMongoValue) {
                        return false;
                      }
                      break;
                    case '$gte':
                      if (typedValue < typedMongoValue) {
                        return false;
                      }
                      break;
                    case '$lte':
                      if (typedValue > typedMongoValue) {
                        return false;
                      }
                      break;
                    case '$gt':
                      if (typedValue <= typedMongoValue) {
                        return false;
                      }
                      break;
                    case '$lt':
                      if (typedValue >= typedMongoValue) {
                        return false;
                      }
                      break;
                    case '$nin':
                      return false;
                      break;
                    case '$in':
                      return false;
                      break;
                    default:
                  }
                } else {
                  // no mongo operator, so it's an exact equality check
                  const typedMongoValue = isNaN(mongoFilter.mongo)
                    ? mongoFilter.mongo
                    : parseFloat(mongoFilter.mongo);
                  if (typedMongoValue !== typedValue) {
                    return false;
                  }
                }
                return true;
              },
            },
          }}
          frameworkComponents={{
            stringParseFloatingFilter: StringParseFloatingFilter,
          }}
          columnDefs={columnDefs}
          toolPanel="columns"
          gridOptions={{ tooltipShowDelay: 0 }}
          rowData={gridData}
          onFilterChanged={handleFilterChanged}
          onGridReady={handleGridReady}
          sortingOrder={['asc', 'desc']}
          rowSelection="single"
        ></AgGridReact>
      </div>
    </div>
  );
};

export default CurrentDayResultsTable;
