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
import '../styles/currentDayGridStyles.css';
// import StringParseFloatingFilter from '../agGridFilters/StringParseFloatingFilter';

const useStyles = makeStyles((theme) => ({}));

const PaperTrading = (props) => {
  const classes = useStyles();
  const columnDefs = [
    {
      headerName: 'symbol',
      field: 'symbol',
    },
    {
      headerName: 'Buy Date',
      field: 'buyDate',
    },
    {
      headerName: 'Sell Date',
      field: 'sellDate',
    },
    {
      headerName: 'Buy Price',
      field: 'buyPrice_underlying',
      type: 'rightAligned',
    },
    {
      headerName: 'Sell Price',
      field: 'sellPrice_underlying',
      type: 'rightAligned',
    },
    {
      headerName: 'Profit/Loss %',
      field: 'pl_percent',
      type: 'rightAligned',
    },
  ];

  const [gridData, setGridData] = useState([]);

  const formatMongooseDecimal = (obj) => {
    {
      return obj
        ? Math.round(parseFloat(obj['$numberDecimal']) * 100) / 100
        : '';
    }
  };

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
        const pl_percent = sellPrice_underlying
          ? Math.round(
              (1000 * (sellPrice_underlying - buyPrice_underlying)) /
                buyPrice_underlying
            ) / 10
          : '';

        return {
          ...r,
          buyDate: formatDate(r.buyDate),
          sellDate: formatDate(r.sellDate),
          buyPrice_underlying: buyPrice_underlying,
          sellPrice_underlying: sellPrice_underlying,
          pl_percent,
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
          debugger;
          if (
            !row.sellPrice_underlying &&
            !isNullOrUndefined(symbolKeyed[row.symbol])
          ) {
            row.sellPrice_underlying = symbolKeyed[row.symbol];
            row.pl_percent =
              Math.round(
                (1000 * (row.sellPrice_underlying - row.buyPrice_underlying)) /
                  row.buyPrice_underlying
              ) / 10;
          }
        }
      }

      setGridData(mappedGridData);
    })();
  }, []);

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
          rowSelection={'single'}
        ></AgGridReact>
      </div>
    </div>
  );
};

export default PaperTrading;
