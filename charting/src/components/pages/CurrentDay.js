import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import CurrentDayResultsTable from '../CurrentDayResultsTable';
import Chart from '../Chart';
import _ from 'lodash';
import nodeServer from '../../helpers/nodeServer';
import { toTwoDecimals } from '../../helpers/commonMethods';

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

function CurrentDay(props) {
  const classes = useStyles();
  const [singleSymbolMode, setSingleSymbolMode] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(null);

  const [chartData, setChartData] = useState({
    symbol: null,
    candles: [],
    scoreDates: [],
    rechartsFormattedData: [],
  });

  const handleModeChangeRequested = () => {
    const newMode = !singleSymbolMode;
    setSingleSymbolMode(newMode);
  };

  useEffect(() => {
    (async () => {
      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    })();
  }, []);

  const handleDetailRequested = async (symbol, scoreDates, significantBar) => {
    let candles;
    if (chartData.symbol !== symbol) {
      candles = (await nodeServer.get(`candles?symbol=${symbol}`)).data;
    } else {
      candles = chartData.candles;
    }
    const rechartsFormattedData = [];
    for (const scoreDate of scoreDates) {
      const buyCandle = candles.filter((c) => c.date === scoreDate)[0];
      const buyCandleIndex = candles.indexOf(buyCandle);
      const sellCandle = candles[buyCandleIndex + significantBar];

      const pl = toTwoDecimals(
        ((sellCandle.close - buyCandle.close) * 100) / buyCandle.close
      );

      rechartsFormattedData.push({ name: scoreDate, ['p/l %']: pl });
    }

    const hsd = {
      symbol,
      candles,
      rechartsFormattedData,
    };
    setChartData(hsd);
  };

  const handleResize = () => {
    if (
      !windowDimensions ||
      windowDimensions.width !== window.innerWidth ||
      windowDimensions.height !== window.innerHeight
    ) {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  };
  if (!windowDimensions) {
    return <div></div>;
  }

  return (
    <div className={classes.root}>
      <Paper>
        <Grid container className={classes.gridWrapper}>
          {singleSymbolMode && (
            <Grid item>
              <Chart
                width={Math.round(windowDimensions.width * 0.8)}
                height={Math.round(windowDimensions.width * 0.8 * 0.25)}
                data={chartData.rechartsFormattedData}
                dataKeyName={'p/l %'}
                maxTicks={5}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <CurrentDayResultsTable
              height={singleSymbolMode ? 400 : 1100}
              singleSymbolMode={singleSymbolMode}
              onModeChangeRequested={handleModeChangeRequested}
              onDetailRequested={handleDetailRequested}
            />
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}

export default CurrentDay;
