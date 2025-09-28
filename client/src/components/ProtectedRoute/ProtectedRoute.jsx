// client/src/components/ProtectedRoute/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem("token");

    if (!token) {
        // если токена нет → редирект на login
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token);

        // проверяем истечение токена
        if (decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            return <Navigate to="/login" replace />;
        }

        // проверяем роль
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            return <Navigate to="/unauthorized" replace />;
        }

        return children;
    } catch (err) {
        console.error("Ошибка при декодировании токена:", err);
        localStorage.removeItem("token");
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
