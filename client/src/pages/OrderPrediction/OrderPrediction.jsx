import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import styles from "./OrderPrediction.module.css";

const OrderPrediction = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_PREDICTIONS}?company_id=${parseInt(
            localStorage.getItem("companyId"),
            10
          )}`,
          {
            method: "GET",
          }
        );

        const result = await response.json();

        if (result.status === "success") {
          setForecast(result);
        } else {
          throw new Error(result.message || "API error");
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
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  if (loading) {
    return <div className={styles.ownerEmpty}>Loading forecast...</div>;
  }

  if (error) {
    return (
      <div className={styles.ownerEmpty} style={{ color: "#ef4444" }}>
        Error: {error}
      </div>
    );
  }

  if (!forecast) return null;

  return (
    <div className={styles.predictionPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/orderPanel")}
            type="button"
          >
            <ArrowLeft size={20} /> {t("createOrder.back")}
          </button>

          <div className={styles.pageTitle}>
            <h1>{t("orderPrediction.title")}</h1>
            <p>{t("orderPrediction.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <div className={styles.ordersTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>
              {t("orderPrediction.timeslot")}
            </div>
            <div className={styles.headerCell}>
              {t("orderPrediction.weather")}
            </div>
            <div className={styles.headerCell}>
              {t("orderPrediction.orders")}
            </div>
          </div>

          <div className={styles.tableBody}>
            {forecast.predictions.map((slot) => (
              <div
                key={slot.hour}
                className={`${styles.tableRow} ${styles.rowClickable}`}
              >
                <div className={`${styles.cell} ${styles.timeCell}`}>
                  <div className={styles.timeInfo}>
                    <span className={styles.time}>{formatHour(slot.hour)}</span>
                    <span className={styles.timeDuration}>{forecast.date}</span>
                  </div>
                </div>

                <div className={styles.cell}>
                  <span
                    className={`${styles.statusBadge} ${
                      slot.temperature > 15
                        ? styles.statusReady
                        : styles.statusInprogress
                    }`}
                  >
                    {slot.temperature}°C
                  </span>
                </div>

                <div className={`${styles.cell} ${styles.amountCell}`}>
                  <span className={styles.amount}>{slot.predicted_orders}</span>
                  <span className={styles.ordersExp}>
                    {t("orderPrediction.orders_exp")}
                  </span>
                </div>
              </div>
            ))}

            {forecast.predictions.length === 0 && (
              <div className={styles.ownerEmpty}>
                No prediction data available for today.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPrediction;