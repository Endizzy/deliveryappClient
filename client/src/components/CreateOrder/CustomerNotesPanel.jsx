import React, { useEffect, useState } from "react";
import { Lock, ChevronDown, ChevronUp, Check, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import useCustomerNotes from "../../hooks/useCustomerNotes.js";
import "./customerNotes.css";

// Журнал заметок администраторов о клиенте (CreateOrder и EditOrder).
// Видят и пишут только администраторы; в накладную заметки не попадают.
const MAX_LEN = 1000;

function fmtDate(iso, lang) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(lang || undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerNotesPanel({ phone, API, authHeaders, onUnauthorized }) {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language;
  const { notes, ready, loading, error, add, setDone, saveText, remove } = useCustomerNotes({
    phone,
    API,
    authHeaders,
    onUnauthorized,
  });

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [toggled, setToggled] = useState(null); // null — решает автоматика
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  // Другой клиент — сбрасываем локальное состояние
  const normPhone = String(phone || "").replace(/\s/g, "");
  useEffect(() => {
    setDraft("");
    setToggled(null);
    setEditId(null);
    setConfirmId(null);
  }, [normPhone]);

  if (!ready) return null;

  const openCount = notes.filter((n) => !n.done).length;
  // Свёрнут по умолчанию, только если заметки есть, но все выполнены
  const expanded = toggled !== null ? toggled : notes.length === 0 || openCount > 0;

  const run = async (fn) => {
    if (busy) return false;
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  const submitDraft = () =>
    run(async () => {
      const text = draft.trim();
      if (!text) return;
      if (await add(text)) setDraft("");
    });

  const submitEdit = () =>
    run(async () => {
      const text = editText.trim();
      if (!text) return;
      if (await saveText(editId, text)) setEditId(null);
    });

  return (
    <div className="form-section cn-panel">
      <div className="cn-head">
        <div className="cn-title">
          <Lock size={16} />
          <h3>{t("customerNotes.title", { defaultValue: "Заметки для администраторов" })}</h3>
          {openCount > 0 && <span className="cn-count">{openCount}</span>}
        </div>
        <div className="cn-head-right">
          <span className="cn-private">
            {t("customerNotes.private", { defaultValue: "Не попадают в накладную" })}
          </span>
          <button
            type="button"
            className="cn-link"
            onClick={() => setToggled(!expanded)}
            aria-expanded={expanded}
          >
            {expanded
              ? t("customerNotes.collapse", { defaultValue: "Свернуть" })
              : t("customerNotes.expand", { defaultValue: "Показать" })}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {loading && notes.length === 0 && <div className="cn-empty">…</div>}
          {!loading && notes.length === 0 && (
            <div className="cn-empty">
              {t("customerNotes.empty", { defaultValue: "Заметок о клиенте пока нет" })}
            </div>
          )}

          {notes.length > 0 && (
            <ul className="cn-feed">
              {notes.map((n) => (
                <li key={n.id} className={`cn-item ${n.done ? "is-done" : ""}`}>
                  <span className="cn-dot" aria-hidden="true" />
                  <div className="cn-body">
                    {editId === n.id ? (
                      <>
                        <textarea
                          className="cn-textarea"
                          value={editText}
                          maxLength={MAX_LEN}
                          rows={2}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                        />
                        <div className="cn-actions">
                          <button type="button" className="cn-btn" disabled={busy || !editText.trim()} onClick={submitEdit}>
                            {t("customerNotes.save", { defaultValue: "Сохранить" })}
                          </button>
                          <button type="button" className="cn-btn cn-btn-ghost" onClick={() => setEditId(null)}>
                            {t("customerNotes.cancel", { defaultValue: "Отмена" })}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cn-text">{n.text}</div>
                        <div className="cn-meta">
                          {n.authorName}
                          {n.authorName ? " · " : ""}
                          {fmtDate(n.createdAt, lang)}
                          {n.done && (
                            <>
                              {" · "}
                              {t("customerNotes.doneBy", { defaultValue: "выполнено" })}
                              {n.doneByName ? `: ${n.doneByName}` : ""}
                              {n.doneAt ? `, ${fmtDate(n.doneAt, lang)}` : ""}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {editId !== n.id && (
                    <div className="cn-side">
                      <span className={`cn-chip ${n.done ? "is-done" : ""}`}>
                        {n.done
                          ? t("customerNotes.statusDone", { defaultValue: "Выполнено" })
                          : t("customerNotes.statusOpen", { defaultValue: "Актуально" })}
                      </span>
                      <button
                        type="button"
                        className="cn-icon"
                        disabled={busy}
                        title={
                          n.done
                            ? t("customerNotes.reopen", { defaultValue: "Вернуть в актуальные" })
                            : t("customerNotes.markDone", { defaultValue: "Отметить выполненной" })
                        }
                        aria-label={
                          n.done
                            ? t("customerNotes.reopen", { defaultValue: "Вернуть в актуальные" })
                            : t("customerNotes.markDone", { defaultValue: "Отметить выполненной" })
                        }
                        onClick={() => run(() => setDone(n.id, !n.done))}
                      >
                        {n.done ? <RotateCcw size={15} /> : <Check size={15} />}
                      </button>
                      {n.canManage && (
                        <>
                          <button
                            type="button"
                            className="cn-icon"
                            disabled={busy}
                            title={t("customerNotes.edit", { defaultValue: "Изменить" })}
                            aria-label={t("customerNotes.edit", { defaultValue: "Изменить" })}
                            onClick={() => {
                              setEditId(n.id);
                              setEditText(n.text);
                              setConfirmId(null);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          {confirmId === n.id ? (
                            <button
                              type="button"
                              className="cn-btn cn-btn-danger"
                              disabled={busy}
                              onClick={() => run(() => remove(n.id)).then(() => setConfirmId(null))}
                              onBlur={() => setConfirmId(null)}
                              autoFocus
                            >
                              {t("customerNotes.confirmDelete", { defaultValue: "Удалить?" })}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="cn-icon"
                              disabled={busy}
                              title={t("customerNotes.delete", { defaultValue: "Удалить" })}
                              aria-label={t("customerNotes.delete", { defaultValue: "Удалить" })}
                              onClick={() => setConfirmId(n.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="cn-add">
            <textarea
              className="cn-textarea"
              value={draft}
              maxLength={MAX_LEN}
              rows={2}
              placeholder={t("customerNotes.placeholder", {
                defaultValue: "Новая заметка о клиенте (Ctrl+Enter — добавить)…",
              })}
              aria-label={t("customerNotes.placeholder", { defaultValue: "Новая заметка о клиенте" })}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submitDraft();
                }
              }}
            />
            <button type="button" className="cn-btn" disabled={busy || !draft.trim()} onClick={submitDraft}>
              {t("customerNotes.add", { defaultValue: "Добавить" })}
            </button>
          </div>
          <div className="cn-hint">
            {t("customerNotes.hint", {
              defaultValue: "Заметка сохраняется сразу и видна администраторам при следующих заказах клиента.",
            })}
          </div>
          {error && <div className="cn-error" role="alert">{error}</div>}
        </>
      )}
    </div>
  );
}
