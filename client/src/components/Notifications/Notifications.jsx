import React from "react";
import styles from "./Notifications.module.css";

const ICONS = {
    success: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    ),
};

export default function Notifications({ items = [], onClose = () => {} }) {
    return (
        <div className={styles.container} aria-live="polite">
            {items.map((it) => (
                <div
                    key={it.id}
                    className={`${styles.toast} ${styles[it.type]}`}
                    onClick={() => onClose(it.id)}
                    role="alert"
                >
                    <div className={styles.icon}>{ICONS[it.type] || ICONS.info}</div>
                    <div className={styles.content}>
                        {it.title && <div className={styles.title}>{it.title}</div>}
                        {it.message && <div className={styles.message}>{it.message}</div>}
                    </div>
                    <button className={styles.close} onClick={(e) => { e.stopPropagation(); onClose(it.id); }} aria-label="Закрыть">×</button>
                </div>
            ))}
        </div>
    );
}
