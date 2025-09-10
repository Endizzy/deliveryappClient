import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function App() {
    const navigate = useNavigate();

    return (
        <div>
            <header style={{ background: "black", padding: "2%" }}>
                <h1 style={{ fontSize: "20px", display: "Flex", justifyContent: "center", color: "White" }}>
                    Добро пожаловать в приложение!
                </h1>
            </header>
            <div style={{ padding:'2%', display: "flex", justifyContent: "center", gap: "20px" }}>
                <button
                    style={{ padding: "10px", minWidth: "140px", borderRadius: "5px", border: "2px solid black" }}
                    onClick={() => navigate('/orderPanel')}
                >
                    <h1 style={{ fontSize: "20px" }}>Панель заказов</h1>
                </button>
                <button
                    style={{ padding: "10px", minWidth: "140px", borderRadius: "5px", border: "2px solid black" }}
                    onClick={() => navigate('/map')}
                >
                    <h1 style={{ fontSize: "20px" }}>Карта</h1>
                </button>
            </div>
        </div>
    );
}
