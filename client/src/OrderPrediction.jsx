import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./OrderPrediction.css"

const OrderPrediction = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPredictions = async () => {
      try {

        const response = await fetch(`${import.meta.env.VITE_PREDICTIONS}?company_id=${parseInt(localStorage.getItem('companyId'))}`, {
          method: 'GET'
        });

        const result = await response.json();

        if (result.status === 'success') {
          setForecast(result);
        } else {
          throw new Error(result.message || 'API error');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  if (loading) return <div className="owner-empty">Loading forecast...</div>;
  if (error) return <div className="owner-empty" style={{color: '#ef4444'}}>Error: {error}</div>;
  if (!forecast) return null;

  return (
    
    <div className="prediction-page">
        <header className="header">
            <div className="header-left">
            <button className="back-btn" onClick={() => navigate("/orderPanel")}>
                <ArrowLeft size={20} /> {t("createOrder.back")}
            </button>

            <div className="page-title">
                <h1>{t("orderPrediction.title")}</h1>
                <p>{t("orderPrediction.subtitle")}</p>
            </div>
            </div>
      </header>
      <div className='table-container'>
        <div className='orders-table'>
        {/* HEADER: Inline style overrides the 9-column grid to a 3-column grid */}
            <div className="table-header" style={{ gridTemplateColumns: '200px 200px 1fr' }}>
                <div className="header-cell">{t("orderPrediction.timeslot")}</div>
                <div className="header-cell">{t("orderPrediction.weather")}</div>
                <div className="header-cell">{t("orderPrediction.orders")}</div>
            </div>

            <div className="table-body">
                {forecast.predictions.map((slot) => (
                <div 
                    key={slot.hour} 
                    className="table-row row-clickable" 
                    style={{ gridTemplateColumns: '200px 200px 1fr' }}
                >
                    {/* Time */}
                    <div className="cell time-cell">
                    <div className="time-info">
                        <span className="time">{formatHour(slot.hour)}</span>
                        <span className="time-duration">{forecast.date}</span>
                    </div>
                    </div>

                    {/* Weather */}
                    <div className="cell">
                    {/* Reusing your status badge classes for colors */}
                    <span className={`status-badge ${slot.temperature > 15 ? 'status-ready' : 'status-inprogress'}`}>
                        {slot.temperature}°C
                    </span>
                    </div>

                    {/* Prediction */}
                    <div className="cell amount-cell" style={{ justifyContent: 'flex-start' }}>
                    <span className="amount" style={{ fontSize: '18px' }}>
                        {slot.predicted_orders}
                    </span>
                    <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '12px' }}>{t("orderPrediction.orders_exp")}</span>
                    </div>
                </div>
                ))}

                {forecast.predictions.length === 0 && (
                <div className="owner-empty">No prediction data available for today.</div>
                )}
            </div>
        </div>
        </div>
    </div>
  );
};

export default OrderPrediction;