import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
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
import nodeServer from '../helpers/nodeServer';
import { getSimulationColDefs } from '../helpers/constants';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import './styles/gridStyles.css';
import { isEmptyObject } from '../helpers/miscMethods';

const simResKey_visibleColumns = 'simulation_results_table.visible_columns';
const simResKey_columnFilters = 'simulation_results_table.column_filters';

const useStyles = makeStyles((theme) => ({
  columnChooserButton: { marginTop: theme.spacing(1) },
  columnChoiceList: {
    height: '300px',
    overflow: 'auto',
    backgroundColor: theme.palette.background.paper,
    border: '1px solid #ddd',
  },
}));

const SimulationResultsTable = (props) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null);
  const [columnDefs, setColumnDefs] = useState([]);

  useEffect(() => {
    (async () => {
      const colDefs = await getSimulationColDefs();

      const strStoredVisibleColumns = localStorage.getItem(
        simResKey_visibleColumns
      );
      if (strStoredVisibleColumns) {
        const storedVisibleColumns = JSON.parse(strStoredVisibleColumns);
        for (const colGroup of colDefs) {
          for (const c of colGroup.children) {
            c.hide = !storedVisibleColumns.includes(c.field);
          }
        }
      }

      setColumnDefs(colDefs);
    })();
  }, []);

  const transformSortToMongo = (sortModel) => {
    /*
    changes this:

    {"colId":"criteria.significantBar","sort":"asc"}

    to this:

    {"criteria.significantBar":1}
    */
    if (sortModel.length === 0) {
      return null;
    }
    const fieldName = sortModel[0]['colId'];
    return { [fieldName]: sortModel[0]['sort'] === 'asc' ? 1 : -1 };
  };

  const transformFilterToMongo = (filterModel) => {
    /*
    changes this:

    {"criteria.significantBar":{"filterType":"number","type":"equals","filter":3,"filterTo":null}}

    to this:

    {"criteria.significantBar":3}
    */
    // significantBar is needed for looking up the deeply-nested criteria.config.
    // for now, I'll hack it in there
    const significantBar = filterModel['criteria.significantBar']
      ? filterModel['criteria.significantBar'].filter
      : null;

    const mongoFilter = {};
    for (const fieldName in filterModel) {
      // hack, continued
      const correctedFieldName =
        (significantBar && fieldName.toLowerCase().endsWith('_atbarx')) ||
        fieldName.toLowerCase().endsWith('_bybarx')
          ? `${fieldName}.${significantBar}`
          : fieldName;

      const { type } = filterModel[fieldName];
      const fieldValue = filterModel[fieldName].filter;
      if (fieldValue === null) {
        continue;
      }
      switch (type) {
        case 'equals':
          mongoFilter[correctedFieldName] = fieldValue;
          break;
        case 'greaterThan':
          mongoFilter[correctedFieldName] = { $gt: fieldValue };
          break;
        case 'greaterThanOrEqual':
          mongoFilter[correctedFieldName] = { $gte: fieldValue };
          break;
        case 'lessThan':
          mongoFilter[correctedFieldName] = { $lt: fieldValue };
          break;
        case 'lessThanOrEqual':
          mongoFilter[correctedFieldName] = { $lte: fieldValue };
          break;
        default:
          console.log(type);
      }
    }
    return mongoFilter;
  };

  const gridDataSource = {
    rowCount: null,
    getRows: async (params) => {
      //await restoreFilterModelIfNecessary();
      const mongoFilter = transformFilterToMongo(params.filterModel);
      const mongoSort = transformSortToMongo(params.sortModel);

      const { startRow, endRow } = params;
      const tsrQuertyResults = await nodeServer.post('tradeSimulationRuns', {
        queryParams: mongoFilter,
        querySort: mongoSort,
        startRow,
        endRow,
      });
      const { results, isLastSet } = tsrQuertyResults.data;
      let lastRow = null;
      if (isLastSet) {
        lastRow = startRow + results.length;
      }
      params.successCallback(results, lastRow);
    },
  };

  /*   const handleFilterChanged = (e) => {
    const fm = e.api.getFilterModel();
    if (fm) {
      if (!isEmptyObject(fm)) {
        localStorage.setItem('simulationGridFilter', JSON.stringify(fm));
      }
    }
    // force infinite row model to reset, and call for rows 0-100
    e.api.setDatasource(gridDataSource);
  }; */

  const handleSortChanged = (e) => {
    e.api.setDatasource(gridDataSource);
  };

  /*   const handleGridReady = async (e) => {
    // try to restore the filter model from local storage
    const strSGF = localStorage.getItem('simulationGridFilter');
    if (strSGF) {
      const restoredFilterModel = JSON.parse(strSGF);
      let fm = e.api.getFilterModel();
      fm = { ...fm, ...restoredFilterModel };

      e.api.setFilterModel(fm);
      e.api.onFilterChanged();
    }
  };
 */
  const handleSelectionChanged = (e) => {
    if (
      e.type !== 'selectionChanged' ||
      e.api.getSelectedNodes().length === 0
    ) {
      return;
    }

    const { rowIndex } = e.api.getSelectedNodes()[0];
    const thisRow = e.api.getDisplayedRowAtIndex(rowIndex);
    if (props.selectionChanged) {
      props.selectionChanged(thisRow.data);
    }
  };

  const handleColumnVisibleToggle = (col) => {
    const visibleColumns = [];
    const updatedColumnDefs = [];
    for (const colGroup of columnDefs) {
      const g = { ...colGroup };
      g.children = [];
      updatedColumnDefs.push(g);
      for (const c of colGroup.children) {
        const uc = { ...c };
        if (c.field === col.field) {
          uc.hide = !uc.hide;
        }
        if (!uc.hide) {
          visibleColumns.push(c.field);
        }
        g.children.push(uc);
      }
    }

    localStorage.setItem(
      simResKey_visibleColumns,
      JSON.stringify(visibleColumns)
    );
    setColumnDefs(updatedColumnDefs);
  };

  const getColumnChoices = () => {
    const flattenedColumnDefs = columnDefs.reduce((reduced, colDef) => {
      reduced = [...reduced, ...colDef.children];
      return reduced;
    }, []);

    return (
      <ClickAwayListener onClickAway={() => setAnchorEl(null)}>
        <List disablePadding className={classes.columnChoiceList}>
          {_.orderBy(flattenedColumnDefs, (c) => c.index).map((col) => {
            const labelId = `cols-checkbox-list-label-${col.field}`;

            return (
              <ListItem
                key={col.field}
                role={undefined}
                dense
                button
                onClick={() => handleColumnVisibleToggle(col)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={!col.hide}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                  />
                </ListItemIcon>
                <ListItemText id={labelId} primary={col.headerName} />
              </ListItem>
            );
          })}
        </List>
      </ClickAwayListener>
    );
  };

  const handleChooseColumnsClicked = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: props.height }}>
        <AgGridReact
          defaultColDef={{ sortable: true, resizable: true, width: 120 }}
          columnDefs={columnDefs}
          gridOptions={{ rowModelType: 'infinite', datasource: gridDataSource }}
          rowData={props.data}
          sortingOrder={['asc', 'desc']}
          onSelectionChanged={handleSelectionChanged}
          onSortChanged={handleSortChanged}
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

export default SimulationResultsTable;
