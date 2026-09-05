import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, Info, X } from "lucide-react";

/**
 * Диалоги страницы настроек вместо системных alert / confirm / prompt.
 *
 * Системные окна выглядят по-разному в каждом браузере, не поддерживают
 * оформление и блокируют вкладку целиком. Здесь — обычная модалка в стиле
 * страницы, но с тем же удобством вызова: методы возвращают промис, поэтому
 * код читается как раньше:
 *
 *     if (!(await ui.confirm({ message: "Удалить?" }))) return;
 *     const name = await ui.prompt({ message: "Название" });
 *     ui.alert({ message: "Готово" });
 *
 * Промис резолвится: confirm → true/false, prompt → строка или null (отмена).
 */
export function useOwnerDialog() {
  const [dialog, setDialog] = useState(null);
  // Резолвер текущего промиса: вызывается при подтверждении или отмене
  const resolveRef = useRef(null);

  const open = useCallback((config) => {
    return new Promise((resolve) => {
      // Если предыдущее окно ещё не закрыли (например, показали alert и тут же
      // вызвали confirm), его промис нужно завершить — иначе ожидающий его
      // await повиснет навсегда. Отвечаем как при отмене.
      const pending = resolveRef.current;
      if (pending) pending(null);

      resolveRef.current = resolve;
      setDialog(config);
    });
  }, []);

  const close = useCallback((result) => {
    setDialog(null);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    if (resolve) resolve(result);
  }, []);

  // Стабильная ссылка: объект уходит пропсом во вкладки, пересоздавать его
  // на каждый рендер незачем.
  const ui = useMemo(
    () => ({
      alert: (opts) => open({ mode: "alert", ...opts }),
      confirm: (opts) => open({ mode: "confirm", ...opts }),
      prompt: (opts) => open({ mode: "prompt", ...opts }),
    }),
    [open]
  );

  return { dialog, close, ui };
}

export default function OwnerDialog({ dialog, onClose, t }) {
  const tr = (key, def, params) =>
    t ? t(key, { defaultValue: def, ...(params || {}) }) : def;

  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Значение по умолчанию для prompt + фокус в поле: иначе в модалке нужно
  // лишнее нажатие мышью, а системный prompt фокусировал сразу.
  useEffect(() => {
    if (!dialog) return;
    setValue(dialog.defaultValue ?? "");
    if (dialog.mode === "prompt") {
      const id = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 40);
      return () => clearTimeout(id);
    }
  }, [dialog]);

  // Escape закрывает, Enter подтверждает — как в системных окнах
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose(dialog.mode === "confirm" ? false : null);
      }
      if (e.key === "Enter" && dialog.mode !== "prompt") {
        e.preventDefault();
        onClose(dialog.mode === "confirm" ? true : undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, onClose]);

  if (!dialog) return null;

  const { mode, title, message, tone, confirmText, cancelText, placeholder } = dialog;
  const isDanger = tone === "danger";

  const Icon = mode === "confirm" ? (isDanger ? AlertTriangle : HelpCircle) : Info;

  const submit = () => {
    if (mode === "prompt") {
      const v = String(value ?? "").trim();
      if (!v) return; // пустое значение равносильно отмене — просто ждём ввода
      onClose(v);
      return;
    }
    onClose(mode === "confirm" ? true : undefined);
  };

  const cancel = () => onClose(mode === "confirm" ? false : null);

  const defaultTitle =
    mode === "confirm"
      ? tr("ownerSettings.dialog.confirmTitle", "Подтвердите действие")
      : mode === "prompt"
        ? tr("ownerSettings.dialog.promptTitle", "Введите значение")
        : tr("ownerSettings.dialog.alertTitle", "Сообщение");

  return (
    <div className="owner-modal" onMouseDown={cancel}>
      <div
        className="owner-modal-card od-card"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="owner-modal-header">
          <h3 className="od-title">
            <span className={`od-icon ${isDanger ? "is-danger" : ""}`}>
              <Icon size={17} />
            </span>
            {title || defaultTitle}
          </h3>
          <button className="owner-icon" onClick={cancel} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="owner-modal-body od-body">
          {!!message && <p className="od-message">{message}</p>}

          {mode === "prompt" && (
            <input
              ref={inputRef}
              className="od-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder || ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          )}
        </div>

        <div className="owner-modal-footer">
          {mode !== "alert" && (
            <button type="button" className="owner-secondary-btn" onClick={cancel}>
              {cancelText || tr("ownerSettings.actions.cancel", "Отмена")}
            </button>
          )}

          <button
            type="button"
            className={`owner-primary-btn ${isDanger ? "od-danger" : ""}`}
            onClick={submit}
            disabled={mode === "prompt" && !String(value ?? "").trim()}
          >
            {confirmText ||
              (mode === "alert"
                ? tr("ownerSettings.dialog.ok", "Понятно")
                : tr("ownerSettings.actions.confirm", "Подтвердить"))}
          </button>
        </div>
      </div>
    </div>
  );
}
