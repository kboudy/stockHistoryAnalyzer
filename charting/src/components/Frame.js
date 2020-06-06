import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import AppBar from '@material-ui/core/AppBar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Grid from '@material-ui/core/Grid';
import TodayIcon from '@material-ui/icons/Today';
import MoneyIcon from '@material-ui/icons/Money';
import ExploreIcon from '@material-ui/icons/Explore';
import history from '../history';

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: '30px',
  },
  appBarSpacer: theme.mixins.toolbar,
}));

function Frame(props) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <AppBar position="fixed" style={{ backgroundColor: '#111' }}>
        <Toolbar>
          <Grid container justify="flex-start" alignItems="center">
            <Grid item>
              <Tooltip title={'Current day job'}>
                <IconButton onClick={(e) => history.push('/currentDay')}>
                  <TodayIcon style={{ color: '#fff' }}></TodayIcon>
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title={'Paper trading'}>
                <IconButton onClick={(e) => history.push('/paperTrading')}>
                  <MoneyIcon style={{ color: '#fff' }}></MoneyIcon>
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item>
              <Tooltip title={'Explore results'}>
                <IconButton onClick={(e) => history.push('/')}>
                  <ExploreIcon style={{ color: '#fff' }}></ExploreIcon>
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <div className={classes.appBarSpacer} />
      {props.children}
    </div>
  );
}

export default Frame;
