import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import moment from 'moment';
import nodeServer from '../../helpers/nodeServer';

import _ from 'lodash';
import {
  getSignificantBars,
  getMongoFilter,
  isObject,
  isNullOrUndefined,
  numberFormatter,
} from '../../helpers/commonMethods';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import '../styles/paperTradingGridStyles.css';
import { Typography, Grid } from '@material-ui/core';
// import StringParseFloatingFilter from '../agGridFilters/StringParseFloatingFilter';

const priceColumnStyleRules = {
  liveProfit: (params) => {
    return params.value.isLive && params.value.value > 0;
  },
  liveLoss: (params) => {
    return params.value.isLive && params.value.value < 0;
  },
  profit: (params) => {
    return !params.value.isLive && params.value.value > 0;
  },
  loss: (params) => {
    return !params.value.isLive && params.value.value < 0;
  },
};

const useStyles = makeStyles((theme) => ({
  avgLabel: { paddingTop: theme.spacing(2), paddingLeft: theme.spacing(2) },
  filterControl: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
  },
  plTable: {
    width: '180px',
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
  },
}));

const profitLossFormatter = (params) => {
  const { value } = params.value;
  if (value !== 0 && !value) {
    return '';
  }
  return parseFloat(value).toFixed(1);
};

const PaperTrading = (props) => {
  const classes = useStyles();
  const columnDefs = [
    {
      headerName: 'symbol',
      headerTooltip: 'symbol',
      field: 'symbol',
    },
    {
      headerName: 'Buy Date',
      headerTooltip: 'Buy Date',
      field: 'buyDate',
    },
    {
      headerName: 'Sell Date',
      headerTooltip: 'Sell Date',
      field: 'sellDate',
    },
    {
      headerName: 'Underlying Buy Price',
      headerTooltip: 'Underlying Buy Price',
      field: 'buyPrice_underlying',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Underlying Sell Price',
      headerTooltip: 'Underlying Sell Price',
      field: 'sellPrice_underlying',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Underlying Profit/Loss %',
      headerTooltip: 'Underlying Profit/Loss %',
      field: 'underlying_pl_percent',
      type: 'rightAligned',
      valueFormatter: profitLossFormatter,
      cellClassRules: priceColumnStyleRules,
    },
    {
      headerName: 'Theoretical Option Buy Price',
      headerTooltip: 'Theoretical Option Buy Price',
      field: 'buyPrice_option_theoretical',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Theoretical Option Sell Price',
      headerTooltip: 'Theoretical Option Sell Price',
      field: 'sellPrice_option_theoretical',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Theoretical Option Profit/Loss %',
      headerTooltip: 'Theoretical Option Profit/Loss %',
      field: 'theoretical_option_pl_percent',
      type: 'rightAligned',
      valueFormatter: profitLossFormatter,
      cellClassRules: priceColumnStyleRules,
    },
  ];

  const [gridApi, setGridApi] = useState(null);
  const [gridData, setGridData] = useState([]);
  const [avgPL, setAvgPL] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const [distinctBuyDates, setDistinctBuyDates] = useState([]);
  const [distinctHeldDays, setDistinctHeldDays] = useState([]);
  const [heldDaysFilter, setHeldDaysFilter] = useState(1);

  const formatMongooseDecimal = (obj) =>
    obj ? Math.round(parseFloat(obj['$numberDecimal']) * 100) / 100 : '';

  const formatDate = (d) => {
    return d ? moment(d).format('YYYY-MM-DD') : '';
  };

  useEffect(() => {
    if (!gridData || gridData.length === 0) {
      return;
    }
    let filtered = gridData.filter((r) => r.heldDays === heldDaysFilter);
    if (distinctBuyDates.includes(dateFilter)) {
      filtered = filtered.filter((r) => r.buyDate === dateFilter);
    }
    updateAverages(filtered);
    gridApi.setRowData([...filtered]);
  }, [dateFilter, gridData, heldDaysFilter]);

  useEffect(() => {
    (async () => {
      const getLivePricesForThese = [];
      const results = (await nodeServer.get('paperTrading')).data;

      const mappedGridData = results.map((r) => {
        const buyPrice_underlying = formatMongooseDecimal(
          r.buyPrice_underlying
        );
        const sellPrice_underlying = formatMongooseDecimal(
          r.sellPrice_underlying
        );
        if (!sellPrice_underlying) {
          // we'll get the live prices for any that aren't yet sold
          if (!getLivePricesForThese.includes(r.symbol)) {
            getLivePricesForThese.push(r.symbol);
          }
        }

        const underlying_pl_percent = sellPrice_underlying
          ? Math.round(
              (1000 * (sellPrice_underlying - buyPrice_underlying)) /
                buyPrice_underlying
            ) / 10
          : '';

        const buyPrice_option_theoretical = formatMongooseDecimal(
          r.buyPrice_option_theoretical
        );
        const sellPrice_option_theoretical = formatMongooseDecimal(
          r.sellPrice_option_theoretical
        );
        const theoretical_option_pl_percent =
          buyPrice_option_theoretical && sellPrice_option_theoretical
            ? sellPrice_underlying
              ? Math.round(
                  (1000 *
                    (sellPrice_option_theoretical -
                      buyPrice_option_theoretical)) /
                    buyPrice_option_theoretical
                ) / 10
              : ''
            : '';

        return {
          ...r,
          buyDate: formatDate(r.buyDate),
          sellDate: formatDate(r.sellDate),
          buyPrice_underlying: buyPrice_underlying,
          sellPrice_underlying: sellPrice_underlying,
          underlying_pl_percent: {
            value: underlying_pl_percent,
            isLive: false,
          },
          theoretical_option_pl_percent: {
            value: theoretical_option_pl_percent,
            isLive: false,
          },
        };
      });
      if (getLivePricesForThese.length > 0) {
        const liveSymbolRows = (
          await nodeServer.get(
            `multipleCurrentUnderlyingQuotes?symbols=${getLivePricesForThese.join(
              ','
            )}`
          )
        ).data;
        const symbolKeyed = {};
        for (const row of liveSymbolRows) {
          symbolKeyed[row.symbol] = Math.round(row.close * 100) / 100;
        }

        for (const row of mappedGridData) {
          if (
            !row.sellPrice_underlying &&
            !isNullOrUndefined(symbolKeyed[row.symbol])
          ) {
            row.theoretical_option_pl_percent = { value: null, isLive: false };
            row.sellPrice_underlying = symbolKeyed[row.symbol];
            row.underlying_pl_percent = {
              value:
                Math.round(
                  (1000 *
                    (row.sellPrice_underlying - row.buyPrice_underlying)) /
                    row.buyPrice_underlying
                ) / 10,
              isLive: true,
            };
          }
        }
      }

      if (mappedGridData.length > 0) {
        setDateFilter(mappedGridData[mappedGridData.length - 1].buyDate);
      }
      updateAverages(mappedGridData);
      setDistinctBuyDates(_.uniq(mappedGridData.map((m) => m.buyDate)));
      setDistinctHeldDays(_.uniq(mappedGridData.map((m) => m.heldDays)));

      setGridData(mappedGridData);
    })();
  }, []);

  const updateAverages = (rows) => {
    const plp = rows.map((r) => r.underlying_pl_percent.value);
    if (plp.length > 0) {
      const avg =
        Math.round((plp.reduce((a, b) => a + b) / plp.length) * 100) / 100;
      setAvgPL({ avg, count: plp.length });
    }
  };

  const handleHeldDaysChanged = (e) => {
    debugger;
  };

  const handleGridReady = (e) => {
    setGridApi(e.api);
  };

  const handleNextDateClicked = (e) => {
    if (distinctBuyDates.includes(dateFilter)) {
      let nextIdx = distinctBuyDates.indexOf(dateFilter) + 1;
      if (nextIdx === distinctBuyDates.length) {
        nextIdx = 0;
      }
      setDateFilter(distinctBuyDates[nextIdx]);
    }
  };
  const handlePrevDateClicked = (e) => {
    if (distinctBuyDates.includes(dateFilter)) {
      let prevIdx = distinctBuyDates.indexOf(dateFilter) - 1;
      if (prevIdx < 0) {
        prevIdx = distinctBuyDates.length - 1;
      }
      setDateFilter(distinctBuyDates[prevIdx]);
    }
  };

  const handleSelectionChanged = (e) => {
    updateAverages(e.api.getSelectedRows());
  };

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: 800 }}>
        <AgGridReact
          defaultColDef={{
            // floatingFilter: true,
            // floatingFilterComponent: 'stringParseFloatingFilter',
            // filter: 'agTextColumnFilter',
            // floatingFilterComponentParams: { suppressFilterButton: true },
            sortable: true,
            resizable: true,
            width: 120,
            enableValue: true,
          }}
          // Together, getRowNodeId & deltaRowDataMode preserve the column filters
          // https://stackoverflow.com/questions/45079166/column-filter-lost-when-updating-row-data-in-ag-grid
          getRowNodeId={(data) => `${data.symbol}_${data.buyDate}`}
          // frameworkComponents={{
          //   stringParseFloatingFilter: StringParseFloatingFilter,
          // }}
          columnDefs={columnDefs}
          gridOptions={{ tooltipShowDelay: 0 }}
          // onFilterChanged={handleFilterChanged}
          // onCellClicked={handleCellClicked}
          onGridReady={handleGridReady}
          sortingOrder={['asc', 'desc']}
          rowSelection={'multiple'}
          onSelectionChanged={handleSelectionChanged}
        ></AgGridReact>
      </div>
      <Grid
        container
        className={classes.avgLabel}
        direction={'row'}
        alignItems={'center'}
      >
        <Grid item>
          <Grid container direction={'row'} alignItems={'center'}>
            <Grid item>
              <IconButton
                color="primary"
                aria-label="previous"
                onClick={handlePrevDateClicked}
              >
                <SkipPreviousIcon />
              </IconButton>
            </Grid>
            <Grid item>
              <TextField
                label="Buy date filter"
                size="small"
                style={{ width: '110px' }}
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                }}
              />
            </Grid>
            <Grid item>
              <IconButton
                color="primary"
                aria-label="next"
                onClick={handleNextDateClicked}
              >
                <SkipNextIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <FormControl className={classes.jobSelector}>
            <InputLabel id="select-current-day-job">Held days</InputLabel>
            <Select
              className={classes.filterControl}
              value={heldDaysFilter}
              onChange={(e) => setHeldDaysFilter(e.target.value)}
            >
              {distinctHeldDays.map((val, index) => {
                return (
                  <MenuItem key={index} value={val}>
                    {val}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <TableContainer component={Paper} className={classes.plTable}>
            <Table
              className={classes.table}
              size="small"
              aria-label="a dense table"
            >
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Trade count
                  </TableCell>
                  <TableCell align="right">{avgPL.count}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Avg P/L%
                  </TableCell>
                  <TableCell align="right">{avgPL.avg}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </div>
  );
};

export default PaperTrading;
