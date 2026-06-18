import React from "react";
import { MapPin, Check, CheckCircle2, Maximize2 } from "lucide-react";
import AddressMapPicker from "./AddressMapPicker.jsx";

// Блок проверки адреса доставки на карте:
// кнопка «Проверить» → геокодинг, inline-карта с перетаскиваемым маркером,
// кнопка «Развернуть» (модалка), подтверждение адреса и подсказки.
const AddressMapField = ({
  t,
  formData,
  geo,
  geoConfirmed,
  geoLoading,
  geoError,
  addressError,
  onVerifyAddress,
  onConfirmAddress,
  onMarkerMove,
  onExpandMap,
  zones,
  currentZone,
  requireConfirm = true,
}) => {
  const hasZones = Array.isArray(zones) && zones.length > 0;
  return (
    <div className="form-group address-map-block">
      <label>
        {t("createOrder.map.sectionTitle", {
          defaultValue: "Адрес доставки на карте",
        })}
      </label>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={onVerifyAddress}
          disabled={geoLoading || !formData.street.trim()}
        >
          <MapPin size={16} />
          {geoLoading
            ? t("createOrder.map.verifying", { defaultValue: "Проверяем…" })
            : t("createOrder.map.verify", {
                defaultValue: "Проверить на карте",
              })}
        </button>

        {requireConfirm && geo && !geoConfirmed && (
          <button type="button" className="btn-primary" onClick={onConfirmAddress}>
            <Check size={16} />
            {t("createOrder.map.confirm", {
              defaultValue: "Подтвердить адрес",
            })}
          </button>
        )}

        {requireConfirm && geo && geoConfirmed && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#16A34A",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            {t("createOrder.map.confirmed", {
              defaultValue: "Адрес подтверждён",
            })}
          </span>
        )}
      </div>

      {!formData.street.trim() && (
        <span className="hint muted">
          {t("createOrder.map.needAddress", {
            defaultValue: "Заполните улицу и дом, затем нажмите «Проверить»",
          })}
        </span>
      )}

      {geoError && <span className="error-text">{geoError}</span>}

      {geo && (
        <>
          <div style={{ position: "relative" }}>
            <AddressMapPicker position={geo} onChange={onMarkerMove} zones={zones} height={280} />
            <button
              type="button"
              onClick={onExpandMap}
              title={t("createOrder.map.expand", {
                defaultValue: "Открыть карту на весь экран",
              })}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(148,163,184,0.45)",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "#0f172a",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <Maximize2 size={14} />
              {t("createOrder.map.expand", { defaultValue: "Развернуть" })}
            </button>
          </div>
          <span className="hint muted" style={{ display: "block", marginTop: 6 }}>
            {!requireConfirm
              ? t("createOrder.map.dragHintEdit", {
                  defaultValue: "Перетащите маркер, чтобы скорректировать точку",
                })
              : geoConfirmed
              ? t("createOrder.map.dragHintConfirmed", {
                  defaultValue:
                    "Можно перетащить маркер для уточнения — потребуется подтвердить заново",
                })
              : t("createOrder.map.dragHint", {
                  defaultValue:
                    "Перетащите маркер, если точка неточная, и подтвердите адрес",
                })}
          </span>

          {hasZones &&
            (currentZone ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(22,163,74,0.10)",
                  border: "1px solid rgba(22,163,74,0.35)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#15803D",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: currentZone.color || "#3B82F6",
                  }}
                />
                {t("createOrder.map.zoneLabel", { defaultValue: "Зона" })}:{" "}
                {currentZone.name}
                {currentZone.fee != null
                  ? ` · ${t("createOrder.map.zoneFee", {
                      defaultValue: "доставка",
                    })} €${Number(currentZone.fee).toFixed(2)}`
                  : ""}
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.4)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#B45309",
                }}
              >
                ⚠{" "}
                {t("createOrder.map.outsideZones", {
                  defaultValue: "Точка вне зон доставки",
                })}
              </div>
            ))}
        </>
      )}

      {addressError && <span className="error-text">{addressError}</span>}
    </div>
  );
};

export default AddressMapField;
