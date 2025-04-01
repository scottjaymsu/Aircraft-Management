// App.js
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Security, LoginCallback } from "@okta/okta-react";
import oktaAuth from "./OktaConfig";
import LoginPage from "./Login";
import BatchFile from "./pages/BatchFile";
import RecEngine from "./pages/RecEngine";
import SimulatorComponent from "./pages/Simulator";
import MapComponent from "./pages/Map";
import SummaryPage from "./pages/SummaryPage";
import FBOPage from "./pages/AddFBO";
import ProtectedRoute from "./utils/ProtectedRoute"; 

// Wrapper to allow useNavigate in restoreOriginalUri
function AppWrapper() {
  const navigate = useNavigate();

  // called by Okta after a successful login
  const restoreOriginalUri = async (_oktaAuth, originalUri) => {
    navigate(originalUri || "/map", { replace: true });
  };

  return (
    <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<LoginPage />} />

        {/* Callback route */}
        <Route path="/login/callback" element={<LoginCallback />} />

        {/* Protected route using the custom ProtectedRoute */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapComponent />
            </ProtectedRoute>
          }
        />

        {/* Other protected routes */}
        <Route
          path="/summary/:location"
          element={
            <ProtectedRoute>
              <SummaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batch"
          element={
            <ProtectedRoute>
              <BatchFile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rec/:iata_code"
          element={
            <ProtectedRoute>
              <RecEngine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulator/:airportCode"
          element={
            <ProtectedRoute>
              <SimulatorComponent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fbopage/:airportCode"
          element={
            <ProtectedRoute>
              <FBOPage />
            </ProtectedRoute>
          }
        />

        {/* Explicit login route */}
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Security>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
