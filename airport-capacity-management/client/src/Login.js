import React from "react";
import { useOktaAuth } from "@okta/okta-react";
import "./Login.css";
import logo from "./resources/netjets-logo.png";

function LoginPage() {
  const { oktaAuth } = useOktaAuth();

  if (!oktaAuth) {
    return <p>Failure with Okta Auth.</p>;
  }

  const login = async () => {
    await oktaAuth.signInWithRedirect({ originalUri: "/map" });
  };

  return (
    <div className="login-container">
      <img src={logo} alt="NetJets Logo" className="logo" />
      <button onClick={login}>Login with Okta</button>
    </div>
  );
}

export default LoginPage;
