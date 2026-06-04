import React from "react";
import { X } from "lucide-react";

// Модальное окно с картой зон доставки.
const DeliveryMapModal = ({ mapEmbedSrc, onClose }) => {
  return (
    <div className="map-modal" onClick={() => onClose()}>
      <div className="map-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">Карта зон доставки</div>
          <button
            type="button"
            className="map-modal-close"
            onClick={() => onClose()}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <iframe
          src={mapEmbedSrc}
          className="map-iframe map-iframe--large"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default DeliveryMapModal;
