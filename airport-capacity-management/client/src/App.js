import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Switch,
  useHistory,
} from "react-router-dom";
import { Security, SecureRoute, LoginCallback } from "@okta/okta-react";

import oktaAuth from "./OktaConfig";
import LoginPage from "./Login";
import ProtectedPage from "./protected";
import BatchFile from './pages/BatchFile'; 
import RecEngine from './pages/RecEngine'; 
import SimulatorComponent from './pages/Simulator';
import MapComponent from './pages/Map';
import SummaryPage from './pages/SummaryPage';
import FBOPage from './pages/AddFBO';

function App() {
  const history = useHistory();

  const restoreOriginalUri = async (_oktaAuth, originalUri) => {
    history.replace(originalUri || "/protected");
  };

  return (
    <Router>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <Switch>
          {/* Default route - Show Login Page */}
          <Route exact path="/" component={LoginPage} />

          {/* Callback route - called after user is authenticated */}
          {/* <Route exact pat  h="/login/callback" component={LoginCallback} /> */}
          
          {/* Protected Route example page (requires authentication) - page visited after authentication */}
          <SecureRoute path="/protected" component={ProtectedPage} />
          <SecureRoute path="/map" component={MapComponent} />
          <SecureRoute path="/summary/:location" component={SummaryPage} />
          <SecureRoute path="/batch" component={BatchFile} />
          <SecureRoute path="/rec/:iata_code" component={RecEngine} />
          <SecureRoute path="/simulator/:airportCode" component={SimulatorComponent} />
          <SecureRoute path="/fbopage/:airportCode" component={FBOPage} />

          {/* Explicit Login Route */}
          <Route path="/login" component={LoginPage} />
        </Switch>
      </Security>
    </Router>
  );
}

export default App;

