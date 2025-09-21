import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const decoded = jwtDecode(token); // { userId, role, exp }
        const isExpired = decoded.exp * 1000 < Date.now();

        if (isExpired) {
            localStorage.removeItem("token");
            return <Navigate to="/login" replace />;
        }

        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            return <Navigate to="/unauthorized" replace />;
        }

        return children;
    } catch (err) {
        console.error("Ошибка при проверке токена:", err);
        localStorage.removeItem("token");
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
