import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import nodeServer from '../helpers/nodeServer';
import ViewColumnIcon from '@material-ui/icons/ViewColumn';
import Button from '@material-ui/core/Button';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';

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

const currentDayTable_visibleColumnsKey = 'current_day_table.visible_columns';
const currentDayTable_columnFiltersKey = 'current_day_table.column_filters';

const useStyles = makeStyles((theme) => ({
  columnChooserButton: { marginTop: theme.spacing(1) },
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

  const [gridData, setGridData] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(null);

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

  const handleColumnVisibleToggle = (groupKey, colName) => {
    console.log(`handleColumnVisibleToggle(${groupKey},${colName})`);
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

  const handleChooseColumnsClicked = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleGridReady = (e) => {
    setGridApi(e.api);
    setColumnApi(e.columnApi);
  };

  const addHideWhereNecessary = (colDefs, vcFromStorage) => {
    const cd = [...colDefs];
    // first set show/hide on the bar groups
    for (const c of cd) {
      if (c.headerName.toLowerCase().startsWith('bar ')) {
        const hideAllChildren = !vcFromStorage['Bar Groups'].includes(
          c.headerName
        );
        // then set each of the sub columns
        for (const subCol of c.children) {
          subCol.hide =
            hideAllChildren ||
            vcFromStorage['Bar Fields'].filter((vcc) =>
              subCol.headerName.startsWith(vcc)
            ).length === 0;

          if (columnApi) {
            columnApi.hideColumn(subCol.field, subCol.hide);
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
      <Button
        variant="contained"
        className={classes.columnChooserButton}
        startIcon={<ViewColumnIcon />}
        onClick={handleChooseColumnsClicked}
      >
        Choose columns
      </Button>
      <Popper open={Boolean(anchorEl)} anchorEl={anchorEl}>
        {getColumnChoices()}
      </Popper>
    </div>
  );
};

export default CurrentDayResultsTable;
