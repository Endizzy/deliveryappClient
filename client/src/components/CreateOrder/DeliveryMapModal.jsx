import React from "react";
import { X, Check, CheckCircle2 } from "lucide-react";
import AddressMapPicker from "./AddressMapPicker.jsx";

// Модальное окно с интерактивной картой адреса доставки.
// Большая версия inline-карты: админу удобно проверить и при необходимости
// перетащить маркер, затем подтвердить адрес.
const DeliveryMapModal = ({
  t,
  position,
  onChange,
  confirmed,
  zones,
  onConfirm,
  onClose,
}) => {
  const tr = (key, def) => (t ? t(key, { defaultValue: def }) : def);

  return (
    <div className="map-modal" onClick={() => onClose()}>
      <div className="map-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">
            {tr("createOrder.map.modalTitle", "Адрес доставки на карте")}
          </div>
          <button
            type="button"
            className="map-modal-close"
            onClick={() => onClose()}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <AddressMapPicker
          position={position}
          onChange={onChange}
          zones={zones}
          height="68vh"
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <span className="hint muted" style={{ margin: 0 }}>
            {tr(
              "createOrder.map.dragHint",
              "Перетащите маркер, если точка неточная, и подтвердите адрес"
            )}
          </span>

          {confirmed ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#16A34A",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              {tr("createOrder.map.confirmed", "Адрес подтверждён")}
            </span>
          ) : (
            <button type="button" className="btn-primary" onClick={() => onConfirm()}>
              <Check size={16} />
              {tr("createOrder.map.confirm", "Подтвердить адрес")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryMapModal;
