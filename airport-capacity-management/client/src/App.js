import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import BatchFile from './pages/BatchFile'; 
import RecEngine from './pages/RecEngine'; 
import SimulatorComponent from './pages/Simulator';
import MapComponent from './pages/Map';
import SummaryPage from './pages/SummaryPage';
import FBOPage from './pages/AddFBO';
import EditFBO from './pages/EditFBO';



function App() {
  return (
    <BrowserRouter> 
        <Routes>
          <Route path="/" element={<MapComponent />} />
          <Route path="/summary/:location" element={<SummaryPage/>} />
          <Route path="/batch" element={<BatchFile />} />
          <Route path="/rec/:iata_code" element={<RecEngine />} />
          <Route path="/simulator/:airportCode" element={<SimulatorComponent />} />
          <Route path="/fbopage/:airportCode" element = {<FBOPage/>} />
          <Route path="/editFBO/:airportCode/:fboId" element={<EditFBO />} />
  
        </Routes>
    </BrowserRouter> 
  );}

export default App;

