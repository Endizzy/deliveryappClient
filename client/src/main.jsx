import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Map from "./pages/Map/map.jsx";
import "./index.css";
import OrderPanel from "./orderPanel.jsx";
import CreateOrder from "./CreateOrder.jsx";
import OwnerSettings from "./pages/OwnerSettings/OwnerSettings.jsx";
import UserProfile from "./pages/UserProfile/userProfile.jsx";
import Login from "./pages/Login/login.jsx";
import Registration from "./pages/Registration/registration.jsx";
import { ThemeProvider } from "./provider/ThemeContext.jsx";
import NotificationProvider from "./provider/NotificationProvider.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import Unauthorized from "./pages/UnAuthorized/Unauthorized.jsx";
import EditOrder from "./EditOrder";
import './i18n';
import { SoundProvider } from "./provider/SoundContext.jsx";
import { TimeCounterProvider } from "./provider/TimeContext.jsx";

createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <NotificationProvider>
            <SoundProvider>
                <TimeCounterProvider>
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
                </TimeCounterProvider>
            </SoundProvider>
        </NotificationProvider>
    </BrowserRouter>
);
