import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Map from "./map.jsx";
import "./index.css";
import OrderPanel from "./orderPanel.jsx";
import CreateOrder from "./CreateOrder.jsx";
import OwnerSettings from "./pages/OwnerSettings.jsx";
import UserProfile from "./pages/userProfile.jsx";
import Login from "./pages/login.jsx";
import Registration from "./pages/registration.jsx";
import { ThemeProvider } from "./provider/ThemeContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import EditOrder from "./EditOrder";

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <ThemeProvider>
            <Routes>
                {/* общедоступные */}
                <Route path="/" element={<App />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registration" element={<Registration />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* только для owner */}
                <Route
                    path="/ownerSettings"
                    element={
                        <ProtectedRoute allowedRoles={["owner"]}>
                            <OwnerSettings />
                        </ProtectedRoute>
                    }
                />

                {/* только для owner и admin */}
                <Route
                    path="/map"
                    element={
                        <ProtectedRoute allowedRoles={["owner", "admin"]}>
                            <Map />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/editOrder/:id"
                    element={
                        <ProtectedRoute allowedRoles={["owner", "admin"]}>
                            <EditOrder />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/userProfile"
                    element={
                        <ProtectedRoute allowedRoles={["owner", "admin"]}>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orderPanel"
                    element={
                        <ProtectedRoute allowedRoles={["owner", "admin"]}>
                            <OrderPanel />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/createOrder"
                    element={
                        <ProtectedRoute allowedRoles={["owner", "admin"]}>
                            <CreateOrder />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </ThemeProvider>
    </BrowserRouter>
);
