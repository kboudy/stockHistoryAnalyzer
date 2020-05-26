import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import CurrentDayResultsTable from '../CurrentDayResultsTable';

import _ from 'lodash';

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

  return (
    <div className={classes.root}>
      <Paper>
        <Grid container className={classes.gridWrapper}>
          <Grid item xs={12}>
            <CurrentDayResultsTable height={1100} />
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}

export default Explore;
