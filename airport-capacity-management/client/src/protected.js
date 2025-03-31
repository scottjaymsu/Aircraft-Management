import React from "react";
import { useOktaAuth } from "@okta/okta-react";

function ProtectedPage() {
  const { oktaAuth } = useOktaAuth();

  const logout = async () => {
    await oktaAuth.signOut();
  };

  return (
    <div>
      <h1>Protected Page</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default ProtectedPage;
