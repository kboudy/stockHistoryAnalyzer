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
  gridWrapper: { padding: theme.spacing(2) },
}));

function Explore(props) {
  const classes = useStyles();

  // const [zzz, setZz] = React.useState(null);

  useEffect(() => {
    (async () => {
      const { results } = (
        await nodeServer.get('getMostRecentCurrentDayResults')
      ).data;
      for (const symbol in results) {
        for (const numberOfBars in results[symbol]) {
          const instanceData = results[symbol][numberOfBars];
          /*     

          [instanceData schema:]

          {
            "sourceDate": "2020-05-15",
            "scoreCount": 56
            "avgScore": 10.06,
            "avg_maxUpsidePercent_byBarX": {
              "1": 1.79,
              "2": 2.42,
              "5": 3.96,
              "10": 5.51,
              "20": 7.45,
              "30": 9.2,
              "40": 10.5,
              "50": 11.03
            },
            "stdDev_maxUpsidePercent_byBarX": {...}
            "avg_maxDownsidePercent_byBarX": {...}
            "stdDev_maxDownsidePercent_byBarX": {...}
            "upsideDownsideRatio_byBarX": {...}
            "avg_profitLossPercent_atBarX": {...}
            "percentProfitable_atBarX": {...}
            "percentProfitable_by_1_percent_atBarX": {...}
            "percentProfitable_by_2_percent_atBarX": {...}
            "percentProfitable_by_5_percent_atBarX": {...}
            "percentProfitable_by_10_percent_atBarX": {...}
            "stdDev_profitLossPercent_atBarX": {...}
          }

          */
        }
      }
    })();
  }, []);

  return (
    <div className={classes.root}>
      <Paper>
        <Grid container className={classes.gridWrapper}>
          <Grid item xs={12}>
            <CurrentDayResultsTable height={800} />
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}

export default Explore;
