import React, { useEffect, useMemo, useState } from "react";
import { Map as MapIcon, Settings, Sun, Moon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./orderPanel.css";
import { ThemeProvider, useTheme } from "./provider/ThemeContext";

const API = import.meta.env.VITE_API_URL;
const WS_URL = (API || "").replace(/^http/, "ws");

function ThemeSelector() {
    const { changeTheme } = useTheme();
    return (
        <div style={{ display: "Flex", gap: 16 }}>
            <button className="icon-btn" onClick={() => changeTheme("purpleTheme")}><Sun size={24} /></button>
            <button className="icon-btn" onClick={() => changeTheme("darkGreenTheme")}><Moon size={24} /></button>
        </div>
    );
}

// утилиты
const byNewest = (a, b) => {
    const ad = new Date(a.createdAt).getTime() || 0;
    const bd = new Date(b.createdAt).getTime() || 0;
    if (bd !== ad) return bd - ad;
    return (b.id || 0) - (a.id || 0);
};
function mergeById(oldArr = [], newArr = []) {
    const map = new Map(oldArr.map(o => [o.id, o]));
    newArr.forEach(o => map.set(o.id, o));
    return Array.from(map.values()).sort(byNewest);
}
const safeTime = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
};
const isValidCurrentOrder = (o) =>
    o && typeof o === "object" &&
    typeof o.id !== "undefined" &&
    !!o.createdAt &&
    (o.orderType === "active" || o.orderType === "preorder");

const OrderPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("active");
    const [companyId, setCompanyId] = useState(null); // <— добавили

    const token = useMemo(
        () => localStorage.getItem("token") || sessionStorage.getItem("token"),
        []
    );
    const authHeaders = useMemo(
        () => ({ Authorization: `Bearer ${token}` }),
        [token]
    );

    const [ordersByTab, setOrdersByTab] = useState({
        active: [],
        preorders: [],
        completed: [],
    });

    const tabs = [
        { key: "active", label: "АКТИВНЫЕ", count: ordersByTab.active.length },
        { key: "preorders", label: "ПРЕДЗАКАЗЫ", count: ordersByTab.preorders.length },
        { key: "completed", label: "ЗАВЕРШЕННЫЕ", count: ordersByTab.completed.length },
    ];

    // 1) тянем профиль, чтобы узнать companyId
    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        (async () => {
            try {
                const r = await fetch(`${API}/profile`, { headers: authHeaders });
                if (r.status === 401) { navigate("/login"); return; }
                const d = await r.json();
                if (d.ok) {
                    const cid = d.user?.companyId ?? d.user?.company_id ?? null;
                    setCompanyId(typeof cid === "number" ? cid : Number(cid));
                }
            } catch (e) {
                console.error("profile", e);
            }
        })();
    }, [token, navigate]); // eslint-disable-line

    async function loadTab(tab) {
        const q = tab === "completed" ? "active" : tab;
        const res = await fetch(`${API}/current-orders?tab=${q}`, { headers: authHeaders });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка загрузки заказов");
        setOrdersByTab(prev => ({ ...prev, [q]: data.items || [] }));
    }

    function upsertOrderToTabs(order) {
        const tabKey = order.orderType === "preorder" ? "preorders" : "active";
        const otherKey = tabKey === "active" ? "preorders" : "active";
        setOrdersByTab(prev => {
            const next = { ...prev };
            next[otherKey] = (next[otherKey] || []).filter(x => x.id !== order.id);
            next[tabKey] = mergeById(next[tabKey], [order]);
            return next;
        });
    }

    function removeOrderFromTabs(orderId) {
        setOrdersByTab(prev => ({
            ...prev,
            active: (prev.active || []).filter(x => x.id !== orderId),
            preorders: (prev.preorders || []).filter(x => x.id !== orderId),
            completed: (prev.completed || []).filter(x => x.id !== orderId),
        }));
    }

    // 2) когда есть companyId — грузим данные и подключаем WS
    useEffect(() => {
        if (!token || !companyId) return;

        loadTab("active").catch(console.error);
        loadTab("preorders").catch(console.error);

        const ws = new WebSocket(`${WS_URL.replace(/\/$/, "")}`);
        ws.addEventListener("open", () => {
            // отправляем hello с companyId — сервер привяжет сокет к компании
            ws.send(JSON.stringify({ type: "hello", role: "admin", companyId }));
        });

        ws.addEventListener("message", (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }

            // фильтруем по companyId, если указан в payload
            if (typeof msg.companyId === "number" && msg.companyId !== companyId) return;

            // игнорируем старые демо-сообщения/снапшоты
            if (
                msg.type === "orders_snapshot" ||
                msg.type === "demo_orders_snapshot" ||
                msg.type === "demo_order_created" ||
                msg.type === "demo_order_updated" ||
                msg.type === "demo_order_deleted"
            ) return;

            if ((msg.type === "order_created" || msg.type === "order_updated") && msg.order) {
                if (isValidCurrentOrder(msg.order)) upsertOrderToTabs(msg.order);
                return;
            }

            if (msg.type === "order_deleted" && msg.orderId) {
                removeOrderFromTabs(msg.orderId);
                return;
            }
        });

        return () => ws.close();
    }, [token, companyId]); // eslint-disable-line

    const getStatusColor = (status) => {
        switch (status) {
            case "new": return "status-new";
            case "enroute": return "status-inprogress";
            case "ready": return "status-ready";
            default: return "status-default";
        }
    };

    const orders = ordersByTab[activeTab] || [];

    return (
        <ThemeProvider>
            <div className="order-panel">
                <header className="header">
                    <div className="header-left">
                        <div className="logo">
                            <div className="logo-icon">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12" />
                                </svg>
                            </div>
                            <span className="logo-text">DeliveryApp</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="header-icons">
                            <ThemeSelector/>
                            <button className="icon-btn" onClick={() => navigate("/ownerSettings")}><Settings size={24}/></button>
                            <button className="icon-btn" onClick={() => navigate("/map")}><MapIcon size={24}/></button>
                            <button className="icon-btn" onClick={() => navigate("/userProfile")}><User size={24}/></button>
                            <div className="user-info">
                                <span className="user-name">Briana</span>
                                <button className="logout-btn">Выход</button>
                            </div>
                        </div>
                    </div>
                </header>

                <nav className="nav-tabs">
                    <div>
                        <button className="nav-tab" onClick={() => navigate("/createOrder")}>
                            Создать заказ
                        </button>
                    </div>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`nav-tab ${activeTab === tab.key ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                            {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
                        </button>
                    ))}

                    <div className="nav-actions">
                        <div className="search-box">
                            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path
                                    fill="currentColor"
                                    d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
                                />
                            </svg>
                            <input type="text" placeholder="Поиск заказов..." />
                        </div>

                        <select className="filter-select">
                            <option>Все заказы</option>
                            <option>По курьеру</option>
                            <option>По сумме</option>
                        </select>
                    </div>
                </nav>

                <div className="orders-container">
                    <div className="orders-table">
                        <div className="table-header">
                            <div className="header-cell">№ заказа</div>
                            <div className="header-cell">Состояние</div>
                            <div className="header-cell">Время</div>
                            <div className="header-cell">Адрес доставки</div>
                            <div className="header-cell">Имя/телефон</div>
                            <div className="header-cell">Сумма</div>
                            <div className="header-cell">Ресторан</div>
                            <div className="header-cell">Курьер</div>
                            <div className="header-cell">Диспетчер</div>
                        </div>

                        <div className="table-body">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="table-row row-clickable"
                                    onClick={() => navigate(`/editOrder/${order.id}`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => (e.key === "Enter" ? navigate(`/editOrder/${order.id}`) : null)}
                                >
                                    <div className="cell order-number">
                                        <span className="order-id">{order.orderNo || order.id}</span>
                                    </div>
                                    <div className="cell">
                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                                    </div>
                                    <div className="cell time-cell">
                                        <div className="time-info">
                                            <span className="time">{safeTime(order.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="cell address-cell">
                                        <span className="address">{order.address}</span>
                                    </div>
                                    <div className="cell customer-cell">
                                        <div className="customer-info">
                                            <span className="name">{order.customer} / {order.phone}</span>
                                            <span className="payment">{order.paymentMethod}</span>
                                        </div>
                                    </div>
                                    <div className="cell amount-cell">
                                        <span className="amount">€{order.amountTotal?.toFixed?.(2) ?? order.amountTotal}</span>
                                    </div>
                                    <div className="cell items-cell">
                                        <span className="items">{order.pickupName}</span>
                                    </div>
                                    <div className="cell courier-cell">
                                        <span className="courier">{order.courierName}</span>
                                    </div>
                                    <div className="cell dispatcher-cell">
                                        <span className="dispatcher">{order.dispatcherUnitId ?? ""}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="footer-actions">
                    <div className="bulk-actions">
                        <button className="action-btn secondary">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19,13H5V11H19V13Z" /></svg>
                            Скрыть выбранные
                        </button>
                        <button className="action-btn primary">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor"
                                      d="M17,13H7V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                            </svg>
                            Обновить статус
                        </button>
                    </div>
                </footer>
            </div>
        </ThemeProvider>
    );
};

export default OrderPanel;
