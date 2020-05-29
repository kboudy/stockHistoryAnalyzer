import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import CurrentDay from './components/pages/CurrentDay';
import PaperTrading from './components/pages/PaperTrading';
import Explore from './components/pages/Explore';
import Frame from './components/Frame';
import history from './history';

function App() {
  return (
    <Router history={history}>
      <Switch>
        <Route
          path="/"
          exact
          render={() => (
            <Frame>
              <Explore />
            </Frame>
          )}
        />
        <Route
          path="/currentDay"
          exact
          render={() => (
            <Frame>
              <CurrentDay />
            </Frame>
          )}
        />
        <Route
          path="/paperTrading"
          exact
          render={() => (
            <Frame>
              <PaperTrading />
            </Frame>
          )}
        />
      </Switch>
    </Router>
  );
}

export default App;
