import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Trash2, ChevronDown, Plus } from "lucide-react";
import { formatAddressLabel, isSameAddress } from "../../utils/addressLabel.js";

// Список прошлых адресов клиента (под полями «Телефон / Клиент»).
// Клик по строке подставляет адрес в форму; выбранный (совпадает с полями) отмечен.
// Кнопка «Добавить новый адрес» (onNew) очищает поля адреса в форме.
// Кнопка «Удалить адрес» пока заглушка: показывает сообщение и ничего не удаляет.
const VISIBLE = 3;

const LOCALES = { ru: "ru-RU", lv: "lv-LV", en: "en-GB" };

function formatDate(value, lang) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(LOCALES[String(lang || "").slice(0, 2)] || "ru-RU", {
    day: "numeric",
    month: "short",
  });
}

const CustomerAddressList = ({ addresses = [], formData, onPick, onNew }) => {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  if (!addresses.length) return null;

  const shown = expanded ? addresses : addresses.slice(0, VISIBLE);
  const hidden = addresses.length - shown.length;

  // Заглушка: адрес не удаляется
  const onDelete = () => {
    setNotice(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(false), 3500);
  };

  return (
    <div className="co-addr-list-wrap">
      <div className="co-addr-list" role="radiogroup">
        {shown.map((a, i) => {
          const on = isSameAddress(a, formData);
          const details = [
            a.floor && `${t("createOrder.fields.floor")}: ${a.floor}`,
            a.code && `${t("createOrder.fields.code")}: ${a.code}`,
          ]
            .filter(Boolean)
            .join(" · ");
          const date = formatDate(a.lastAt, i18n.language);
          return (
            <div
              key={`${a.street}|${a.house}|${a.building}|${a.apart}`}
              className={`co-addr-row${on ? " is-active" : ""}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                className="co-addr-row-main"
                onClick={() => onPick(a)}
              >
                <span className="co-addr-radio" aria-hidden="true">
                  {on && <i />}
                </span>
                <span className="co-addr-row-text">
                  <span className="co-addr-row-title">
                    {formatAddressLabel(a)}
                    {i === 0 && (
                      <span className="co-addr-row-tag">
                        {t("createOrder.addresses.last", { defaultValue: "Последний" })}
                      </span>
                    )}
                  </span>
                  {details && <span className="co-addr-row-details">{details}</span>}
                </span>
                <span className="co-addr-row-meta">
                  <b>
                    {t("createOrder.addresses.orders", {
                      n: a.count,
                      defaultValue: "Заказов: {{n}}",
                    })}
                  </b>
                  {date}
                </span>
              </button>
              <button
                type="button"
                className="co-addr-row-del"
                onClick={onDelete}
                title={t("createOrder.addresses.delete", { defaultValue: "Удалить адрес" })}
                aria-label={t("createOrder.addresses.delete", { defaultValue: "Удалить адрес" })}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {(hidden > 0 || expanded) && addresses.length > VISIBLE && (
          <button
            type="button"
            className="co-addr-more"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? t("createOrder.addresses.showLess", { defaultValue: "Свернуть" })
              : t("createOrder.addresses.showMore", {
                  n: hidden,
                  defaultValue: "Показать ещё {{n}}",
                })}
            <ChevronDown size={14} aria-hidden="true" className={expanded ? "is-up" : ""} />
          </button>
        )}
        {onNew && (
          <button type="button" className="co-addr-new" onClick={onNew}>
            <Plus size={14} aria-hidden="true" />
            {t("createOrder.addresses.new", { defaultValue: "Добавить новый адрес" })}
          </button>
        )}
      </div>
      {notice && (
        <div className="co-addr-notice" role="status">
          <MapPin size={14} aria-hidden="true" />
          {t("createOrder.addresses.deleteSoon", {
            defaultValue: "Удаление адресов скоро появится — пока адрес не удалён",
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerAddressList;
