import React from "react";
import { Truck } from "lucide-react";

// Статусы заказа — только для редактирования (при создании заказ всегда новый)
const ORDER_STATUSES = ["new", "ready", "enroute", "completed", "cancelled"];

// Секция «Доставка»: стоимость доставки и назначенный курьер.
// Раньше жила внутри CustomerSection — вынесена отдельно, чтобы секция
// данных клиента отвечала только за клиента и тип заказа.
//
// showStatus включает выбор статуса заказа: он нужен только на странице
// редактирования, поэтому по умолчанию выключен.
const DeliverySection = ({
  t,
  formData,
  errors,
  handleInputChange,
  couriers,
  showStatus = false,
}) => {
  return (
    <div className="form-section">
      <div className="section-header">
        <Truck size={20} />
        <h3>{t("createOrder.sections.delivery")}</h3>
      </div>

      <div className="form-group">
        <label htmlFor="deliveryFee">
          {t("createOrder.fields.deliveryFee")} €
        </label>
        <input
          id="deliveryFee"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={formData.deliveryFee}
          onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
          placeholder={t("createOrder.placeholders.deliveryFee")}
        />
      </div>

      <div className="form-group">
        <label htmlFor="courier">{t("createOrder.fields.courier")} *</label>
        <select
          id="courier"
          value={formData.courierId}
          onChange={(e) => handleInputChange("courierId", e.target.value)}
          className={errors.courier ? "error" : ""}
        >
          <option value="">{t("createOrder.placeholders.courier")}</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname}
            </option>
          ))}
        </select>
        {errors.courier && <span className="error-text">{errors.courier}</span>}
      </div>

      {showStatus && (
        <div className="form-group">
          <label htmlFor="orderStatus">
            {t("createOrder.fields.status", { defaultValue: "Status" })}
          </label>
          <select
            id="orderStatus"
            value={formData.status}
            onChange={(e) => handleInputChange("status", e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default DeliverySection;
