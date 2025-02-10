import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import BatchFile from './pages/BatchFile'; 
import Home from './pages/Home'; 
import RecEngine from './pages/RecEngine'; 


function App() {
  return (
    <BrowserRouter> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/batch" element={<BatchFile />} />
          <Route path="/rec/:iata_code" element={<RecEngine />} />
        </Routes>
    </BrowserRouter> 
  );}

export default App;
