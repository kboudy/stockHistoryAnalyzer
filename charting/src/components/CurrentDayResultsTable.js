import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import nodeServer from '../helpers/nodeServer';
import ViewColumnIcon from '@material-ui/icons/ViewColumn';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';
import Grid from '@material-ui/core/Grid';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import _ from 'lodash';
import {
  getSignificantBars,
  getMongoFilter,
  isObject,
  isNullOrUndefined,
} from '../helpers/commonMethods';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import './styles/currentDayGridStyles.css';
import StringParseFloatingFilter from './agGridFilters/StringParseFloatingFilter';

const currentDayTable_visibleColumnsKey = 'current_day_table.visible_columns';
const currentDayTable_columnFiltersKey = 'current_day_table.column_filters';
const currentDayTable_usePrefilteringKey = 'current_day_table.use_prefilting';

const tempCountKeySuffix = '_tempCount';
const useStyles = makeStyles((theme) => ({
  button: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  chkUsePrefiltering: { marginLeft: theme.spacing(2) },
  columnChoiceList: {
    height: '1000px',
    overflow: 'auto',
    backgroundColor: theme.palette.background.paper,
    border: '1px solid #ddd',
  },
}));

const CurrentDayResultsTable = (props) => {
  const classes = useStyles();
  const [columnDefs, setColumnDefs] = useState([]);
  const [gridApi, setGridApi] = useState(null);
  const [columnApi, setColumnApi] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentSingleSymbol, setCurrentSingleSymbol] = useState(null);
  const [usePrefiltering, setUsePrefiltering] = useState(true);
  const [allSymbolsInGrid, setAllSymbolsInGrid] = useState([]);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [aggregateBySymbol, setAggregateBySymbol] = useState(false);

  const [gridData, setGridData] = useState([]);
  const [allRows, setAllRows] = useState([]);

  const [visibleColumns, setVisibleColumns] = useState(null);

  const getLatestCurrentDayJobData = async () => {
    const { results } = (
      await nodeServer.get('getMostRecentCurrentDayResults')
    ).data;
    return results;
  };

  useEffect(() => {
    (async () => {
      const results = await getLatestCurrentDayJobData();
      const rows = [];
      for (const symbol in results) {
        for (const numberOfBars in results[symbol]) {
          const rowData = results[symbol][numberOfBars];
          rows.push({ symbol, numberOfBars, ...rowData });
        }
      }
      setAllRows(rows);
      setGridData([...rows]);
      const allSymbols = _.orderBy(Object.keys(results), (r) => r);
      setAllSymbolsInGrid(allSymbols);
      setSelectedSymbols([]);

      let bfFromStorage = localStorage.getItem(
        currentDayTable_usePrefilteringKey
      );
      const prefiltering = !bfFromStorage || bfFromStorage === 'true';
      setUsePrefiltering(prefiltering);
    })();
  }, []);

  const clone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };

  const getAggregatedBySymbolData = () => {
    if (allRows.length === 0) {
      return [];
    }

    // set up a zero-d out template
    const aggregated = clone(allRows[0]);
    const fields = Object.keys(aggregated);
    for (const field of fields) {
      if (field === 'symbol') {
      } else if (field === 'numberOfBars') {
        aggregated[field] = -1;
      } else if (field === 'sourceDate') {
        aggregated[field] = '----';
      } else if (field === 'scoreDates') {
        aggregated[field] = [];
      } else if (field === 'scoreCount' || field === 'avgScore') {
        aggregated[field] = 0;
      } else if (field.endsWith('_byBarX') || field.endsWith('_atBarX')) {
        aggregated[field] = clone(aggregated[field]);
        const bars = Object.keys(aggregated[field]);
        for (const b of bars) {
          aggregated[field][b] = 0;
        }
      } else {
        debugger;
      }
    }

    // add everything up (if it needs to be avg'd, we'll do that next loop)
    const aggregatedBySymbol = {};
    for (const row of allRows) {
      const { symbol } = row;
      if (!aggregatedBySymbol[symbol]) {
        aggregatedBySymbol[symbol] = clone(aggregated);
        aggregatedBySymbol[symbol].symbol = symbol; // looks weird, but we're only temporarily grouping by symbol here
      }
      const abs = aggregatedBySymbol[symbol];
      const fields = Object.keys(row);
      for (const field of fields) {
        if (field === 'numberOfBars') {
          abs[field] = -1;
        } else if (field === 'scoreDates') {
          abs[field] = [...abs[field], ...row[field]];
        } else if (field === 'scoreCount' || field === 'avgScore') {
          abs[field] = abs[field] + row[field];
        } else if (field.endsWith('_byBarX') || field.endsWith('_atBarX')) {
          const bars = Object.keys(abs[field]);
          for (const b of bars) {
            if (!isNullOrUndefined(row[field][b])) {
              abs[field][b] = abs[field][b] + row[field][b];
              // keep a count, for averaging (because there are nulls in here, and we don't want them in the avg)
              const countFieldKey = `${field}${tempCountKeySuffix}`;
              if (!abs[countFieldKey]) {
                abs[countFieldKey] = {};
              }
              const currentCount = abs[countFieldKey][b]
                ? abs[countFieldKey][b] + 1
                : 1;
              abs[countFieldKey][b] = currentCount;
            }
          }
        }
      }
    }

    // finally, average it out
    const flattenedRows = [];
    const symbols = Object.keys(aggregatedBySymbol);
    for (const symbol of symbols) {
      const thisAgg = aggregatedBySymbol[symbol];
      const thisAggBefore = { ...thisAgg };

      const fields = [...Object.keys(thisAgg)];

      for (const field of fields) {
        if (field === 'symbol' || field.endsWith(tempCountKeySuffix)) {
          continue;
        }
        if (field === 'scoreDates') {
          thisAgg[field] = _.orderBy(thisAgg[field], (d) => d);
        } else if (field === 'avgScore') {
          if (thisAgg['scoreDates'].length > 0) {
            thisAgg[field] =
              Math.round(
                (parseFloat(thisAgg[field]) * 100) /
                  thisAgg['scoreDates'].length
              ) / 100;
          }
        } else if (field.endsWith('_byBarX') || field.endsWith('_atBarX')) {
          const countFieldKey = `${field}${tempCountKeySuffix}`;
          const bars = Object.keys(thisAgg[field]);
          for (const b of bars) {
            if (
              !isNullOrUndefined(thisAgg[field][b]) &&
              !isNullOrUndefined(thisAgg[countFieldKey]) &&
              !isNullOrUndefined(thisAgg[countFieldKey][b]) &&
              thisAgg[countFieldKey][b] > 0
            ) {
              const val =
                Math.round(
                  (parseFloat(thisAgg[field][b]) * 100) /
                    parseFloat(thisAgg[countFieldKey][b])
                ) / 100;
              //console.log(`${field}/${countFieldKey}: ${val}`);
              thisAgg[field][b] = val;
            }
          }
          //delete thisAgg[countFieldKey];
        }
      }
      flattenedRows.push(thisAgg);
    }

    return flattenedRows;
  };

  //------------------------------------------------
  // All filtering takes place here
  useEffect(() => {
    if (currentSingleSymbol) {
      setGridData(allRows.filter((r) => r.symbol === currentSingleSymbol));
    } else if (aggregateBySymbol) {
      setGridData(getAggregatedBySymbolData());
    } else if (usePrefiltering) {
      const rowsToKeep = [];
      for (const row of allRows) {
        if (!row || parseInt(row.scoreCount) < 10) {
          continue;
        }
        const avg_profitLossPercent_atBarX =
          row['avg_profitLossPercent_atBarX'];
        let keepThisRow = false;
        if (!selectedSymbols.length || selectedSymbols.includes(row.symbol)) {
          if (avg_profitLossPercent_atBarX) {
            const significantBars = Object.keys(avg_profitLossPercent_atBarX);
            for (const significantBar of significantBars) {
              const avgPL = parseFloat(
                avg_profitLossPercent_atBarX[significantBar]
              );
              const sb = parseFloat(significantBar);
              if (avgPL > sb * 0.5) {
                keepThisRow = true;
                break;
              }
            }
          }
        }

        if (keepThisRow) {
          rowsToKeep.push(row);
        }
      }
      setGridData(rowsToKeep);
    } else {
      setGridData([
        ...allRows.filter(
          (r) => !selectedSymbols.length || selectedSymbols.includes(r.symbol)
        ),
      ]);
    }
  }, [
    aggregateBySymbol,
    currentSingleSymbol,
    selectedSymbols,
    usePrefiltering,
  ]);
  //------------------------------------------------

  const handleFilterChanged = async (e) => {
    const fm = e.api.getFilterModel();
    if (fm) {
      localStorage.setItem(
        currentDayTable_columnFiltersKey,
        JSON.stringify(fm)
      );
    }
  };

  const handleColumnVisibleToggle = (groupKey, colName) => {
    const vc = { ...visibleColumns };
    if (!vc[groupKey]) {
      vc[groupKey] = [];
    }
    if (vc[groupKey].includes(colName)) {
      vc[groupKey] = vc[groupKey].filter((g) => g !== colName);
    } else {
      vc[groupKey] = [...vc[groupKey], colName];
    }

    const vcFromStorageString = JSON.stringify(vc);
    console.log(vcFromStorageString);
    localStorage.setItem(
      currentDayTable_visibleColumnsKey,
      vcFromStorageString
    );
    setVisibleColumns(vc);
    const hiddenWhereNecessary = addHideWhereNecessary(columnDefs, vc);
    setColumnDefs(hiddenWhereNecessary);
  };

  const getColumnChoices = () => {
    if (!columnDefs || columnDefs.length === 0) {
      return [];
    }

    const groupedFields = [
      {
        group: 'Bar Groups',
        headerNames: columnDefs
          .map((c) => c.headerName)
          .filter((c) => c.toLowerCase().startsWith('bar')),
      },
      {
        group: 'Bar Fields',
        headerNames: columnDefs[1].children.map(
          (c) => c.headerName.split('.')[0]
        ),
      },
    ];

    return (
      <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
        <List disablePadding className={classes.columnChoiceList}>
          {groupedFields.map((gf) => {
            return (
              <div key={gf.group}>
                <ListItem role={undefined} dense button>
                  <ListItemText id={gf.group} primary={gf.group} />
                </ListItem>
                <List component="div" disablePadding>
                  {gf.headerNames.map((hn) => (
                    <ListItem key={hn} button className={classes.nested}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={
                            !visibleColumns ||
                            !visibleColumns[gf.group] ||
                            visibleColumns[gf.group].includes(hn)
                          }
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ 'aria-labelledby': hn }}
                          onClick={() =>
                            handleColumnVisibleToggle(gf.group, hn)
                          }
                        />
                      </ListItemIcon>
                      <ListItemText id={hn} primary={hn} />
                    </ListItem>
                  ))}
                </List>
              </div>
            );
          })}
        </List>
      </ClickAwayListener>
    );
  };

  const handleToggleAggregateBySymbol = () => {
    setAggregateBySymbol(!aggregateBySymbol);
    let vcFromStorage = localStorage.getItem(currentDayTable_visibleColumnsKey);
    if (!vcFromStorage) {
      vcFromStorage = {
        ['Bar Groups']: columnDefs
          .map((c) => c.headerName)
          .filter((c) => c.toLowerCase().startsWith('bar')),
        ['Bar Fields']: columnDefs[1].children.map(
          (c) => c.headerName.split('.')[0]
        ),
      };
    } else {
      vcFromStorage = JSON.parse(vcFromStorage);
    }
    setColumnDefs(addHideWhereNecessary(columnDefs, vcFromStorage));
  };

  const handleChooseColumnsClicked = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleModeChange = () => {
    const newModeIsSingleSymbol = !props.singleSymbolMode;
    props.onModeChangeRequested(newModeIsSingleSymbol);
    if (newModeIsSingleSymbol) {
      if (usePrefiltering) {
        setUsePrefiltering(false);
      }

      // single symbol mode
      const firstSymbol =
        selectedSymbols.length === 0 ? allSymbolsInGrid[0] : selectedSymbols[0];
      setCurrentSingleSymbol(firstSymbol);
    } else {
      setCurrentSingleSymbol(null);
    }
  };

  const handleRevealHiddenSymbols = () => {
    setSelectedSymbols([]);
  };

  const handleHideUnselectedSymbols = () => {
    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length > 0) {
      const aggregatedSymbols = _.orderBy(
        _.uniq(
          selectedRows.map((r) => r.symbol),
          (r) => r
        ),
        (r) => r
      );
      setSelectedSymbols(aggregatedSymbols);
    }
  };

  const handlePreviousSingleSymbol = () => {
    const syms = selectedSymbols.length ? selectedSymbols : allSymbolsInGrid;
    let idx = syms.indexOf(currentSingleSymbol);
    idx--;
    if (idx < 0) {
      idx = syms.length - 1;
    }
    setCurrentSingleSymbol(syms[idx]);
  };

  const handleNextSingleSymbol = () => {
    const syms = selectedSymbols.length ? selectedSymbols : allSymbolsInGrid;
    let idx = syms.indexOf(currentSingleSymbol);
    idx++;
    if (idx >= syms.length) {
      idx = 0;
    }
    setCurrentSingleSymbol(syms[idx]);
  };

  const handleRunNewJob = async () => {
    const res = await nodeServer.post('runCurrentDayJob');

    // await reloadData(res.data.results);
  };

  const handleUsePrefilteringChanged = async () => {
    const newVal = !usePrefiltering;
    setUsePrefiltering(newVal);
    localStorage.setItem(
      currentDayTable_usePrefilteringKey,
      newVal ? 'true' : 'false'
    );
    getFiltersFromLocalStorage(gridApi);
  };

  const getFiltersFromLocalStorage = (gApi) => {
    const strStoredFilterModel = localStorage.getItem(
      currentDayTable_columnFiltersKey
    );
    if (strStoredFilterModel) {
      const storedFilterModel = JSON.parse(strStoredFilterModel);
      gApi.setFilterModel(storedFilterModel);
      gApi.onFilterChanged();
    }
  };

  const handleGridReady = (e) => {
    setGridApi(e.api);
    setColumnApi(e.columnApi);

    setTimeout(() => {
      getFiltersFromLocalStorage(e.api);
    }, 500);
  };

  const addHideWhereNecessary = (colDefs, vc) => {
    const cd = [...colDefs];
    // first set show/hide on the bar groups
    for (const c of cd) {
      if (c.headerName.toLowerCase().startsWith('bar ')) {
        const hideAllChildren = !vc['Bar Groups'].includes(c.headerName);
        // then set each of the sub columns
        for (const subCol of c.children) {
          subCol.hide =
            hideAllChildren ||
            vc['Bar Fields'].filter((vcc) => subCol.headerName.startsWith(vcc))
              .length === 0;

          if (columnApi) {
            columnApi.hideColumn(subCol.field, subCol.hide);
          }
        }
      } else if (c.headerName === 'Primary criteria') {
        for (const subCol of c.children) {
          if (
            subCol.field === 'numberOfBars' ||
            subCol.field === 'sourceDate'
          ) {
            if (columnApi) {
              columnApi.hideColumn(subCol.field, !aggregateBySymbol);
            }
          }
        }
      }
    }

    return cd;
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
            {
              headerName: `stdDev_maxUpsidePercent_byBarX.${sb}`,
              field: `stdDev_maxUpsidePercent_byBarX.${sb}`,
              headerTooltip: `stdDev_maxUpsidePercent_byBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `avg_maxDownsidePercent_byBarX.${sb}`,
              field: `avg_maxDownsidePercent_byBarX.${sb}`,
              headerTooltip: `avg_maxDownsidePercent_byBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `stdDev_maxDownsidePercent_byBarX.${sb}`,
              field: `stdDev_maxDownsidePercent_byBarX.${sb}`,
              headerTooltip: `stdDev_maxDownsidePercent_byBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `avg_profitLossPercent_atBarX.${sb}`,
              field: `avg_profitLossPercent_atBarX.${sb}`,
              headerTooltip: `avg_profitLossPercent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
              cellClassRules: {
                greenLevel1: (params) => {
                  return params.value > 0;
                },
                greenLevel2: (params) => {
                  return params.value > 1;
                },
                greenLevel3: (params) => {
                  return params.value > 2;
                },
                redLevel1: (params) => {
                  return params.value < 0;
                },
                redLevel2: (params) => {
                  return params.value < -1;
                },
                redLevel3: (params) => {
                  return params.value < -2;
                },
              },
            },
            {
              headerName: `upsideDownsideRatio_byBarX.${sb}`,
              field: `upsideDownsideRatio_byBarX.${sb}`,
              headerTooltip: `upsideDownsideRatio_byBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `percentProfitable_atBarX.${sb}`,
              field: `percentProfitable_atBarX.${sb}`,
              headerTooltip: `percentProfitable_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
              cellClassRules: {
                greenLevel1: (params) => {
                  return params.value > 50;
                },
                greenLevel2: (params) => {
                  return params.value > 60;
                },
                greenLevel3: (params) => {
                  return params.value > 70;
                },
                redLevel1: (params) => {
                  return params.value < 50;
                },
                redLevel2: (params) => {
                  return params.value < 40;
                },
                redLevel3: (params) => {
                  return params.value < 30;
                },
              },
            },
            {
              headerName: `avg_maxUpsidePercent_byBarX.${sb}`,
              field: `avg_maxUpsidePercent_byBarX.${sb}`,
              headerTooltip: `avg_maxUpsidePercent_byBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `percentProfitable_by_1_percent_atBarX.${sb}`,
              field: `percentProfitable_by_1_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_1_percent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `percentProfitable_by_2_percent_atBarX.${sb}`,
              field: `percentProfitable_by_2_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_2_percent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `percentProfitable_by_5_percent_atBarX.${sb}`,
              field: `percentProfitable_by_5_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_5_percent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `percentProfitable_by_10_percent_atBarX.${sb}`,
              field: `percentProfitable_by_10_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_10_percent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
            {
              headerName: `stdDev_profitLossPercent_atBarX.${sb}`,
              field: `stdDev_profitLossPercent_atBarX.${sb}`,
              headerTooltip: `stdDev_profitLossPercent_atBarX.${sb}`,
              headerClass: `header-${rotatingCssIndex}`,
            },
          ],
        });
        rotatingCssIndex++;
        if (rotatingCssIndex > 5) {
          rotatingCssIndex = 1;
        }
      }

      let vcFromStorage = localStorage.getItem(
        currentDayTable_visibleColumnsKey
      );
      if (!vcFromStorage) {
        vcFromStorage = {
          ['Bar Groups']: colDefs
            .map((c) => c.headerName)
            .filter((c) => c.toLowerCase().startsWith('bar')),
          ['Bar Fields']: colDefs[1].children.map(
            (c) => c.headerName.split('.')[0]
          ),
        };
      } else {
        vcFromStorage = JSON.parse(vcFromStorage);
      }

      const hiddenWhereNecessary = addHideWhereNecessary(
        colDefs,
        vcFromStorage
      );
      setColumnDefs(hiddenWhereNecessary);
      setVisibleColumns(vcFromStorage);
    })();
  }, []);

  const syms =
    selectedSymbols && selectedSymbols.length
      ? selectedSymbols
      : allSymbolsInGrid;

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
                    case '$in':
                      return false;
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
          rowSelection={props.singleSymbolMode ? 'single' : 'multiple'}
        ></AgGridReact>
      </div>
      <Grid container className={classes.gridWrapper}>
        {!props.singleSymbolMode && (
          <Grid item>
            <Button
              variant="contained"
              className={classes.button}
              onClick={handleRunNewJob}
            >
              Run new job
            </Button>
          </Grid>
        )}
        {!props.singleSymbolMode && (
          <Grid item>
            <Button
              variant="contained"
              className={classes.button}
              startIcon={<ViewColumnIcon />}
              onClick={handleChooseColumnsClicked}
            >
              Choose columns
            </Button>
            <Popper open={Boolean(anchorEl)} anchorEl={anchorEl}>
              {getColumnChoices()}
            </Popper>
          </Grid>
        )}
        <Grid item>
          <Button
            variant="contained"
            className={classes.button}
            onClick={handleModeChange}
          >
            {props.singleSymbolMode
              ? 'Switch to large grid mode'
              : 'Switch to single symbol mode'}
          </Button>
        </Grid>
        {!props.singleSymbolMode && (
          <Grid item>
            <Button
              variant="contained"
              className={classes.button}
              onClick={handleHideUnselectedSymbols}
            >
              {'Hide unselected Symbols'}
            </Button>
          </Grid>
        )}
        {!props.singleSymbolMode && (
          <Grid item>
            <Button
              variant="contained"
              className={classes.button}
              onClick={handleToggleAggregateBySymbol}
            >
              {aggregateBySymbol
                ? 'Stop aggregating by symbol'
                : 'Aggregate by symbol'}
            </Button>
          </Grid>
        )}
        {!props.singleSymbolMode && (
          <Grid item>
            <FormControlLabel
              className={classes.chkUsePrefiltering}
              control={<Checkbox name="chkUsePrefiltering" />}
              label="Use prefiltering"
              checked={usePrefiltering}
              onChange={handleUsePrefilteringChanged}
            />
          </Grid>
        )}
        {selectedSymbols && selectedSymbols.length > 0 && (
          <Grid item>
            <Button
              variant="contained"
              className={classes.button}
              onClick={handleRevealHiddenSymbols}
            >
              {'Reveal hidden symbols'}
            </Button>
          </Grid>
        )}
        {props.singleSymbolMode && (
          <>
            <Grid item>
              <IconButton
                aria-label="previous"
                onClick={handlePreviousSingleSymbol}
              >
                <SkipPreviousIcon />
              </IconButton>
            </Grid>
            <Grid item>{`${currentSingleSymbol} (${
              syms.indexOf(currentSingleSymbol) + 1
            }/${syms.length})`}</Grid>
            <Grid item>
              <IconButton aria-label="next" onClick={handleNextSingleSymbol}>
                <SkipNextIcon />
              </IconButton>
            </Grid>
          </>
        )}
      </Grid>
    </div>
  );
};

export default CurrentDayResultsTable;
