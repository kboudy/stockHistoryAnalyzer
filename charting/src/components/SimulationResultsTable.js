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
      setColumnDefs(await getSimulationColDefs());
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

    const mongoFilter = {};
    for (const fieldName in filterModel) {
      const { type } = filterModel[fieldName];
      const fieldValue = filterModel[fieldName].filter;
      switch (type) {
        case 'equals':
          mongoFilter[fieldName] = fieldValue;
          break;
        case 'greaterThan':
          mongoFilter[fieldName] = { $gt: fieldValue };
          break;
        case 'greaterThanOrEqual':
          mongoFilter[fieldName] = { $gte: fieldValue };
          break;
        case 'lessThan':
          mongoFilter[fieldName] = { $lt: fieldValue };
          break;
        case 'lessThanOrEqual':
          mongoFilter[fieldName] = { $lte: fieldValue };
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

  const handleFilterChanged = (e) => {
    // force infinite row model to reset, and call for rows 0-100
    e.api.setDatasource(gridDataSource);
  };

  const handleSortChanged = (e) => {
    e.api.setDatasource(gridDataSource);
  };

  const toggleColumnChooseMenu = (e) => {};

  const handleSelectionChanged = (e) => {
    if (
      e.type !== 'selectionChanged' ||
      e.api.getSelectedNodes().length === 0
    ) {
      return;
    }

    // const { rowIndex } = e.api.getSelectedNodes()[0];
    // const thisRow = e.api.getDisplayedRowAtIndex(rowIndex);
    // this.props.onSelectionChanged(thisRow.data.sourceIndex);
  };

  const handleColumnVisibleToggle = (col) => {
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
        g.children.push(uc);
      }
    }

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
          onFilterChanged={handleFilterChanged}
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
