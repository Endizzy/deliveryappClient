import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../../components/Header/Header.jsx";
import useNotification from "../../hooks/useNotification.jsx";
import styles from "./Support.module.css";

const API = import.meta.env.VITE_API_URL;
const FILTERS = ["all", "open", "answered", "closed"];

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function formatWhen(iso, locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Support() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotification();

  const [ready, setReady] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [mode, setMode] = useState("list"); // list | create | thread

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const locale = i18n.language || "ru";

  const loadTickets = useCallback(async () => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    try {
      const res = await fetch(`${API}/support-tickets`, {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("support.errors.loadList"));
      }
      setReady(data.ready !== false);
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (e) {
      notify({
        type: "error",
        title: t("support.errorTitle"),
        message: e.message,
        duration: 4500,
      });
    } finally {
      setLoadingList(false);
    }
  }, [navigate, notify, t]);

  const loadDetail = useCallback(
    async (id, { silent = false } = {}) => {
      if (!id) return;
      if (!silent) setLoadingDetail(true);
      try {
        const res = await fetch(`${API}/support-tickets/${id}`, {
          headers: authHeaders(),
        });
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || t("support.errors.loadTicket"));
        }
        setDetail({
          ticket: data.ticket,
          messages: Array.isArray(data.messages) ? data.messages : [],
        });
        setMode("thread");
        setSelectedId(id);
      } catch (e) {
        if (!silent) {
          notify({
            type: "error",
            title: t("support.errorTitle"),
            message: e.message,
            duration: 4500,
          });
        }
      } finally {
        if (!silent) setLoadingDetail(false);
      }
    },
    [navigate, notify, t]
  );

  useEffect(() => {
    setLoadingList(true);
    loadTickets();
  }, [loadTickets]);

  // Лёгкий poll открытого тикета — чтобы увидеть ответ из Telegram
  useEffect(() => {
    if (mode !== "thread" || !selectedId) return undefined;
    const timer = setInterval(() => {
      loadDetail(selectedId, { silent: true });
      loadTickets();
    }, 12000);
    return () => clearInterval(timer);
  }, [mode, selectedId, loadDetail, loadTickets]);

  const counts = useMemo(() => {
    const all = tickets.length;
    const open = tickets.filter((x) => x.status === "open").length;
    const answered = tickets.filter((x) => x.status === "answered").length;
    const closed = tickets.filter((x) => x.status === "closed").length;
    return { all, open, answered, closed };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    if (filter === "all") return tickets;
    return tickets.filter((x) => x.status === filter);
  }, [tickets, filter]);

  const startCreate = () => {
    setMode("create");
    setSelectedId(null);
    setDetail(null);
    setSubject("");
    setBody("");
  };

  const openTicket = (id) => {
    setReply("");
    loadDetail(id);
  };

  const createTicket = async (e) => {
    e.preventDefault();
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      notify({
        type: "error",
        title: t("support.errorTitle"),
        message: t("support.errors.fillAll"),
        duration: 3500,
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/support-tickets`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ subject: s, body: b }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("support.errors.create"));
      }
      notify({
        type: "success",
        title: t("support.createdTitle"),
        message: t("support.createdMessage"),
        duration: 3000,
      });
      setSubject("");
      setBody("");
      await loadTickets();
      if (data.ticket?.id) {
        await loadDetail(data.ticket.id);
      } else {
        setMode("list");
      }
    } catch (err) {
      notify({
        type: "error",
        title: t("support.errorTitle"),
        message: err.message,
        duration: 4500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/support-tickets/${selectedId}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("support.errors.reply"));
      }
      setReply("");
      await loadDetail(selectedId, { silent: true });
      await loadTickets();
    } catch (err) {
      notify({
        type: "error",
        title: t("support.errorTitle"),
        message: err.message,
        duration: 4500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/support-tickets/${selectedId}/close`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("support.errors.close"));
      }
      notify({
        type: "success",
        title: t("support.closedTitle"),
        message: t("support.closedMessage"),
        duration: 2500,
      });
      await loadDetail(selectedId, { silent: true });
      await loadTickets();
    } catch (err) {
      notify({
        type: "error",
        title: t("support.errorTitle"),
        message: err.message,
        duration: 4500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status) => t(`support.status.${status}`, { defaultValue: status });

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.container}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>{t("support.title")}</h1>
            <p className={styles.heroText}>{t("support.subtitle")}</p>
          </div>
          <button type="button" className={styles.btnPrimary} onClick={startCreate}>
            {t("support.newTicket")}
          </button>
        </section>

        {!ready && (
          <div className={styles.banner}>
            {t("support.notReady")}
          </div>
        )}

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.filters}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ""}`}
                  onClick={() => setFilter(f)}
                >
                  <span>{t(`support.filters.${f}`)}</span>
                  <span className={styles.filterCount}>{counts[f] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className={styles.list}>
              {loadingList ? (
                <div className={styles.empty}>{t("support.loading")}</div>
              ) : visibleTickets.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>{t("support.emptyTitle")}</div>
                  <div className={styles.emptyText}>{t("support.emptyText")}</div>
                  <button type="button" className={styles.btnPrimary} onClick={startCreate}>
                    {t("support.newTicket")}
                  </button>
                </div>
              ) : (
                visibleTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`${styles.ticketItem} ${
                      selectedId === ticket.id && mode === "thread" ? styles.ticketActive : ""
                    }`}
                    onClick={() => openTicket(ticket.id)}
                  >
                    <div className={styles.ticketTop}>
                      <span className={styles.ticketId}>#{ticket.id}</span>
                      <span className={`${styles.badge} ${styles[`badge_${ticket.status}`]}`}>
                        {statusLabel(ticket.status)}
                      </span>
                    </div>
                    <div className={styles.ticketSubject}>{ticket.subject}</div>
                    <div className={styles.ticketMeta}>
                      {formatWhen(ticket.lastMessageAt || ticket.createdAt, locale)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className={styles.panel}>
            {mode === "create" && (
              <form className={styles.form} onSubmit={createTicket}>
                <div className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>{t("support.createTitle")}</h2>
                  <p className={styles.panelHint}>{t("support.createHint")}</p>
                </div>

                <label className={styles.field}>
                  <span>{t("support.fields.subject")}</span>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder={t("support.placeholders.subject")}
                    disabled={submitting || !ready}
                  />
                </label>

                <label className={styles.field}>
                  <span>{t("support.fields.body")}</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={5000}
                    rows={10}
                    placeholder={t("support.placeholders.body")}
                    disabled={submitting || !ready}
                  />
                </label>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setMode("list")}
                    disabled={submitting}
                  >
                    {t("support.cancel")}
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={submitting || !ready}
                  >
                    {submitting ? t("support.sending") : t("support.send")}
                  </button>
                </div>
              </form>
            )}

            {mode === "thread" && (
              <div className={styles.thread}>
                {loadingDetail && !detail ? (
                  <div className={styles.empty}>{t("support.loading")}</div>
                ) : !detail ? (
                  <div className={styles.empty}>{t("support.selectTicket")}</div>
                ) : (
                  <>
                    <div className={styles.panelHeadRow}>
                      <div>
                        <div className={styles.threadMeta}>
                          <span>#{detail.ticket.id}</span>
                          <span className={`${styles.badge} ${styles[`badge_${detail.ticket.status}`]}`}>
                            {statusLabel(detail.ticket.status)}
                          </span>
                        </div>
                        <h2 className={styles.panelTitle}>{detail.ticket.subject}</h2>
                        <p className={styles.panelHint}>
                          {t("support.updatedAt", {
                            time: formatWhen(detail.ticket.lastMessageAt, locale),
                          })}
                        </p>
                      </div>
                      {detail.ticket.status !== "closed" && (
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={closeTicket}
                          disabled={submitting}
                        >
                          {t("support.closeTicket")}
                        </button>
                      )}
                    </div>

                    <div className={styles.messages}>
                      {detail.messages.map((msg) => {
                        const isSupport = msg.authorType === "support";
                        return (
                          <div
                            key={msg.id}
                            className={`${styles.bubble} ${
                              isSupport ? styles.bubbleSupport : styles.bubbleUser
                            }`}
                          >
                            <div className={styles.bubbleHead}>
                              <strong>
                                {isSupport
                                  ? t("support.roles.support")
                                  : msg.authorName || t("support.roles.you")}
                              </strong>
                              <span>{formatWhen(msg.createdAt, locale)}</span>
                            </div>
                            <div className={styles.bubbleBody}>{msg.body}</div>
                          </div>
                        );
                      })}
                    </div>

                    {detail.ticket.status === "closed" ? (
                      <div className={styles.closedNote}>{t("support.closedNote")}</div>
                    ) : (
                      <form className={styles.replyForm} onSubmit={sendReply}>
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          rows={3}
                          maxLength={5000}
                          placeholder={t("support.placeholders.reply")}
                          disabled={submitting}
                        />
                        <button
                          type="submit"
                          className={styles.btnPrimary}
                          disabled={submitting || !reply.trim()}
                        >
                          {submitting ? t("support.sending") : t("support.reply")}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}

            {mode === "list" && (
              <div className={styles.emptyPanel}>
                <div className={styles.emptyIcon} aria-hidden>
                  <svg viewBox="0 0 24 24" width="36" height="36">
                    <path
                      fill="currentColor"
                      d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
                    />
                  </svg>
                </div>
                <h2 className={styles.emptyTitle}>{t("support.pickOrCreateTitle")}</h2>
                <p className={styles.emptyText}>{t("support.pickOrCreateText")}</p>
                <button type="button" className={styles.btnPrimary} onClick={startCreate}>
                  {t("support.newTicket")}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
