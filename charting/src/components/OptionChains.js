import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';
import _ from 'lodash';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

const useStyles = makeStyles((theme) => ({}));

const OptionChains = (props) => {
  const classes = useStyles();
  useEffect(() => {
    if (!props.rowdata || props.rowdata.buyDate_option_chains.length == 0) {
      setMatchedChains([]);
      return;
    }
    const matched = [];
    for (const buyRow of props.rowdata.buyDate_option_chains) {
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
    setMatchedChains(matched);
  }, [props.rowdata]);

  const [matchedChains, setMatchedChains] = useState([]);

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
      <div className="ag-theme-balham" style={{ height: '400px' }}>
        <AgGridReact
          defaultColDef={{ width: 75, sortable: true, resizable: true }}
          columnDefs={[
            {
              headerName: 'Expiration Date',
              field: 'buyRow.expirationDate',
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
    </div>
  );
};

export default OptionChains;
