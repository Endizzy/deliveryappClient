import React from "react";
import { User, Phone, Eraser, MapPin } from "lucide-react";
import { formatPhoneInput } from "../../utils/phone.js";
import TimeSelect24 from "./TimeSelect24.jsx";
import { formatAddressLabel, isSameAddress } from "../../utils/addressLabel.js";

// Секция «Данные клиента»: контакты, адрес и — последним пунктом — тип заказа
// (текущий / предзаказ) вместе с датой и временем предзаказа.
// Стоимость доставки и курьер вынесены в DeliverySection.jsx.
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
  customerAddresses = [],
  onPickAddress,
  minDate,
  minTimeToday,
  preorderMinOffset,
}) => {
  const hasAddresses = customerAddresses.length > 0 && !!onPickAddress;
  const customerFound = !errors.phone && phoneLookupState === "found";

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
            {/* Приём заказа всегда начинается с телефона: ставим курсор сюда
                сразу при открытии формы, чтобы диспетчер начинал набирать
                номер, не беря мышь. */}
            <input
              id="phone"
              type="tel"
              autoFocus
              value={formData.phone}
              onChange={(e) =>
                handleInputChange("phone", formatPhoneInput(e.target.value))
              }
              className={errors.phone ? "error" : ""}
              placeholder={t("createOrder.placeholders.phone")}
            />
          </div>

          {errors.phone && <span className="error-text">{errors.phone}</span>}

          {!errors.phone && phoneLookupState === "loading" && (
            <span className="hint muted">Ищем прошлый заказ клиента…</span>
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

      {/* Прошлые адреса клиента: клик подставляет улицу, дом, корпус, квартиру, этаж и код */}
      {(hasAddresses || customerFound) && (
        <div className="co-addr-chips" role="group" aria-label={t("createOrder.addresses.title", { defaultValue: "Адреса клиента" })}>
          <div className="co-addr-chips-title">
            {hasAddresses && (
              <>
                <MapPin size={14} aria-hidden="true" />
                {t("createOrder.addresses.title", { defaultValue: "Адреса клиента" })} ({customerAddresses.length})
              </>
            )}
            {customerFound && (
              <span className="co-addr-found">{t("createOrder.customerFound")}</span>
            )}
          </div>
          {hasAddresses && (
          <div className="co-addr-chips-list">
            {customerAddresses.map((a) => {
              const label = formatAddressLabel(a);
              const details = [
                a.floor && `${t("createOrder.fields.floor")}: ${a.floor}`,
                a.code && `${t("createOrder.fields.code")}: ${a.code}`,
                t("createOrder.addresses.usedTimes", {
                  n: a.count,
                  defaultValue: "Заказов по этому адресу: {{n}}",
                }),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={`${a.street}|${a.house}|${a.building}|${a.apart}`}
                  type="button"
                  className={`co-addr-chip${isSameAddress(a, formData) ? " is-active" : ""}`}
                  title={details}
                  onClick={() => onPickAddress(a)}
                >
                  <span className="co-addr-chip-label">{label}</span>
                  <span className="co-addr-chip-count">{a.count}×</span>
                </button>
              );
            })}
          </div>
          )}
        </div>
      )}

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

      {/* Тип заказа — последний пункт секции: доставка и позиции ниже
          зависят от того, текущий это заказ или предзаказ. */}
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
              {/* 24-часовой формат независимо от локали браузера (см. TimeSelect24) */}
              <TimeSelect24
                id="scheduledTime"
                value={formData.scheduledTime}
                onChange={(v) => handleInputChange("scheduledTime", v)}
                className={errors.scheduledTime ? "error" : ""}
                min={formData.scheduledDate === minDate ? minTimeToday : undefined}
                hourLabel={t("createOrder.time.hours", { defaultValue: "Часы" })}
                minuteLabel={t("createOrder.time.minutes", { defaultValue: "Минуты" })}
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
