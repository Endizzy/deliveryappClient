import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Orders from './orders.jsx';
import Map from './map.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/map" element={<Map />} />
        </Routes>
    </BrowserRouter>
);
