import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileText, Mail, MessageSquare, Building2, Globe, Phone } from "lucide-react";
import styles from "./InvoiceSettings.module.css";
import Header from "../../components/Header/Header.jsx";
import InvoiceTemplate from "./InvoiceTemplate.jsx";
import { useTranslation } from "react-i18next";

export default function InvoiceSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Настройки накладной
  const [invoiceSettings, setInvoiceSettings] = useState({
    companyName: "BENTO SUSHI",
    regNumber: "20405660",
    email: "info@bentosushi.lv",
    website: "www.bentosushi.lv",
    footerMessage: "Paldies par pasūtījumu!"
  });

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchProfile = async () => {
    const res = await fetch(`${API}/user/me`, { headers: authHeaders });
    if (res.status === 401) throw new Error("unauthorized");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Ошибка загрузки профиля");
    setUser(data.user);
  };

  const fetchInvoiceSettings = async () => {
    try {
      const res = await fetch(`${API}/invoice-settings`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.settings) {
          setInvoiceSettings(data.settings);
        }
      }
    } catch (e) {
      console.log("Настройки накладной не загружены, используем значения по умолчанию");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        await fetchProfile();
        await fetchInvoiceSettings();
      } catch (e) {
        if (String(e.message) === "unauthorized") {
          setError("Не авторизован");
          navigate("/login");
          return;
        }
        setError(e.message || "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]); // eslint-disable-line

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/invoice-settings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(invoiceSettings)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Ошибка сохранения настроек");
      }
      alert("Настройки накладной сохранены успешно!");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setInvoiceSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="owner-page">
        <div className="owner-content">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-page">
        <div className="owner-content">Ошибка: {error}</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="owner-page">
      <Header user={user} />

      <nav className="owner-tabs">
        <strong className="owner-title">
          <FileText size={20} style={{ verticalAlign: "middle", marginRight: "8px" }} />
          Настройки накладной
        </strong>
      </nav>

      <div className="owner-content">
        <div className={styles.layout}>
          {/* Левая панель - форма настроек */}
          <section className={`owner-card ${styles.settingsPanel}`}>
            <div className="owner-card-header">
              <div className="owner-card-title">
               Редактирование накладной
              </div>
              <button
                className="owner-primary-btn"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} /> {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>

            <div className={styles.form}>
              <div className="owner-field">
                <label>
                  <Building2 size={14} style={{ verticalAlign: "middle" }} /> Название компании
                </label>
                <input
                  value={invoiceSettings.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  placeholder="BENTO SUSHI"
                />
              </div>

              <div className="owner-field">
                <label>
                  <Phone size={14} style={{ verticalAlign: "middle" }} /> Номер телефона
                </label>
                <input
                  value={invoiceSettings.regNumber}
                  onChange={(e) => updateField("regNumber", e.target.value)}
                  placeholder="20405660"
                />
              </div>

              <div className="owner-field">
                <label>
                  <Mail size={14} style={{ verticalAlign: "middle" }} /> Email
                </label>
                <input
                  type="email"
                  value={invoiceSettings.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="info@bentosushi.lv"
                />
              </div>

              <div className="owner-field">
                <label>
                  <Globe size={14} style={{ verticalAlign: "middle" }} /> Website
                </label>
                <input
                  type="url"
                  value={invoiceSettings.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="www.bentosushi.lv"
                />
              </div>

              <div className="owner-field">
                <label>
                  <MessageSquare size={14} style={{ verticalAlign: "middle" }} /> Сообщение внизу накладной
                </label>
                <textarea
                  value={invoiceSettings.footerMessage}
                  onChange={(e) => updateField("footerMessage", e.target.value)}
                  placeholder="Paldies par pasūtījumu!"
                  rows="3"
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#334155",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              <div className={styles.infoBox}>
                <p><strong>Подсказка:</strong> Эти настройки будут использоваться при печати накладных для всех заказов. Информация о клиенте и товарах будет подставляться автоматически.</p>
              </div>
            </div>
          </section>

          {/* Правая панель - превью накладной */}
          <section className={`owner-card ${styles.previewPanel}`}>
            <div className="owner-card-header">
              <div className="owner-card-title">
                <FileText size={18} /> Превью накладной (A4)
              </div>
            </div>

            <div className={styles.previewContainer}>
              <InvoiceTemplate settings={invoiceSettings} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}