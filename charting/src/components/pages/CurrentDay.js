import React, { useEffect, useState } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';

import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import CurrentDayResultsTable from '../CurrentDayResultsTable';
import Chart from '../Chart';
import _ from 'lodash';
import nodeServer from '../../helpers/nodeServer';
import { toXDecimals } from '../../helpers/commonMethods';

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
  const [tableData, setTableData] = useState([]);

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

  const StyledTableCell = withStyles((theme) => ({
    head: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
    },
  }))(TableCell);

  const handleDetailRequested = async (
    symbol,
    scoreDates,
    significantBar,
    numberOfBars
  ) => {
    let candles;
    if (chartData.symbol !== symbol) {
      candles = (await nodeServer.get(`candles?symbol=${symbol}`)).data;
    } else {
      candles = chartData.candles;
    }

    const rechartsFormattedData = [];
    for (const scoreDate of scoreDates) {
      const patternBeginCandle = candles.filter((c) => c.date === scoreDate)[0];
      const patternBeginIndex = candles.indexOf(patternBeginCandle);

      const buyCandleIndex = patternBeginIndex + numberOfBars - 1;
      const buyCandle = candles[buyCandleIndex];
      const sellCandle = candles[buyCandleIndex + significantBar];

      if (buyCandle && sellCandle) {
        const pl = toXDecimals(
          ((sellCandle.close - buyCandle.close) * 100) / buyCandle.close
        );
        rechartsFormattedData.push({ name: scoreDate, ['p/l %']: pl });
      }
    }

    // aggregate those results for the table
    const percentProfitable =
      (100 *
        rechartsFormattedData.filter(
          (r) => Math.round(r['p/l %'] * 10) / 10 > 0
        ).length) /
      rechartsFormattedData.length;
    setTableData([
      {
        name: ['avg pl %'],
        value: toXDecimals(
          _.sumBy(rechartsFormattedData, (r) => r['p/l %']) /
            rechartsFormattedData.length,
          1
        ),
      },
      {
        name: ['% profitable'],
        value: toXDecimals(percentProfitable, 1),
      },
      { name: ['trade count'], value: scoreDates.length },
    ]);

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
          {singleSymbolMode && tableData.length > 0 && (
            <Grid item>
              <TableContainer
                component={Paper}
                className={classes.formControlWrapper}
              >
                <Table className={classes.table} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>Aggregated Result</StyledTableCell>
                      <StyledTableCell align="right">Value</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.name}>
                        <StyledTableCell component="th" scope="row">
                          {row.name}
                        </StyledTableCell>
                        <StyledTableCell align="right">
                          {row.value}
                        </StyledTableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
