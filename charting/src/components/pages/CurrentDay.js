import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import CurrentDayResultsTable from '../CurrentDayResultsTable';

import _ from 'lodash';
import nodeServer from '../../helpers/nodeServer';
import { getSimulationColDefs } from '../../helpers/constants';

const {
  isNullOrUndefined,
  isNullOrEmptyString,
  isObject,
} = require('../../helpers/commonMethods');

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: '30px',
  },
  gridWrapper: { padding: theme.spacing(1) },
}));

function Explore(props) {
  const classes = useStyles();

  const [gridData, setGridData] = React.useState([]);

  const showThisRow = (row) => {
    if (!row || parseInt(row.scoreCount) < 10) {
      return false;
    }
    const avg_profitLossPercent_atBarX = row['avg_profitLossPercent_atBarX'];
    for (const significantBar in avg_profitLossPercent_atBarX) {
      const avgPL = parseFloat(avg_profitLossPercent_atBarX[significantBar]);
      const sb = parseFloat(significantBar);
      if (avgPL > sb * 1) {
        return true;
      }
    }
    return false;
  };
  useEffect(() => {
    (async () => {
      const { results } = (
        await nodeServer.get('getMostRecentCurrentDayResults')
      ).data;
      const rows = [];
      for (const symbol in results) {
        for (const numberOfBars in results[symbol]) {
          const instanceData = results[symbol][numberOfBars];

          if (showThisRow(instanceData)) {
            rows.push({ symbol, numberOfBars, ...instanceData });
          }
        }
      }
      setGridData(rows);
    })();
  }, []);

  return (
    <div className={classes.root}>
      <Paper>
        <Grid container className={classes.gridWrapper}>
          <Grid item xs={12}>
            <CurrentDayResultsTable height={1200} data={gridData} />
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}

export default Explore;
