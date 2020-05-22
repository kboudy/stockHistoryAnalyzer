import React from 'react';
import moment from 'moment';
import { AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

class SimulationResultsTable extends React.Component {
  numberFormatter(params) {
    return params.value;
  }

  /*       results: avgProfitLossPercent: 0.2;
  : 45.2;
  : 62;
  : 3613;
  : 6.3;
*/

  constructor(props) {
    super(props);
    this.state = {
      columnDefs: [
        {
          headerName: 'avg pl %',
          field: 'avgProfitLossPercent',
          width: 175,
          valueFormatter: this.numberFormatter,
          sortable: true,
        },
        {
          headerName: '% profitable',
          field: 'percentProfitable',
          width: 175,
          valueFormatter: this.numberFormatter,
          sortable: true,
        },
        {
          headerName: 'trade count',
          field: 'tradeCount',
          width: 175,
          sortable: true,
        },
        {
          headerName: 'days evaluated',
          field: 'daysEvaluatedCount',
          width: 175,
          sortable: true,
        },
        {
          headerName: 'trade count/yr',
          field: 'tradeCountPerYear',
          width: 175,
          sortable: true,
        },
      ],
    };
  }

  handleSelectionChanged = (e) => {
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

  render() {
    return (
      <div className="ag-theme-balham" style={{ height: this.props.height }}>
        <AgGridReact
          columnDefs={this.state.columnDefs}
          rowData={this.props.data}
          sortingOrder={['asc', 'desc']}
          onSelectionChanged={this.handleSelectionChanged}
          rowSelection="single"
        ></AgGridReact>
      </div>
    );
  }
}

export default SimulationResultsTable;
