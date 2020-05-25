import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import CurrentDay from './components/pages/CurrentDay';
import Explore from './components/pages/Explore';
import history from './history';

function App() {
  return (
    <Router history={history}>
      <Switch>
        <Route path="/" exact component={Explore} />
        <Route path="/currentDay" exact component={CurrentDay} />
      </Switch>
    </Router>
  );
}

export default App;
