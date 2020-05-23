import React, { useEffect, useRef, useState } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
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
import SimulationResultsTable from './SimulationResultsTable';

import _ from 'lodash';
import nodeServer from '../helpers/nodeServer';

const { isNullOrUndefined } = require('../helpers/miscMethods');

const NONE = '-none-';

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
}))(TableCell);

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
  const [availableNumberOfBars, setAvailableNumberOfBars] = React.useState([]);
  const [significantBars, setSignificantBars] = React.useState([]);

  const [windowDimensions, setWindowDimensions] = useState(null);

  const [chartParams, setChartParams] = React.useState({
    symbol: '',
    significantBar: 1,
    numberOfBars: 10,
    max_avgScore: 10,
    min_scoreCount: 10,
    min_percentProfitable_atBarX: 70,
    min_upsideDownsideRatio_byBarX: '',
    min_avg_maxUpsidePercent_byBarX: '',
    includeOtherSymbolsTargets: false,
  });
  const [chartData, setChartData] = React.useState([]);
  const [aggregatedResultRows, setAggregatedResultRows] = React.useState([]);

  useEffect(() => {
    (async () => {
      setSymbols((await nodeServer.get('availableSymbols')).data);
      setAvailableNumberOfBars(
        _.orderBy(
          (await nodeServer.get('availableNumberOfBars')).data,
          (nb) => nb
        )
      );
      setSignificantBars((await nodeServer.get('significantBars')).data);

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
      numberOfBars: chartParams.numberOfBars,
      ignoreMatchesAboveThisScore: 12,
      significantBar: chartParams.significantBar,
      includeOtherSymbolsTargets: chartParams.includeOtherSymbolsTargets,
      patternStatsConfig: {
        max_avgScore: chartParams.max_avgScore,
        min_scoreCount: chartParams.min_scoreCount,
        min_percentProfitable_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_percentProfitable_atBarX,
        },
        min_upsideDownsideRatio_byBarX: {
          [chartParams.significantBar]:
            chartParams.min_upsideDownsideRatio_byBarX,
        },
        min_avg_maxUpsidePercent_byBarX: {
          [chartParams.significantBar]:
            chartParams.min_avg_maxUpsidePercent_byBarX,
        },
      },
    });

    /*    
    max_avg_maxDownsidePercent_byBarX: null,
    min_avg_profitLossPercent_atBarX: null,    
    min_percentProfitable_by_1_percent_atBarX: null,
    min_percentProfitable_by_2_percent_atBarX: null,
    min_percentProfitable_by_5_percent_atBarX: null,
    min_percentProfitable_by_10_percent_atBarX: null,
 */
    const { data } = tradeSimulationResults;

    setAggregatedResultRows([
      {
        name: ['avg pl %'],
        value: data.avgProfitLossPercent,
      },
      { name: ['% profitable'], value: data.percentProfitable },
      { name: ['days evaluated'], value: data.daysEvaluatedCount },
      { name: ['trade count'], value: data.tradeCount },
      { name: ['trade count per year'], value: data.tradeCountPerYear },
    ]);

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
            maxTicks={5}
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
                value={chartParams.numberOfBars}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    numberOfBars: e.target.value,
                  });
                }}
              >
                {availableNumberOfBars.map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {isNullOrUndefined(val) ? NONE : val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText># of bars</FormHelperText>
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
                {significantBars.map((val, index) => (
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
                {[null, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(
                  (val, index) => (
                    <MenuItem key={index} value={val}>
                      {isNullOrUndefined(val) ? NONE : val}
                    </MenuItem>
                  )
                )}
              </Select>
              <FormHelperText>max avg score</FormHelperText>
            </FormControl>
            <FormControl className={classes.formControl}>
              <Select
                value={chartParams.min_scoreCount}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    min_scoreCount: e.target.value,
                  });
                }}
              >
                {[null, 1, 2, 5, 10, 15, 20].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {isNullOrUndefined(val) ? NONE : val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>min score count</FormHelperText>
            </FormControl>

            <FormControl className={classes.formControl}>
              <Select
                value={chartParams.min_percentProfitable_atBarX}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    min_percentProfitable_atBarX: e.target.value,
                  });
                }}
              >
                {[null, 50, 60, 70, 80].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {isNullOrUndefined(val) ? NONE : val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>min % p at bar</FormHelperText>
            </FormControl>

            <FormControl className={classes.formControl}>
              <Select
                value={chartParams.min_upsideDownsideRatio_byBarX}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    min_upsideDownsideRatio_byBarX: e.target.value,
                  });
                }}
              >
                {[null, 0.25, 0.5, 1, 1.5, 2, 2.5].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {isNullOrUndefined(val) ? NONE : val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>min up/down by bar</FormHelperText>
            </FormControl>

            <FormControl className={classes.formControl}>
              <Select
                value={chartParams.min_avg_maxUpsidePercent_byBarX}
                onChange={(e) => {
                  setChartParams({
                    ...chartParams,
                    min_avg_maxUpsidePercent_byBarX: e.target.value,
                  });
                }}
              >
                {[null, 1, 2, 5].map((val, index) => (
                  <MenuItem key={index} value={val}>
                    {isNullOrUndefined(val) ? NONE : val}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>min avg max-up-% by bar</FormHelperText>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={chartParams.includeOtherSymbolsTargets}
                  onChange={(e) => {
                    setChartParams({
                      ...chartParams,
                      includeOtherSymbolsTargets: e.target.checked,
                    });
                  }}
                  name="includeOtherSymbolsTargets"
                />
              }
              label="Use other symbols' price histories"
            />
          </Paper>
        </Grid>
        {aggregatedResultRows.length ? (
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
                  {aggregatedResultRows.map((row) => (
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
        ) : (
          <></>
        )}
        <Grid item xs={12}>
          <SimulationResultsTable height={400} />
        </Grid>
      </Grid>
    </div>
  );
}

export default MainPage;
