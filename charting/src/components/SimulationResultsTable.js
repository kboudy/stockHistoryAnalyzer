import React from 'react';
import moment from 'moment';
import { AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import './styles/gridStyles.css';

class SimulationResultsTable extends React.Component {
  numberFormatter(params) {
    return params.value;
  }

  getColumnDefs = () => {
    return [
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
            headerName: 'other symbols',
            field: 'criteria.includeOtherSymbolsTargets',
            headerClass: 'criteria-grid-header',
          },
          {
            headerName: 'number of bars',
            filter: 'agNumberColumnFilter',
            field: 'criteria.numberOfBars',
            headerClass: 'criteria-grid-header',
            width: 140,
          },
          {
            headerName: 'significant bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.significantBar',
            headerClass: 'criteria-grid-header',
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
            valueFormatter: this.numberFormatter,
            headerClass: 'criteria-config-grid-header',
            width: 140,
          },
          {
            headerName: 'min % p at bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.config.min_percentProfitable_atBarX',
            valueFormatter: this.numberFormatter,
            headerClass: 'criteria-config-grid-header',
            width: 140,
          },
          {
            headerName: 'min % p by 1% by bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.config.min_percentProfitable_by_1_percent_atBarX',
            valueFormatter: this.numberFormatter,
            headerClass: 'criteria-config-grid-header',
            width: 165,
          },
          {
            headerName: 'min % p by 2% by bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.config.min_percentProfitable_by_2_percent_atBarX',
            headerClass: 'criteria-config-grid-header',
            valueFormatter: this.numberFormatter,
            width: 165,
          },
          {
            headerName: 'min % p by 5% by bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.config.min_percentProfitable_by_5_percent_atBarX',
            headerClass: 'criteria-config-grid-header',
            valueFormatter: this.numberFormatter,
            width: 165,
          },
          {
            headerName: 'up/down by bar',
            filter: 'agNumberColumnFilter',
            field: 'criteria.config.min_upsideDownsideRatio_byBarX',
            headerClass: 'criteria-config-grid-header',
            valueFormatter: this.numberFormatter,
            width: 140,
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
            valueFormatter: this.numberFormatter,
            headerClass: 'results-grid-header',
          },
          {
            headerName: '% profitable',
            filter: 'agNumberColumnFilter',
            field: 'results.percentProfitable',
            valueFormatter: this.numberFormatter,
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
    ];
  };

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
          defaultColDef={{ sortable: true, resizable: true, width: 120 }}
          columnDefs={this.getColumnDefs()}
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
