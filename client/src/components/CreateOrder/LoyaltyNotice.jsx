import React from "react";
import { Gift } from "lucide-react";

// Плашка программы лояльности в итогах заказа (CreateOrder / EditOrder).
//
// variant="gift"     — скидка положена/выдана: заголовок, чекбокс «применить»
//                      и пояснение, если скидка не действует.
// variant="progress" — скидки на этом заказе нет, просто показываем, каким по
//                      счёту он будет.
export default function LoyaltyNotice({
  variant,
  title,
  checked,
  onChange,
  checkLabel,
  hint,
}) {
  if (variant === "progress") {
    return (
      <div className="co-loyalty co-loyalty-progress">
        <Gift size={14} />
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className={`co-loyalty co-loyalty-gift ${checked ? "" : "is-off"}`}>
      <div className="co-loyalty-head">
        <span className="co-loyalty-ico"><Gift size={16} /></span>
        <strong>{title}</strong>
      </div>
      <label className="co-loyalty-check">
        <input
          type="checkbox"
          checked={!!checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span>{checkLabel}</span>
      </label>
      {hint && <div className="co-loyalty-hint">{hint}</div>}
    </div>
  );
}
