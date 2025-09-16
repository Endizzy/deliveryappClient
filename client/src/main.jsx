import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Map from './map.jsx';
import './index.css';
import OrderPanel from "./orderPanel.jsx";
import CreateOrder from "./CreateOrder.jsx";
import Login from "./pages/Login.jsx";
import Registration from "./pages/Registration.jsx";
import {ThemeProvider} from "./provider/ThemeContext.jsx";

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <ThemeProvider>
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/map" element={<Map />} />
                <Route path="/orderPanel" element={<OrderPanel />} />
                <Route path="/CreateOrder" element={<CreateOrder />}/>
                <Route path="/login" element={<Login />} />
                <Route path="/registration" element={<Registration />} />
            </Routes>
        </ThemeProvider>
    </BrowserRouter>
);
