import React from "react";
import { User, Phone, Truck, Eraser } from "lucide-react";
import { formatPhoneNumber } from "../../utils/phone.js";

// Секция «Данные клиента + доставка» формы создания заказа.
const CustomerSection = ({
  t,
  formData,
  errors,
  handleInputChange,
  phoneLookupState,
  customerLookupData,
  showApplyDataButton,
  applyFoundCustomerData,
  clearCustomerFields,
  couriers,
  minDate,
  minTimeToday,
  preorderMinOffset,
}) => {
  return (
    <div className="form-section">
      {/* <div className="section-header customer-section-header"> */}
      <div className="section-header">
        <User size={20} />
        <h3>{t("createOrder.sections.customerInfo")}</h3>
      </div>

      <button
        type="button"
        className="btn-primary customer-clear-btn"
        onClick={clearCustomerFields}
      >
        <Eraser size={16} />
        {t("createOrder.buttons.clearCustomer")}
      </button>
      {/* </div> */}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">{t("createOrder.fields.phone")} *</label>
          <div className="input-with-icon">
            <Phone size={16} />
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                handleInputChange("phone", formatPhoneNumber(e.target.value))
              }
              className={errors.phone ? "error" : ""}
              placeholder={t("createOrder.placeholders.phone")}
            />
          </div>

          {errors.phone && <span className="error-text">{errors.phone}</span>}

          {!errors.phone && phoneLookupState === "loading" && (
            <span className="hint muted">Ищем прошлый заказ клиента…</span>
          )}

          {!errors.phone && phoneLookupState === "found" && (
            <div
              className="hint muted"
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={{ backgroundColor: "#22C55E", borderRadius: 20, padding: "4px 8px", fontSize: 10, border: "1px solid #16A34A " }}>{t("createOrder.customerFound")}</span>

              {showApplyDataButton && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={applyFoundCustomerData}
                >
                  {t("createOrder.buttons.fillCustomer")}
                </button>
              )}
            </div>
          )}

          {!errors.phone &&
            phoneLookupState === "found" &&
            customerLookupData?.notes && (
              <div className="hint muted" style={{ marginTop: 6 }}>
                Последняя заметка: {customerLookupData.notes}
              </div>
            )}

          {!errors.phone && phoneLookupState === "not_found" && (
            <span className="hint muted">Клиент с таким номером не найден.</span>
          )}

          {!errors.phone && phoneLookupState === "error" && (
            <span className="error-text">
              Не удалось выполнить поиск клиента.
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="customer">{t("createOrder.fields.customer")} *</label>
          <input
            id="customer"
            type="text"
            value={formData.customer}
            onChange={(e) => handleInputChange("customer", e.target.value)}
            className={errors.customer ? "error" : ""}
            placeholder={t("createOrder.placeholders.customer")}
          />
          {errors.customer && (
            <span className="error-text">{errors.customer}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="street">{t("createOrder.fields.street")}</label>
          <input
            id="street"
            value={formData.street}
            onChange={(e) => handleInputChange("street", e.target.value)}
            placeholder={t("createOrder.placeholders.street")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="house">{t("createOrder.fields.house")}</label>
          <input
            id="house"
            value={formData.house}
            onChange={(e) => handleInputChange("house", e.target.value)}
            placeholder={t("createOrder.placeholders.house")}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="building">{t("createOrder.fields.building")}</label>
          <input
            id="building"
            value={formData.building}
            onChange={(e) => handleInputChange("building", e.target.value)}
            placeholder={t("createOrder.placeholders.building")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="apart">{t("createOrder.fields.apart")}</label>
          <input
            id="apart"
            value={formData.apart}
            onChange={(e) => handleInputChange("apart", e.target.value)}
            placeholder={t("createOrder.placeholders.apart")}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="floor">{t("createOrder.fields.floor")}</label>
          <input
            id="floor"
            value={formData.floor}
            onChange={(e) => handleInputChange("floor", e.target.value)}
            placeholder={t("createOrder.placeholders.floor")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="code">{t("createOrder.fields.code")}</label>
          <input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange("code", e.target.value)}
            placeholder={t("createOrder.placeholders.code")}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="numOfPeople">
            {t("createOrder.fields.numOfPeople")}
          </label>
          <input
            id="numOfPeople"
            value={formData.numOfPeople}
            onChange={(e) => handleInputChange("numOfPeople", e.target.value)}
            placeholder={t("createOrder.placeholders.numOfPeople")}
          />
        </div>
      </div>

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
        {errors.courier && (
          <span className="error-text">{errors.courier}</span>
        )}
      </div>

      <div className="form-group">
        <label>{t("createOrder.fields.orderType")}</label>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="orderType"
              value="active"
              checked={formData.orderType === "active"}
              onChange={(e) => handleInputChange("orderType", e.target.value)}
            />
            <span>{t("createOrder.orderType.active")}</span>
          </label>

          <label className="radio-option">
            <input
              type="radio"
              name="orderType"
              value="preorder"
              checked={formData.orderType === "preorder"}
              onChange={(e) => handleInputChange("orderType", e.target.value)}
            />
            <span>{t("createOrder.orderType.preorder")}</span>
          </label>
        </div>
      </div>

      {formData.orderType === "preorder" && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scheduledDate">
                {t("createOrder.fields.scheduledDate")} *
              </label>
              <input
                id="scheduledDate"
                type="date"
                min={minDate}
                value={formData.scheduledDate}
                onChange={(e) =>
                  handleInputChange("scheduledDate", e.target.value)
                }
                className={errors.scheduledDate ? "error" : ""}
              />
              {errors.scheduledDate && (
                <span className="error-text">{errors.scheduledDate}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="scheduledTime">
                {t("createOrder.fields.scheduledTime")} *
              </label>
              <input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) =>
                  handleInputChange("scheduledTime", e.target.value)
                }
                className={errors.scheduledTime ? "error" : ""}
                min={formData.scheduledDate === minDate ? minTimeToday : undefined}
              />
              {errors.scheduledTime && (
                <span className="error-text">{errors.scheduledTime}</span>
              )}
            </div>
          </div>

          <div className="hint muted" style={{ marginTop: 4 }}>
            {t("createOrder.preorderHint", {
              min: preorderMinOffset,
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerSection;
