import React from "react";
import { Clock } from "lucide-react";

// Секция «Заметки» формы создания заказа.
const NotesSection = ({ t, formData, handleInputChange }) => {
  return (
    <div className="form-section full-width">
      <div className="section-header">
        <Clock size={20} />
        <h3>{t("createOrder.sections.notes")}</h3>
      </div>

      <div className="form-group">
        <label htmlFor="notes">{t("createOrder.fields.notes")}</label>
        <textarea
          id="notes"
          rows="3"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          placeholder={t("createOrder.placeholders.notes")}
        />
      </div>
    </div>
  );
};

export default NotesSection;
