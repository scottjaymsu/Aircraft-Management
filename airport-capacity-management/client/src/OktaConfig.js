// OktaConfig.js
import { OktaAuth } from "@okta/okta-auth-js";

const oktaAuth = new OktaAuth({
  issuer: "https://dev-15070527.okta.com/oauth2/default",
  clientId: "0oan9d3xxcgFazKZl5d7",
  redirectUri: window.location.origin + "/login/callback", 
  scopes: ["openid", "profile", "email"],
  pkce: true,
  tokenManager: {
    storage: "localStorage"
  }
});

export default oktaAuth;
