import React, { createContext, useCallback, useState, useRef } from "react";
import Notifications from "../components/Notifications/Notifications.jsx";

export const NotificationContext = createContext({
    notify: () => {},
});

export function NotificationProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const counter = useRef(0);

    const notify = useCallback(({ type = "info", title = "", message = "", duration = 4000 }) => {
        const id = Date.now() + "-" + counter.current++;
        const toast = { id, type, title, message, duration };
        setToasts((t) => [toast, ...t]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((t) => t.filter((x) => x.id !== id));
            }, duration);
        }
    }, []);

    const remove = useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <Notifications items={toasts} onClose={remove} />
        </NotificationContext.Provider>
    );
}

export default NotificationProvider;
