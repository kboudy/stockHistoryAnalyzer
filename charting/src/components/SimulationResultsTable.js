import React, { useEffect, useRef, useState } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import moment from 'moment';
import { AgGridReact } from 'ag-grid-react';
import { isObject } from '../helpers/miscMethods';
import ViewColumnIcon from '@material-ui/icons/ViewColumn';
import Button from '@material-ui/core/Button';
import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Checkbox from '@material-ui/core/Checkbox';
import ListItemText from '@material-ui/core/ListItemText';

import CheckboxCellRenderer from './cellRenderers/checkboxCellRenderer';
import _ from 'lodash';
import nodeServer from '../helpers/nodeServer';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import './styles/gridStyles.css';
import { mongo } from 'mongoose';

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
  const numberFormatter = (params) => {
    if (isObject(params.value)) {
      const firstKey = Object.keys(params.value)[0];
      return params.value[firstKey];
    } else {
      return params.value;
    }
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const [columnDefs, setColumnDefs] = useState([
    {
      headerName: 'Criteria (past)',
      marryChildren: true,
      children: [
        {
          headerName: 'symbol',
          filter: 'agTextColumnFilter',
          field: 'criteria.symbol',
          headerClass: 'criteria-grid-header',
        },
        {
          headerName: '# of bars',
          filter: 'agNumberColumnFilter',
          field: 'criteria.numberOfBars',
          headerClass: 'criteria-grid-header',
        },
        {
          headerName: 'significant bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.significantBar',
          headerClass: 'criteria-grid-header',
          width: 140,
        },
        {
          headerName: 'other symbols',
          field: 'criteria.includeOtherSymbolsTargets',
          headerClass: 'criteria-grid-header',
          editable: false,
          cellRendererFramework: CheckboxCellRenderer,
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
          filter: 'agNumberColumnFilter',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          width: 140,
        },
        {
          headerName: 'min score count',
          field: 'criteria.config.min_scoreCount',
          filter: 'agNumberColumnFilter',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          width: 140,
        },
        {
          headerName: 'min % p at bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          width: 140,
        },
        {
          headerName: 'min % p by 1% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_1_percent_atBarX',
          valueFormatter: numberFormatter,
          headerClass: 'criteria-config-grid-header',
          width: 165,
        },
        {
          headerName: 'min % p by 2% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_2_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min % p by 5% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_percentProfitable_by_5_percent_atBarX',
          headerClass: 'criteria-config-grid-header',
          valueFormatter: numberFormatter,
          width: 165,
        },
        {
          headerName: 'min up/down by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_upsideDownsideRatio_byBarX',
          headerClass: 'criteria-config-grid-header',
          valueFormatter: numberFormatter,
          width: 160,
        },
        {
          headerName: 'min avg max-up-% by bar',
          filter: 'agNumberColumnFilter',
          field: 'criteria.config.min_avg_maxUpsidePercent_byBarX',
          headerClass: 'criteria-config-grid-header',
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
  ]);

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
