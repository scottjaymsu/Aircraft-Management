import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useHistory,
} from "react-router-dom";
import { Security, SecureRoute, LoginCallback } from "@okta/okta-react";
import oktaAuth from "./OktaConfig";

import LoginPage from "./Login";
import ProtectedPage from "./protected";

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

          {/* Explicit Login Route */}
          <Route path="/login" component={LoginPage} />
        </Switch>
      </Security>
    </Router>
  );
}

export default App;
