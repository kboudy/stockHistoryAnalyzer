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
} = require('../../helpers/miscMethods');

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: '30px',
  },
  gridWrapper: { padding: theme.spacing(1) },
}));

function Explore(props) {
  const classes = useStyles();

  const [gridData, setGridData] = React.useState([]);

  useEffect(() => {
    (async () => {
      const { results } = (
        await nodeServer.get('getMostRecentCurrentDayResults')
      ).data;
      const rows = [];
      for (const symbol in results) {
        for (const numberOfBars in results[symbol]) {
          const instanceData = results[symbol][numberOfBars];
          rows.push({ symbol, numberOfBars, ...instanceData });
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
