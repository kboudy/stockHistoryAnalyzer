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
import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import queryString from 'query-string';
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
  chartTool: { marginLeft: theme.spacing(2) },
  extendedIcon: {
    marginRight: theme.spacing(1),
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
    const cData = [];
    const plps = tradeSimulationResults.data.listedProfitLossPercents;
    const plds = tradeSimulationResults.data.listedProfitLossSellDates;
    for (let i = 0; i < plps.length; i++) {
      cData.push({ name: plds[i], ['profit/loss %']: plps[i] });
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
          />
        </Grid>
        <Grid item xs={12}>
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
        </Grid>
      </Grid>
    </div>
  );
}

export default MainPage;
