import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import MainPage from './components/MainPage';
import history from './history';

function App() {
  return (
    <Router history={history}>
      <Switch>
        <Route path="/" component={MainPage} />
      </Switch>
    </Router>
  );
}

export default App;
