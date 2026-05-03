import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import { useTranslation } from "react-i18next";
import styles from "./Report.module.css";

const API = import.meta.env.VITE_API_URL;

export default function Report() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(fmt(today));
  const [endDate, setEndDate] = useState(fmt(today));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  if (!token) return <Navigate to="/login" replace />;

  async function loadReport() {
    if (!startDate || !endDate) {
      setError(t("report.errorMissingDates"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/report?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.report_page}>
      <Header />

      <div className={styles.report_content}>
        <div className={styles.report_controls}>
          <button className={styles.report_back_btn} onClick={() => navigate(-1)}>
            ← {t("report.back")}
          </button>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.report_date_input}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.report_date_input}
          />
          <button className={styles.report_load_btn} onClick={loadReport} disabled={loading}>
            {loading ? t("report.loading") : t("report.loadButton")}
          </button>
        </div>

        {error && <div className={styles.report_error}>{error}</div>}

        {rows.length > 0 && (
          <div className={styles.report_table}>
            <div className={styles.table_header}>
              <span>{t("report.columns.courier")}</span>
              <span>{t("report.columns.totalOrders")}</span>
              <span>{t("report.columns.totalSum")}</span>
              <span>{t("report.columns.cash")}</span>
              <span>{t("report.columns.card")}</span>
              <span>{t("report.columns.wire")}</span>
              <span>{t("report.columns.totalItems")}</span>
            </div>
            {rows.map((row) => (
              <div className={styles.table_row} key={row.unit_id ?? "unassigned"}>
                <span>{row.unit_id === null ? t("report.nonCouriers") : row.unit_nickname}</span>
                <span>{row.total_orders}</span>
                <span>{Number(row.total_sum).toFixed(2)}</span>
                <span>{Number(row.total_cash_sum).toFixed(2)}</span>
                <span>{Number(row.total_card_sum).toFixed(2)}</span>
                <span>{Number(row.total_wire_sum).toFixed(2)}</span>
                <span>{row.total_items}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
          <div className={styles.report_empty}>{t("report.empty")}</div>
        )}
      </div>
    </div>
  );
}
