import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
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
      headerName: 'Actual Option Buy Price',
      headerTooltip: 'Actual Option Buy Price',
      field: 'buyPrice_option_actual',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Actual Option Sell Price',
      headerTooltip: 'Actual Option Sell Price',
      field: 'sellPrice_option_actual',
      type: 'rightAligned',
      valueFormatter: numberFormatter,
    },
    {
      headerName: 'Actual Option Profit/Loss %',
      headerTooltip: 'Actual Option Profit/Loss %',
      field: 'actual_option_pl_percent',
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

  const [gridData, setGridData] = useState([]);
  const [avgPL, setAvgPL] = useState(0);

  const formatMongooseDecimal = (obj) =>
    obj ? Math.round(parseFloat(obj['$numberDecimal']) * 100) / 100 : '';

  const formatDate = (d) => {
    return d ? moment(d).format('YYYY-MM-DD') : '';
  };

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

        const buyPrice_option_actual = formatMongooseDecimal(
          r.buyPrice_option_actual
        );
        const sellPrice_option_actual = formatMongooseDecimal(
          r.sellPrice_option_actual
        );
        if (r.symbol === 'AAOI') {
          debugger;
        }
        const actual_option_pl_percent =
          buyPrice_option_actual && sellPrice_option_actual
            ? sellPrice_underlying
              ? Math.round(
                  (1000 * (sellPrice_option_actual - buyPrice_option_actual)) /
                    buyPrice_option_actual
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
          actual_option_pl_percent: {
            value: actual_option_pl_percent,
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
            row.actual_option_pl_percent = { value: null, isLive: false };
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

      updateAverages(mappedGridData);
      setGridData(mappedGridData);
    })();
  }, []);

  const updateAverages = (rows) => {
    const plp = rows.map((r) => r.underlying_pl_percent.value);
    const avg =
      Math.round((plp.reduce((a, b) => a + b) / plp.length) * 100) / 100;
    setAvgPL({ avg, count: plp.length });
  };

  const handleSelectionChanged = (e) => {
    updateAverages(e.api.getSelectedRows());
  };

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: 1100 }}>
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
          // frameworkComponents={{
          //   stringParseFloatingFilter: StringParseFloatingFilter,
          // }}
          columnDefs={columnDefs}
          gridOptions={{ tooltipShowDelay: 0 }}
          rowData={gridData}
          // onFilterChanged={handleFilterChanged}
          // onCellClicked={handleCellClicked}
          // onGridReady={handleGridReady}
          sortingOrder={['asc', 'desc']}
          rowSelection={'multiple'}
          onSelectionChanged={handleSelectionChanged}
        ></AgGridReact>
      </div>
      <Grid container className={classes.avgLabel}>
        <Grid item>
          <Typography>{avgPL.count} trades </Typography>
          <Typography>avg pl%: {avgPL.avg}</Typography>
        </Grid>
      </Grid>
    </div>
  );
};

export default PaperTrading;
