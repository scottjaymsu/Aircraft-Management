import React from "react";
import { useOktaAuth } from "@okta/okta-react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { authState } = useOktaAuth();
  const location = useLocation();

  if (!authState || !authState.isAuthenticated) {
    // Redirect to login if not authenticated, and pass along the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
