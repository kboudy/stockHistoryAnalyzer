import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import LinkIcon from '@material-ui/icons/Link';
import Dialog from '@material-ui/core/Dialog';
import ListItem from '@material-ui/core/ListItem';
import List from '@material-ui/core/List';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import InfoIcon from '@material-ui/icons/Info';
import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import queryString from 'query-string';

import _ from 'lodash';
import Grid from '@material-ui/core/Grid';
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
  buttonRow: { marginTop: theme.spacing(1) },
  chartTool: { marginLeft: theme.spacing(2) },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  title: { flexGrow: 1 },
  appBarSpacer: theme.mixins.toolbar,
  addChartGrid: { padding: theme.spacing(3) },
  chartGridWrapper: { padding: theme.spacing(2) },
}));

function MainPage(props) {
  const classes = useStyles();
  const [infoAnchorEl, setInfoAnchorEl] = React.useState(null);

  useEffect(() => {
    (async () => {
      const symbols = (await nodeServer.get('availableSymbols')).data;
      debugger;
    })();
  }, []);

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
    </div>
  );
}

export default MainPage;
