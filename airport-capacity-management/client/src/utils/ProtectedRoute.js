import React from "react";
import { useOktaAuth } from "@okta/okta-react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { authState } = useOktaAuth();

  if (!authState || authState.isPending) {
    return <div>Loading...</div>;
  }

  return authState.isAuthenticated ? children : <Navigate to="/login" />;
};


export default ProtectedRoute;
