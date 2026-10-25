import React, { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

// Выпадающий список вариантов адреса (под полями «Улица / Дом»).
// Родитель подключает хук useAddressSuggest и передаёт сюда items / onPick / onClose.
const AddressSuggestList = ({ items, onPick, onClose, t }) => {
  const ref = useRef(null);
  const open = Array.isArray(items) && items.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="addr-suggest-wrap" ref={ref}>
      <div className="addr-suggest" role="listbox">
        <div className="addr-suggest-title">
          {t("createOrder.suggest.title", { defaultValue: "Выберите адрес из списка" })}
        </div>
        {items.map((it) => (
          <button
            key={`${it.formatted}|${it.lat}|${it.lng}`}
            type="button"
            role="option"
            className="addr-suggest-item"
            onClick={() => onPick(it)}
          >
            <MapPin size={15} aria-hidden="true" />
            <span className="addr-suggest-text">
              <span className="addr-suggest-main">{it.main || it.formatted}</span>
              {it.secondary && <span className="addr-suggest-sub">{it.secondary}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AddressSuggestList;
