import React, { useState, useEffect } from "react";
import { Map, Settings, Sun, Moon, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import "./orderPanel.css";
import { ThemeProvider, useTheme } from "./provider/ThemeContext";

const OrderPanel = () => {
    const [activeTab, setActiveTab] = useState("active");
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const navigate = useNavigate();
    const location = useLocation();

    function ThemeSelector() {
        const { changeTheme } = useTheme();

        return (
            <div style={{ display: "Flex", gap: 16 }}>
                <button
                    className="icon-btn"
                    onClick={() => changeTheme("purpleTheme")}
                >
                    <Sun size={24} />
                </button>
                <button
                    className="icon-btn"
                    onClick={() => changeTheme("darkGreenTheme")}
                >
                    <Moon size={24} />
                </button>
            </div>
        );
    }

    const [orders, setOrders] = useState({
        new: [],
        active: [
            {
                id: 2,
                number: "N заказа 2",
                status: "Готов",
                time: "17:59 00:09",
                address: "Zeltritu 20, кв 10 под 1, этаж 3",
                customer: "Agris",
                phone: "+37127424725",
                amount: "134,12",
                items: "Aleja",
                payment: "Наличные",
                courier: "Mihail",
            },
            {
                id: 3,
                number: "N заказа 3",
                status: "В пути",
                time: "16:45 01:23",
                address: "Vesetas 15, кв 88 под 2, этаж 5",
                customer: "Elvis",
                phone: "+37127424725",
                amount: "32,50",
                items: "Briana",
                payment: "Карта",
                courier: "Danila",
            },
        ],
        preorders: [
            {
                id: 1,
                number: "N заказа 1",
                status: "Новый",
                time: "17:59 00:09",
                address: "Valdeķu iela 53, кв 167 под 6, этаж 2",
                customer: "Mihail",
                phone: "+37127424725",
                amount: "0,00",
                items: "Briana (демо)",
                payment: "Наличные",
                courier: "Егор",
            },
        ],
        completed: [
            {
                id: 4,
                number: "N заказа 4",
                status: "Завершен",
                time: "17:59 00:09",
                address: "Valdeķu iela 53, кв 167 под 6, этаж 2",
                customer: "Tolik",
                phone: "+37127424725",
                amount: "17,00",
                items: "Briana (демо)",
                payment: "Наличные",
                courier: "Егор",
            },
        ],
    });

    // --- Добавление нового заказа с CreateOrder.jsx ---
    const newOrder = location.state?.newOrder;
    useEffect(() => {
        if (newOrder) {
            setOrders((prev) => ({
                ...prev,
                active: [...prev.active, newOrder],
            }));
            // очищаем state, чтобы заказ не дублировался при возврате
            navigate(location.pathname, { replace: true });
        }
    }, [newOrder, navigate, location.pathname]);

    const tabs = [
        { key: "active", label: "АКТИВНЫЕ", count: orders.active.length },
        { key: "preorders", label: "ПРЕДЗАКАЗЫ", count: orders.preorders.length },
        { key: "completed", label: "ЗАВЕРШЕННЫЕ", count: orders.completed.length },
    ];

    const handleOrderSelect = (orderId) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(orderId)) {
            newSelected.delete(orderId);
        } else {
            newSelected.add(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Новый":
                return "status-new";
            case "В пути":
                return "status-inprogress";
            case "Готов":
                return "status-ready";
            default:
                return "status-default";
        }
    };

    return (
        <ThemeProvider>
            <div className="order-panel">
                <header className="header">
                    <div className="header-left">
                        <div className="logo">
                            <div className="logo-icon">
                                <svg viewBox="0 0 24 24" width="32" height="32">
                                    <path
                                        fill="currentColor"
                                        d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"
                                    />
                                </svg>
                            </div>
                            <span className="logo-text">DeliveryApp</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="header-icons">
                            <ThemeSelector/>
                            <button className="icon-btn" onClick={() => navigate("/ownerSettings")}>
                                <Settings size={24}/>
                            </button>
                            <button className="icon-btn" onClick={() => navigate("/map")}>
                                <Map size={24}/>
                            </button>
                            <button className="icon-btn" onClick={() => navigate("/userProfile")}>
                                <User size={24}/>
                            </button>
                            <div className="user-info">
                                <span className="user-name">Briana</span>
                                <button className="logout-btn">Выход</button>
                            </div>
                        </div>
                    </div>
                </header>

                <nav className="nav-tabs">
                    <div>
                        <button
                            className="nav-tab"
                            onClick={() => navigate("/createOrder")}
                        >
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
                            {tab.count > 0 && (
                                <span className="tab-badge">{tab.count}</span>
                            )}
                        </button>
                    ))}

                    <div className="nav-actions">
                        <div className="search-box">
                            <svg
                                className="search-icon"
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                            >
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
                            <div className="header-cell checkbox-cell">
                                <input type="checkbox" />
                            </div>
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
                            {orders[activeTab]?.map((order) => (
                                <div key={order.id} className="table-row">
                                    <div className="cell checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={() => handleOrderSelect(order.id)}
                                        />
                                    </div>
                                    <div className="cell order-number">
                                        <span className="order-id">{order.id}</span>
                                    </div>
                                    <div className="cell">
                    <span
                        className={`status-badge ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                                    </div>
                                    <div className="cell time-cell">
                                        <div className="time-info">
                                            <span className="time">{order.time}</span>
                                        </div>
                                    </div>
                                    <div className="cell address-cell">
                                        <span className="address">{order.address}</span>
                                    </div>
                                    <div className="cell customer-cell">
                                        <div className="customer-info">
                                            <span className="name">{order.customer} / {order.phone}</span>
                                            {/*<span className="phone">{order.phone}</span>*/}
                                            <span className="payment">{order.payment}</span>
                                        </div>
                                    </div>
                                    <div className="cell amount-cell">
                                        <span className="amount">{order.amount}</span>
                                    </div>
                                    <div className="cell items-cell">
                                        <span className="items">{order.items}</span>
                                    </div>
                                    <div className="cell courier-cell">
                                        <span className="courier">{order.courier}</span>
                                    </div>
                                    <div className="cell dispatcher-cell">
                                        <span className="dispatcher">{order.courier}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="footer-actions">
                    <div className="bulk-actions">
                        <button className="action-btn secondary">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M19,13H5V11H19V13Z" />
                            </svg>
                            Скрыть выбранные
                        </button>
                        <button className="action-btn primary">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path
                                    fill="currentColor"
                                    d="M17,13H7V11H17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
                                />
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
