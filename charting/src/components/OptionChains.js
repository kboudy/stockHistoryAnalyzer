import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import _ from 'lodash';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Grid from '@material-ui/core/Grid';
import { isNullOrUndefined } from '../helpers/commonMethods';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

const useStyles = makeStyles((theme) => ({
  filterControl: {
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(3),
  },
}));

const OptionChains = (props) => {
  const optionChains_filterKey = 'optionChains.filterKey';
  const classes = useStyles();
  const [matchedChains, setMatchedChains] = useState([]);
  const [minITMPercent, setMinITMPercent] = useState('');
  const [minDaysToExp, setMinDaysToExp] = useState('');

  useEffect(() => {
    const strLs = localStorage.getItem(optionChains_filterKey);
    if (strLs) {
      const objLs = JSON.parse(strLs);
      setMinDaysToExp(objLs.minDaysToExp);
      setMinITMPercent(objLs.minITMPercent);
    }
  }, []);

  useEffect(() => {
    if (!props.rowdata || props.rowdata.buyDate_option_chains.length == 0) {
      setMatchedChains([]);
      return;
    }
    const matched = [];
    let parsedMinDaysToExp = null;
    let parsedMinITMPercent = null;
    if (!isNaN(minDaysToExp)) {
      parsedMinDaysToExp = parseInt(minDaysToExp);
    }
    if (!isNaN(minITMPercent)) {
      parsedMinITMPercent = parseInt(minITMPercent);
    }

    for (const buyRow of props.rowdata.buyDate_option_chains) {
      if (
        !isNullOrUndefined(parsedMinDaysToExp) &&
        buyRow.daysToExpiration < parsedMinDaysToExp
      ) {
        continue;
      }
      if (!isNullOrUndefined(parsedMinITMPercent)) {
        const underlyingPrice = props.rowdata.buyPrice_underlying;
        debugger;
        const itmPercent = Math.round(
          ((buyRow.isPut
            ? buyRow.strikePrice - underlyingPrice
            : underlyingPrice - buyRow.strikePrice) /
            underlyingPrice) *
            100
        );

        if (itmPercent < parsedMinITMPercent) {
          continue;
        }
      }
      let sellRow = {};
      if (props.rowdata.sellDate_option_chains) {
        const matchingSellRows = props.rowdata.sellDate_option_chains.filter(
          (sellRow) =>
            buyRow.expirationDate === sellRow.expirationDate &&
            buyRow.strikePrice === sellRow.strikePrice
        );
        if (matchingSellRows.length > 0) {
          sellRow = matchingSellRows[0];
        }
      }
      matched.push({ buyRow, sellRow });
    }
    setMatchedChains(_.orderBy(matched, (m) => -m.buyRow.delta));

    localStorage.setItem(
      optionChains_filterKey,
      JSON.stringify({
        minDaysToExp: parsedMinDaysToExp,
        minITMPercent: parsedMinITMPercent,
      })
    );
  }, [props.rowdata, minDaysToExp, minITMPercent]);

  const handleSelectionChanged = (e) => {
    const selectedRows = e.api.getSelectedRows();
    if (selectedRows.length === 1) {
      const { buyRow, sellRow } = selectedRows[0];
      props.onOptionSelected({
        expirationDate: buyRow.expirationDate,
        strikePrice: buyRow.strikePrice,
        buyMark: buyRow.mark,
        sellMark: sellRow ? sellRow.mark : null,
      });
    }
  };

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: '800px' }}>
        <AgGridReact
          defaultColDef={{ width: 75, sortable: true, resizable: true }}
          columnDefs={[
            {
              headerName: 'Expiration Date',
              field: 'buyRow.expirationDate',
              width: 120,
            },
            {
              headerName: 'Days to Exp',
              field: 'buyRow.daysToExpiration',
              width: 120,
            },
            {
              headerName: 'Strike',
              field: 'buyRow.strikePrice',
            },
            {
              headerName: 'delta',
              field: 'buyRow.delta',
            },
            // {
            //   headerName: 'gamma',
            //   field: 'gamma',
            // },
            {
              headerName: 'isPut',
              field: 'buyRow.isPut',
            },
            {
              headerName: 'openInterest',
              field: 'buyRow.openInterest',
            },
            {
              headerName: 'volatility',
              field: 'buyRow.volatility',
            },
            {
              headerName: 'Bid',
              field: 'buyRow.bid',
            },
            {
              headerName: 'Ask',
              field: 'buyRow.ask',
            },
            {
              headerName: 'Mark',
              field: 'buyRow.mark',
            },
            {
              headerName: 'delta',
              field: 'sellRow.delta',
            },
            {
              headerName: 'openInterest',
              field: 'sellRow.openInterest',
            },
            {
              headerName: 'volatility',
              field: 'sellRow.volatility',
            },
            {
              headerName: 'Bid',
              field: 'sellRow.bid',
            },
            {
              headerName: 'Ask',
              field: 'sellRow.ask',
            },
            {
              headerName: 'Mark',
              field: 'sellRow.mark',
            },
          ]}
          // getRowNodeId={(data) => data._id}
          rowData={matchedChains}
          sortingOrder={['asc', 'desc']}
          // onGridReady={handleGridReady}
          onSelectionChanged={handleSelectionChanged}
          // onSortChanged={handleSortChanged}
          rowSelection="single"
        ></AgGridReact>
      </div>

      <Grid
        container
        className={classes.avgLabel}
        direction={'row'}
        alignItems={'center'}
        spacing={3}
      >
        <Grid item>
          <TextField
            label="Min ITM %"
            size="small"
            style={{ width: '110px' }}
            value={minITMPercent}
            onChange={(e) => {
              setMinITMPercent(e.target.value);
            }}
          />
        </Grid>
        <Grid item>
          <TextField
            label="Min days to exp"
            size="small"
            style={{ width: '150px' }}
            value={minDaysToExp}
            onChange={(e) => {
              setMinDaysToExp(e.target.value);
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default OptionChains;
