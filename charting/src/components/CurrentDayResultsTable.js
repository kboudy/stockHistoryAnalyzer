import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { AgGridReact } from 'ag-grid-react';

import _ from 'lodash';
import { getSignificantBars } from '../helpers/constants';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

const useStyles = makeStyles((theme) => ({}));

const CurrentDayResultsTable = (props) => {
  const classes = useStyles();
  const [columnDefs, setColumnDefs] = React.useState([]);

  useEffect(() => {
    (async () => {
      const colDefs = [
        {
          headerName: 'Criteria (past)',
          marryChildren: true,
          children: [
            {
              headerName: 'symbol',
              field: 'symbol',
            },
            {
              headerName: 'numberOfBars',
              field: 'numberOfBars',
            },
            {
              headerName: 'sourceDate',
              field: 'sourceDate',
            },
            {
              headerName: 'scoreCount',
              field: 'scoreCount',
            },
            {
              headerName: 'avgScore',
              field: 'avgScore',
            },
          ],
        },
      ];

      for (const sb of await getSignificantBars()) {
        colDefs.push({
          headerName: `bar ${sb}`,
          marryChildren: true,
          children: [
            {
              headerName: `avg_maxUpsidePercent_byBarX.${sb}`,
              field: `avg_maxUpsidePercent_byBarX.${sb}`,
              headerTooltip: `avg_maxUpsidePercent_byBarX.${sb}`,
            },
            {
              headerName: `stdDev_maxUpsidePercent_byBarX.${sb}`,
              field: `stdDev_maxUpsidePercent_byBarX.${sb}`,
              headerTooltip: `stdDev_maxUpsidePercent_byBarX.${sb}`,
            },
            {
              headerName: `avg_maxDownsidePercent_byBarX.${sb}`,
              field: `avg_maxDownsidePercent_byBarX.${sb}`,
              headerTooltip: `avg_maxDownsidePercent_byBarX.${sb}`,
            },
            {
              headerName: `stdDev_maxDownsidePercent_byBarX.${sb}`,
              field: `stdDev_maxDownsidePercent_byBarX.${sb}`,
              headerTooltip: `stdDev_maxDownsidePercent_byBarX.${sb}`,
            },
            {
              headerName: `upsideDownsideRatio_byBarX.${sb}`,
              field: `upsideDownsideRatio_byBarX.${sb}`,
              headerTooltip: `upsideDownsideRatio_byBarX.${sb}`,
            },
            {
              headerName: `avg_profitLossPercent_atBarX.${sb}`,
              field: `avg_profitLossPercent_atBarX.${sb}`,
              headerTooltip: `avg_profitLossPercent_atBarX.${sb}`,
            },
            {
              headerName: `percentProfitable_atBarX.${sb}`,
              field: `percentProfitable_atBarX.${sb}`,
              headerTooltip: `percentProfitable_atBarX.${sb}`,
            },
            {
              headerName: `percentProfitable_by_1_percent_atBarX.${sb}`,
              field: `percentProfitable_by_1_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_1_percent_atBarX.${sb}`,
            },
            {
              headerName: `percentProfitable_by_2_percent_atBarX.${sb}`,
              field: `percentProfitable_by_2_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_2_percent_atBarX.${sb}`,
            },
            {
              headerName: `percentProfitable_by_5_percent_atBarX.${sb}`,
              field: `percentProfitable_by_5_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_5_percent_atBarX.${sb}`,
            },
            {
              headerName: `percentProfitable_by_10_percent_atBarX.${sb}`,
              field: `percentProfitable_by_10_percent_atBarX.${sb}`,
              headerTooltip: `percentProfitable_by_10_percent_atBarX.${sb}`,
            },
            {
              headerName: `stdDev_profitLossPercent_atBarX.${sb}`,
              field: `stdDev_profitLossPercent_atBarX.${sb}`,
              headerTooltip: `stdDev_profitLossPercent_atBarX.${sb}`,
            },
          ],
        });
      }

      setColumnDefs(colDefs);
    })();
  }, []);

  return (
    <div>
      <div className="ag-theme-balham" style={{ height: props.height }}>
        <AgGridReact
          defaultColDef={{
            sortable: true,
            resizable: true,
            width: 120,
            enableValue: true,
            enableRowGroup: true,
            enablePivot: true,
          }}
          columnDefs={columnDefs}
          toolPanel="columns"
          gridOptions={{ tooltipShowDelay: 0 }}
          rowData={props.data}
          sortingOrder={['asc', 'desc']}
          rowSelection="single"
        ></AgGridReact>
      </div>
    </div>
  );
};

export default CurrentDayResultsTable;
