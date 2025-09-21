import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Map from "./map.jsx";
import "./index.css";
import OrderPanel from "./orderPanel.jsx";
import CreateOrder from "./CreateOrder.jsx";
import Login from "./pages/login.jsx";
import Registration from "./pages/registration.jsx";
import { ThemeProvider } from "./provider/ThemeContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <ThemeProvider>
            <Routes>
                {/* публичные страницы */}
                <Route path="/" element={<App />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registration" element={<Registration />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* защищённые маршруты */}
                <Route
                    path="/map"
                    element={
                        <ProtectedRoute roles={["owner", "admin"]}>
                            <Map />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orderPanel"
                    element={
                        <ProtectedRoute roles={["owner", "admin"]}>
                            <OrderPanel />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/createOrder"
                    element={
                        <ProtectedRoute roles={["owner", "admin"]}>
                            <CreateOrder />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </ThemeProvider>
    </BrowserRouter>
);
