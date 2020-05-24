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
import { getSimulationColDefs } from '../helpers/constants';

const {
  isNullOrUndefined,
  isNullOrEmptyString,
  isObject,
} = require('../helpers/miscMethods');

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
  chartGridWrapper: { padding: theme.spacing(2) },
}));

function MainPage(props) {
  const classes = useStyles();
  const [infoAnchorEl, setInfoAnchorEl] = React.useState(null);
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
    max_avg_maxDownsidePercent_byBarX: '',
    min_avg_profitLossPercent_atBarX: '',
    min_percentProfitable_by_1_percent_atBarX: '',
    min_percentProfitable_by_2_percent_atBarX: '',
    min_percentProfitable_by_5_percent_atBarX: '',
    min_percentProfitable_by_10_percent_atBarX: '',

    includeOtherSymbolsTargets: false,
  });
  const [chartData, setChartData] = React.useState([]);
  const [aggregatedResultRows, setAggregatedResultRows] = React.useState([]);
  const [flattenedColDefs, setFlattenedColDefs] = React.useState([]);

  useEffect(() => {
    (async () => {
      window.addEventListener('resize', handleResize);
      handleResize();

      const origColDefs = await getSimulationColDefs();
      setFlattenedColDefs(
        [...origColDefs[0].children, ...origColDefs[1].children].filter(
          (h) => h.field !== 'criteria.includeOtherSymbolsTargets'
        )
      );

      return () => {
        // componentWillUnmount
        window.removeEventListener('resize', handleResize);
      };
    })();
  }, []);

  const removeNullValues = (queryFilter) => {
    const strippedQF = { ...queryFilter };
    const mainFieldNames = Object.keys(strippedQF);
    for (const fn of mainFieldNames) {
      if (strippedQF[fn] === null) {
        delete strippedQF[fn];
      }
    }

    const psFieldNames = Object.keys(queryFilter.patternStatsConfig);
    for (const fn of psFieldNames) {
      if (isNullOrEmptyString(strippedQF.patternStatsConfig[fn])) {
        delete strippedQF.patternStatsConfig[fn];
      } else {
        if (strippedQF.patternStatsConfig[fn]) {
          debugger;
          const firstSubKey = Object.keys(strippedQF.patternStatsConfig[fn])[0];
          if (
            isNullOrEmptyString(strippedQF.patternStatsConfig[fn][firstSubKey])
          ) {
            delete strippedQF.patternStatsConfig[fn];
          }
        }
      }
    }
    return strippedQF;
  };

  const reloadChartData = async () => {
    const queryFilter = {
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

        max_avg_maxDownsidePercent_byBarX: {
          [chartParams.significantBar]:
            chartParams.max_avg_maxDownsidePercent_byBarX,
        },
        min_avg_profitLossPercent_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_avg_profitLossPercent_atBarX,
        },

        min_percentProfitable_by_1_percent_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_percentProfitable_by_1_percent_atBarX,
        },
        min_percentProfitable_by_2_percent_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_percentProfitable_by_2_percent_atBarX,
        },
        min_percentProfitable_by_5_percent_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_percentProfitable_by_5_percent_atBarX,
        },
        min_percentProfitable_by_10_percent_atBarX: {
          [chartParams.significantBar]:
            chartParams.min_percentProfitable_by_10_percent_atBarX,
        },
      },
    };
    const cleanedQF = removeNullValues(queryFilter);
    const tradeSimulationResults = await nodeServer.post(
      'runTradeSimulation',
      cleanedQF
    );

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

  const handleSimulationTableSelectionChanged = (e) => {
    let updatedParams = { ...e.criteria };
    delete updatedParams.config;
    updatedParams = { ...updatedParams, ...e.criteria.config };

    // flatten any bar object params
    for (const p in updatedParams) {
      if (
        p.toLowerCase().includes('_atbar') ||
        p.toLowerCase().includes('_bybar')
      ) {
        if (isObject(updatedParams[p])) {
          const firstKey = Object.keys(updatedParams[p]);
          updatedParams[p] = updatedParams[p][firstKey];
        }
      }
    }
    setChartParams(updatedParams);
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
            width={Math.round(windowDimensions.width * 0.8)}
            height={Math.round(windowDimensions.width * 0.8 * 0.25)}
            data={chartData}
            dataKeyName={'p/l %'}
            maxTicks={5}
          />
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
        <Grid item>
          <Paper className={classes.formControlWrapper}>
            {flattenedColDefs.map((fd) => (
              <FormControl key={fd.field} className={classes.formControl}>
                <Select
                  value={chartParams[fd.flatField]}
                  onChange={(e) => {
                    const fieldName = fd.flatField;
                    const updatedChartParams = {
                      ...chartParams,
                      [fieldName]: e.target.value,
                    };
                    setChartParams(updatedChartParams);
                  }}
                >
                  {fd.choices.map((val, index) => (
                    <MenuItem key={index} value={val}>
                      {isNullOrUndefined(val) ? NONE : val}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{fd.headerName}</FormHelperText>
              </FormControl>
            ))}

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
        <Grid item xs={12}>
          <SimulationResultsTable
            height={400}
            selectionChanged={handleSimulationTableSelectionChanged}
          />
        </Grid>
      </Grid>
    </div>
  );
}

export default MainPage;
