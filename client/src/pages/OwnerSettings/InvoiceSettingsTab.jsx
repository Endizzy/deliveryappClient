import React, { useEffect, useState } from "react";
import { Save, FileText, Mail, MessageSquare, Building2, Globe, Phone } from "lucide-react";
import styles from "../InvoiceSettings/InvoiceSettings.module.css";
import InvoiceTemplate from "../InvoiceSettings/InvoiceTemplate.jsx";

// Настройка накладной как вкладка OwnerSettings (форма слева + превью справа).
export default function InvoiceSettingsTab({ API, authHeaders, t }) {
  const [invoiceSettings, setInvoiceSettings] = useState({
    companyName: "BENTO SUSHI",
    regNumber: "20405660",
    email: "info@bentosushi.lv",
    website: "www.bentosushi.lv",
    footerMessage: "Paldies par pasūtījumu!",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/invoice-settings`, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.settings) setInvoiceSettings(data.settings);
        }
      } catch {
        // оставляем значения по умолчанию
      }
    })();
  }, [API, authHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/invoice-settings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(invoiceSettings),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("invoiceSettings.errors.saveFailed", { defaultValue: "Ошибка сохранения настроек" }));
      }
      alert(t("invoiceSettings.saved", { defaultValue: "Настройки накладной сохранены успешно!" }));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) =>
    setInvoiceSettings((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={styles.layout}>
      {/* Левая панель — форма настроек */}
      <section className={`owner-card ${styles.settingsPanel}`}>
        <div className="owner-card-header">
          <div className="owner-card-title">{t("invoiceSettings.main.invoiceEdit")}</div>
          <button className="owner-primary-btn" onClick={handleSave} disabled={saving}>
            <Save size={16} />{" "}
            {saving ? t("invoiceSettings.actions.save") : t("invoiceSettings.buttons.save")}
          </button>
        </div>

        <div className={styles.form}>
          <div className="owner-field">
            <label>
              <Building2 size={14} style={{ verticalAlign: "middle" }} />{" "}
              {t("invoiceSettings.settings.companyName")}
            </label>
            <input
              value={invoiceSettings.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              placeholder="COMPANY NAME"
            />
          </div>

          <div className="owner-field">
            <label>
              <Phone size={14} style={{ verticalAlign: "middle" }} />{" "}
              {t("invoiceSettings.settings.companyPhone")}
            </label>
            <input
              value={invoiceSettings.regNumber}
              onChange={(e) => updateField("regNumber", e.target.value)}
              placeholder="20202030"
            />
          </div>

          <div className="owner-field">
            <label>
              <Mail size={14} style={{ verticalAlign: "middle" }} />{" "}
              {t("invoiceSettings.settings.companyEmail")}
            </label>
            <input
              type="email"
              value={invoiceSettings.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="info@website.lv"
            />
          </div>

          <div className="owner-field">
            <label>
              <Globe size={14} style={{ verticalAlign: "middle" }} />{" "}
              {t("invoiceSettings.settings.companyWebsite")}
            </label>
            <input
              type="url"
              value={invoiceSettings.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="www.website.lv"
            />
          </div>

          <div className="owner-field">
            <label>
              <MessageSquare size={14} style={{ verticalAlign: "middle" }} />{" "}
              {t("invoiceSettings.settings.footerNote")}
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
                resize: "vertical",
              }}
            />
          </div>

          <div className={styles.infoBox}>
            <p>
              <strong>{t("invoiceSettings.hint.title")}</strong>{" "}
              {t("invoiceSettings.hint.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Правая панель — превью накладной */}
      <section className={`owner-card ${styles.previewPanel}`}>
        <div className="owner-card-header">
          <div className="owner-card-title">
            <FileText size={18} /> {t("invoiceSettings.main.invoicePreview")}
          </div>
        </div>

        <div className={styles.previewContainer}>
          <InvoiceTemplate settings={invoiceSettings} />
        </div>
      </section>
    </div>
  );
}
