import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';
import moment from 'moment';
import nodeServer from '../../helpers/nodeServer';
import ButtonCellRenderer from '../cellRenderers/buttonCellRenderer';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import { toTwoDecimals } from '../../helpers/commonMethods';
import DialogTitle from '@material-ui/core/DialogTitle';
import OptionChains from '../OptionChains';

import _ from 'lodash';
import {
  isNullOrUndefined,
  currencyFormatter,
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
    width: '250px',
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
  },
  heldDaysSelector: { margin: theme.spacing(2), padding: theme.spacing(1) },
  dateSelector: { margin: theme.spacing(2), padding: theme.spacing(1) },
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
  const handleShowOptionChains = (rowData) => {
    setDialogOptionChains(rowData);
  };

  const handleOptionSelected = async (optionContract) => {
    const { expirationDate, buyMark, sellMark, strikePrice } = optionContract;
    const chosenOptionContract = `${expirationDate} ${strikePrice.toFixed(1)}`;
    const chosenId = dialogOptionChains._id;
    const updatedGridData = [];
    for (const row of gridData) {
      if (row._id === chosenId) {
        let plPercent = '';
        if (sellMark) {
          plPercent = ((sellMark - buyMark) * 100) / buyMark;
        }
        const updateObj = {
          chosen_option_contract: chosenOptionContract,
          buyPrice_option: buyMark,
          sellPrice_option: sellMark,
          option_pl_percent: plPercent,
        };
        updatedGridData.push({
          ...row,
          ...updateObj,
        });
        await nodeServer.post('updatePaperTradeOptionChoice', {
          ...updateObj,
          id: chosenId,
        });
      } else {
        updatedGridData.push(row);
      }
    }

    setGridData(updatedGridData);
    setDialogOptionChains(null);
  };

  const columnDefs = [
    {
      headerName: 'Primary',
      marryChildren: true,
      children: [
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
      ],
    },
    {
      headerName: 'Underlying',
      marryChildren: true,
      children: [
        {
          headerName: 'Buy Price',
          headerTooltip: 'Buy Price',
          field: 'buyPrice_underlying',
          type: 'rightAligned',
          valueFormatter: currencyFormatter,
        },
        {
          headerName: 'Current/Sold Price',
          headerTooltip: 'Current/Sold Price',
          field: 'sellPrice_underlying',
          type: 'rightAligned',
          width: 140,
          valueFormatter: currencyFormatter,
        },
        {
          headerName: 'Profit/Loss %',
          headerTooltip: 'Underlying Profit/Loss %',
          field: 'underlying_pl_percent',
          type: 'rightAligned',
          valueFormatter: profitLossFormatter,
          cellClassRules: priceColumnStyleRules,
        },
      ],
    },
    {
      headerName: 'Option',
      marryChildren: true,
      children: [
        {
          headerName: 'Contract',
          headerTooltip: 'Contract',
          field: 'chosen_option_contract',
        },
        {
          headerName: 'Buy Price',
          headerTooltip: 'Buy Price',
          field: 'buyPrice_option',
          type: 'rightAligned',
          width: 130,
          valueFormatter: currencyFormatter,
        },
        {
          headerName: 'Sell Price',
          headerTooltip: 'Sell Price',
          field: 'sellPrice_option',
          type: 'rightAligned',
          width: 130,
          valueFormatter: currencyFormatter,
        },
        {
          headerName: 'Profit/Loss %',
          headerTooltip: 'Profit/Loss %',
          field: 'option_pl_percent',
          type: 'rightAligned',
          width: 150,
          valueFormatter: profitLossFormatter,
          cellClassRules: priceColumnStyleRules,
        },
        {
          headerName: 'Choose Contract',
          headerTooltip: 'Choose Contract',
          cellRendererFramework: ButtonCellRenderer,
          cellRendererParams: {
            onClick: handleShowOptionChains,
          },
        },
      ],
    },
  ];

  const [dialogOptionChains, setDialogOptionChains] = useState(null);
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
    const dbd = _.uniq(
      gridData
        .filter((m) => m.heldDays === heldDaysFilter)
        .map((m) => m.buyDate)
    );
    setDistinctBuyDates(dbd);
    const dhd = _.uniq(gridData.map((m) => m.heldDays));
    setDistinctHeldDays(dhd);

    let filtered = gridData.filter((r) => r.heldDays === heldDaysFilter);
    if (dbd.includes(dateFilter)) {
      filtered = filtered.filter((r) => r.buyDate === dateFilter);
    } else {
      if (dbd.length > 0) {
        setDateFilter(dbd[0]);
      }
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

        const sp = toTwoDecimals(sellPrice_underlying);
        const bp = toTwoDecimals(buyPrice_underlying);
        const underlying_pl_percent = sp ? (100 * (sp - bp)) / bp : '';

        const buyPrice_option = formatMongooseDecimal(r.buyPrice_option);
        const sellPrice_option = formatMongooseDecimal(r.sellPrice_option);
        let option_pl_percent = '';
        if (buyPrice_option && sellPrice_option) {
          option_pl_percent =
            (100 * (sellPrice_option - buyPrice_option)) / buyPrice_option;
        }

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
          option_pl_percent: {
            value: option_pl_percent,
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
          symbolKeyed[row.symbol] = row.close;
          debugger;
        }

        for (const row of mappedGridData) {
          if (
            !row.sellPrice_underlying &&
            !isNullOrUndefined(symbolKeyed[row.symbol])
          ) {
            row.option_pl_percent = { value: null, isLive: false };
            row.sellPrice_underlying = symbolKeyed[row.symbol];
            const bp = toTwoDecimals(row.buyPrice_underlying);
            const sp = toTwoDecimals(symbolKeyed[row.symbol]);
            row.underlying_pl_percent = {
              value: (100 * (sp - bp)) / bp,
              isLive: true,
            };
          }
        }
      }

      if (mappedGridData.length > 0) {
        setDateFilter(mappedGridData[mappedGridData.length - 1].buyDate);
      }
      updateAverages(mappedGridData);
      setGridData(mappedGridData);
    })();
  }, []);

  const updateAverages = (rows) => {
    const plp = rows.map((r) => r.underlying_pl_percent.value);
    let avg_underlying = null;
    if (plp.length > 0) {
      avg_underlying = plp.reduce((a, b) => a + b) / plp.length;
    }

    let avg_option = null;
    const plp_option = rows.map((r) => r.option_pl_percent.value);
    if (plp_option.length > 0) {
      avg_option = plp_option.reduce((a, b) => a + b) / plp_option.length;
    }
    setAvgPL({ avg_underlying, avg_option, count: plp.length });
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
          getRowNodeId={(data) => `${data._id}`}
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
          <Paper className={classes.dateSelector}>
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
          </Paper>
        </Grid>
        <Grid item>
          <Paper className={classes.heldDaysSelector}>
            <FormControl>
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
          </Paper>
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
                    Avg underlying P/L%
                  </TableCell>
                  <TableCell align="right">
                    {toTwoDecimals(avgPL.avg_underlying)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Avg option P/L%
                  </TableCell>
                  <TableCell align="right">
                    {toTwoDecimals(avgPL.avg_option)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
      <Dialog
        fullWidth={true}
        maxWidth={'xl'}
        open={!!dialogOptionChains}
        onClose={() => setDialogOptionChains(null)}
        aria-labelledby="max-width-dialog-title"
      >
        <DialogTitle id="max-width-dialog-title">Option chains</DialogTitle>
        <DialogContent>
          <OptionChains
            rowdata={dialogOptionChains}
            onOptionSelected={handleOptionSelected}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOptionChains(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PaperTrading;
