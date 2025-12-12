import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>403 – Доступ запрещён</h1>
            <p>У вас нет прав для просмотра этой страницы.</p>
            <button onClick={() => navigate("/")}>На главную</button>
        </div>
    );
};

export default Unauthorized;
