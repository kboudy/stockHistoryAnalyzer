import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import FormHelperText from '@material-ui/core/FormHelperText';
import Grid from '@material-ui/core/Grid';
import InfoIcon from '@material-ui/icons/Info';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Chart from './Chart';

import _ from 'lodash';
import nodeServer from '../helpers/nodeServer';

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: '30px',
  },
  clipboardTextArea: {
    position: 'absolute',
    left: '-1000px',
    top: '-1000px',
    zIndex: 10,
  },
  logo: { marginRight: theme.spacing(2) },
  button: { marginLeft: theme.spacing(3) },
  formControl: { margin: theme.spacing(1) },
  formControlWrapper: { margin: theme.spacing(3) },
  chartTool: { marginLeft: theme.spacing(2) },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  table: {
    minWidth: 150,
  },
  title: { flexGrow: 1 },
  appBarSpacer: theme.mixins.toolbar,
  addChartGrid: { padding: theme.spacing(3) },
  chartGridWrapper: { padding: theme.spacing(5) },
}));

function MainPage(props) {
  const classes = useStyles();
  const [infoAnchorEl, setInfoAnchorEl] = React.useState(null);
  const [symbols, setSymbols] = React.useState([]);

  const [windowDimensions, setWindowDimensions] = useState(null);

  const [chartParams, setChartParams] = React.useState({
    symbol: null,
    significantBar: 1,
    max_avgScore: 10,
    min_percentProfitable_atBarX: { 1: 70 },
  });
  const [chartData, setChartData] = React.useState([]);
  const [aggregatedResultRows, setAggregatedResultRows] = React.useState([]);

  useEffect(() => {
    (async () => {
      setSymbols((await nodeServer.get('availableSymbols')).data);

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        // componentWillUnmount
        window.removeEventListener('resize', handleResize);
      };
    })();
  }, []);

  const reloadChartData = async () => {
    if (!chartParams.symbol) {
      return;
    }
    const tradeSimulationResults = await nodeServer.post('runTradeSimulation', {
      symbol: chartParams.symbol,
      numberOfBars: 20,
      ignoreMatchesAboveThisScore: 12,
      significantBar: chartParams.significantBar,
      patternStatsConfig: {
        max_avgScore: chartParams.max_avgScore,
        min_percentProfitable_atBarX: chartParams.min_percentProfitable_atBarX,
      },
    });

    const { data } = tradeSimulationResults;

    setAggregatedResultRows([
      {
        name: ['Avg Profit/Loss %'],
        value: data.avgProfitLossPercent,
      },
      { name: ['% profitable'], value: data.percentProfitable },
      { name: ['days evaluated'], value: data.daysEvaluatedCount },
      { name: ['trade count'], value: data.tradeCount },
      { name: ['trade count per year'], value: data.tradeCountPerYear },
    ]);
    debugger;
    const cData = [];
    const plps = tradeSimulationResults.data.listedProfitLossPercents;
    const plds = tradeSimulationResults.data.listedProfitLossSellDates;
    for (let i = 0; i < plps.length; i++) {
      cData.push({ name: plds[i], ['p/l %']: plps[i] }); // that "p/l %" string is what shows as the x-axis name in the chart hover
    }
    setChartData(cData);
  };

  useEffect(() => {
    reloadChartData();
  }, [chartParams]);

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
      <AppBar position="fixed" style={{ backgroundColor: '#111' }}>
        <Toolbar>
          <Grid container justify="space-between" alignItems="center">
            <Grid item>
              <IconButton
                aria-controls="get-info"
                aria-haspopup="true"
                onClick={(e) => setInfoAnchorEl(e.currentTarget)}
              >
                <InfoIcon style={{ color: '#fff' }}></InfoIcon>
              </IconButton>
              <Menu
                id="get-info"
                anchorEl={infoAnchorEl}
                keepMounted
                open={Boolean(infoAnchorEl)}
                onClose={() => setInfoAnchorEl(null)}
              >
                <MenuItem
                  onClick={() => {
                    setInfoAnchorEl(null);
                  }}
                >
                  Data sources
                </MenuItem>
              </Menu>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <div className={classes.appBarSpacer} />
      <Grid container className={classes.chartGridWrapper}>
        <Grid item>
          <Chart
            width={Math.round(windowDimensions.width * 0.9)}
            height={Math.round(windowDimensions.width * 0.9 * 0.25)}
            data={chartData}
            dataKeyName={'p/l %'}
          />
        </Grid>
        <Grid item>
          <Paper className={classes.formControlWrapper}>
            <FormControl className={classes.formControl}>
              <Select
                labelId="lblSymbol"
                id="cboSymbol"
                value={chartParams.symbol}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    symbol: e.target.value,
                  });
                }}
              >
                {symbols.map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>symbol</FormHelperText>
            </FormControl>

            <FormControl className={classes.formControl}>
              <Select
                labelId="lblSignificantBar"
                id="cboSignificantBar"
                value={chartParams.significantBar}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    significantBar: e.target.value,
                  });
                }}
              >
                {[1, 5, 10].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>significant bar</FormHelperText>
            </FormControl>
            <FormControl className={classes.formControl}>
              <Select
                labelId="lblMaxAvgScore"
                id="cboMaxAvgScore"
                value={chartParams.max_avgScore}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    max_avgScore: e.target.value,
                  });
                }}
              >
                {[10, 11, 12].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>max avg score</FormHelperText>
            </FormControl>
            <FormControl className={classes.formControl}>
              <Select
                labelId="lblMinPercentProfitable"
                id="cboMinPercentProfitable"
                value={
                  chartParams.min_percentProfitable_atBarX[
                    chartParams.significantBar
                  ]
                }
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    min_percentProfitable_atBarX: {
                      [chartParams.significantBar]: e.target.value,
                    },
                  });
                }}
              >
                {[50, 60, 70, 80].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>min percentProfitable at bar</FormHelperText>
            </FormControl>
          </Paper>
        </Grid>
        <Grid item>
          <TableContainer
            component={Paper}
            className={classes.formControlWrapper}
          >
            <Table className={classes.table} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Aggregated Result</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {aggregatedResultRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell align="right">{row.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </div>
  );
}

export default MainPage;
