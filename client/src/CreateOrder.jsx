// CreateOrder.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft, Save, User, Phone, Package, Truck, Clock,
    Search, Plus, Minus, X
} from "lucide-react";
import "./CreateOrder.css";
import { useNavigate } from "react-router-dom";

// формат номера LV
const formatPhoneNumber = (value) => {
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.startsWith("371")) cleaned = "+" + cleaned;
    else if (!cleaned.startsWith("+371") && cleaned.length > 0) cleaned = "+371" + cleaned;
    return cleaned;
};

// хелперы для дат/времени
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toLocalTimeInput = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const PREORDER_MIN_OFFSET_MIN = 15;

const CreateOrder = ({ onBack }) => {
    const navigate = useNavigate();
    const API = import.meta.env.VITE_API_URL;

    // ---- auth ----
    const token = useMemo(
        () => localStorage.getItem("token") || sessionStorage.getItem("token"),
        []
    );
    const authHeaders = useMemo(
        () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
        [token]
    );

    // ---- форма ----
    const [formData, setFormData] = useState({
        phone: "",
        customer: "",
        street: "",
        house: "",
        apart: "",
        building: "",
        floor: "",
        code: "",
        courierId: "",
        payment: "",
        pickupId: "",
        orderType: "active",
        notes: "",
        scheduledDate: "",
        scheduledTime: ""
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ---- курьеры/точки/меню ----
    const [couriers, setCouriers] = useState([]);
    const [pickupPoints, setPickupPoints] = useState([]);
    const [allMenu, setAllMenu] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);

    const fetchCouriers = async () => {
        const res = await fetch(`${API}/order-support/couriers`, { headers: authHeaders });
        if (res.status === 401) { navigate("/login"); return; }
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось загрузить курьеров");
        setCouriers(data.items || []);
    };

    const fetchPickupPoints = async () => {
        const res = await fetch(`${API}/order-support/pickup-points`, { headers: authHeaders });
        if (res.status === 401) { navigate("/login"); return; }
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось загрузить точки комплектации");
        setPickupPoints(data.items || []);
    };

    const fetchAllMenu = async () => {
        const res = await fetch(`${API}/order-support/menu?all=1`, { headers: authHeaders });
        if (res.status === 401) { navigate("/login"); return; }
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось загрузить меню");
        setAllMenu(data.items || []);
    };

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        (async () => {
            try {
                await Promise.all([fetchCouriers(), fetchPickupPoints(), fetchAllMenu()]);
            } catch (e) {
                alert(e.message);
            }
        })();
    }, [token, navigate]); // eslint-disable-line

    // локальный поиск
    const searchResults = React.useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return [];
        const filtered = allMenu.filter(it =>
            (it.name || "").toLowerCase().includes(q) ||
            (it.category || "").toLowerCase().includes(q)
        );
        return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
    }, [searchTerm, allMenu]);

    // ---- выбранные товары ----
    const [selectedItems, setSelectedItems] = useState([]);
    const addItemToOrder = (menuItem) => {
        const existing = selectedItems.find(i => i.id === menuItem.id);
        if (existing) {
            setSelectedItems(prev => prev.map(i => i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems(prev => [...prev, { ...menuItem, quantity: 1 }]);
        }
        setSearchTerm("");
        setShowSearchResults(false);
    };
    const updateItemQuantity = (id, qty) => {
        if (qty <= 0) return removeItem(id);
        setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    };
    const removeItem = (id) => setSelectedItems(prev => prev.filter(i => i.id !== id));

    const calculateTotal = () =>
        selectedItems.reduce((sum, it) => {
            const p = it.discount > 0 ? it.price * (1 - it.discount / 100) : it.price;
            return sum + p * it.quantity;
        }, 0);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
        if (field === "orderType" && value === "active") {
            setFormData(prev => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
            setErrors(prev => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
        }
    };

    // минимум для предзаказа
    const now = new Date();
    const minDate = toLocalDateInput(now);
    const minTimeToday = (() => {
        const t = new Date(now);
        t.setMinutes(t.getMinutes() + PREORDER_MIN_OFFSET_MIN);
        return toLocalTimeInput(t);
    })();

    const validateForm = () => {
        const e = {};
        if (!formData.customer.trim()) e.customer = "Имя клиента обязательно";
        if (!formData.phone.trim()) e.phone = "Телефон обязателен";
        else if (!/^\+371\d{8}$/.test(formData.phone.replace(/\s/g, ""))) e.phone = "Введите корректный телефон (+371XXXXXXXX)";
        if (selectedItems.length === 0) e.items = "Добавьте хотя бы один товар";
        if (!formData.courierId) e.courier = "Выберите курьера";
        if (!formData.pickupId) e.restaurant = "Выберите точку комплектации";
        if (!formData.payment) e.payment = "Выберите способ оплаты";

        if (formData.orderType === "preorder") {
            if (!formData.scheduledDate) e.scheduledDate = "Укажите дату доставки";
            if (!formData.scheduledTime) e.scheduledTime = "Укажите время доставки";
            if (formData.scheduledDate && formData.scheduledTime) {
                const scheduled = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
                const minAllowed = new Date();
                minAllowed.setMinutes(minAllowed.getMinutes() + PREORDER_MIN_OFFSET_MIN);
                if (scheduled < minAllowed) {
                    e.scheduledTime = `Время не может быть раньше чем через ${PREORDER_MIN_OFFSET_MIN} мин`;
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // submit -> API
    const handleSubmit = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const scheduledAt =
                formData.orderType === "preorder" && formData.scheduledDate && formData.scheduledTime
                    ? `${formData.scheduledDate}T${formData.scheduledTime}`
                    : null;

            const payload = {
                orderType: formData.orderType,
                status: "new",
                scheduledAt,
                courierId: Number(formData.courierId) || null,
                pickupId: Number(formData.pickupId) || null,
                payment: formData.payment === "Наличные" ? "cash" : formData.payment === "Карта" ? "card" : "wire",
                customer: formData.customer,
                phone: formData.phone,
                street: formData.street,
                house: formData.house,
                apart: formData.apart,
                building: formData.building,
                floor: formData.floor,
                code: formData.code,
                notes: formData.notes,
                selectedItems: selectedItems.map((i) => ({
                    id: i.id,
                    name: i.name,
                    price: i.price,
                    discount: i.discount || 0,
                    quantity: i.quantity,
                })),
            };

            const res = await fetch(`${API}/current-orders`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка создания заказа");

            // редирект на панель — там список подтянется через GET/WS
            navigate("/orderPanel");
        } catch (e) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-order-page">
            <header className="header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/orderPanel')}>
                        <ArrowLeft size={20} /> Назад
                    </button>
                    <div className="page-title">
                        <h1>Создание нового заказа</h1>
                        <p>Заполните все необходимые поля для создания заказа</p>
                    </div>
                </div>
            </header>

            <div className="form-container">
                <div className="order-form">
                    <div className="form-grid">
                        {/* Клиент */}
                        <div className="form-section">
                            <div className="section-header"><User size={20}/><h3>Информация о клиенте</h3></div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="phone">Телефон *</label>
                                    <div className="input-with-icon">
                                        <Phone size={16}/>
                                        <input
                                            id="phone" type="tel" value={formData.phone}
                                            onChange={(e) => handleInputChange("phone", formatPhoneNumber(e.target.value))}
                                            className={errors.phone ? "error" : ""} placeholder="+371XXXXXXXX"
                                        />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="customer">Имя клиента *</label>
                                    <input
                                        id="customer" type="text" value={formData.customer}
                                        onChange={(e) => handleInputChange("customer", e.target.value)}
                                        className={errors.customer ? "error" : ""} placeholder="Введите имя клиента"
                                    />
                                    {errors.customer && <span className="error-text">{errors.customer}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label htmlFor="street">Улица</label>
                                    <input id="street" value={formData.street} onChange={(e)=>handleInputChange("street",e.target.value)} placeholder="Введите улицу" />
                                </div>
                                <div className="form-group"><label htmlFor="house">Дом</label>
                                    <input id="house" value={formData.house} onChange={(e)=>handleInputChange("house",e.target.value)} placeholder="Введите дом" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label htmlFor="building">Корпус</label>
                                    <input id="building" value={formData.building} onChange={(e)=>handleInputChange("building",e.target.value)} placeholder="Введите корпус" />
                                </div>
                                <div className="form-group"><label htmlFor="apart">Квартира</label>
                                    <input id="apart" value={formData.apart} onChange={(e)=>handleInputChange("apart",e.target.value)} placeholder="Введите квартиру" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label htmlFor="floor">Этаж</label>
                                    <input id="floor" value={formData.floor} onChange={(e)=>handleInputChange("floor",e.target.value)} placeholder="Введите этаж" />
                                </div>
                                <div className="form-group"><label htmlFor="code">Код</label>
                                    <input id="code" value={formData.code} onChange={(e)=>handleInputChange("code",e.target.value)} placeholder="Введите код" />
                                </div>
                            </div>

                            {/* Доставка */}
                            <div className="section-header"><Truck size={20}/><h3>Доставка</h3></div>
                            <div className="form-group">
                                <label htmlFor="courier">Курьер *</label>
                                <select
                                    id="courier" value={formData.courierId}
                                    onChange={(e)=>handleInputChange("courierId", e.target.value)}
                                    className={errors.courier ? "error" : ""}>
                                    <option value="">Выберите курьера</option>
                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.nickname}</option>)}
                                </select>
                                {errors.courier && <span className="error-text">{errors.courier}</span>}
                            </div>

                            <div className="form-group">
                                <label>Тип заказа</label>
                                <div className="radio-group">
                                    <label className="radio-option">
                                        <input type="radio" name="orderType" value="active"
                                               checked={formData.orderType === "active"}
                                               onChange={(e)=>handleInputChange("orderType", e.target.value)} />
                                        <span>Активный заказ</span>
                                    </label>
                                    <label className="radio-option">
                                        <input type="radio" name="orderType" value="preorder"
                                               checked={formData.orderType === "preorder"}
                                               onChange={(e)=>handleInputChange("orderType", e.target.value)} />
                                        <span>Предзаказ</span>
                                    </label>
                                </div>
                            </div>

                            {/* Появляется только для предзаказа */}
                            {formData.orderType === "preorder" && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="scheduledDate">Дата доставки *</label>
                                            <input
                                                id="scheduledDate"
                                                type="date"
                                                min={minDate}
                                                value={formData.scheduledDate}
                                                onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                                                className={errors.scheduledDate ? "error" : ""}
                                            />
                                            {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="scheduledTime">Время доставки *</label>
                                            <input
                                                id="scheduledTime"
                                                type="time"
                                                value={formData.scheduledTime}
                                                onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                                                className={errors.scheduledTime ? "error" : ""}
                                                min={formData.scheduledDate === minDate ? minTimeToday : undefined}
                                            />
                                            {errors.scheduledTime && <span className="error-text">{errors.scheduledTime}</span>}
                                        </div>
                                    </div>
                                    <div className="hint muted" style={{ marginTop: 4 }}>
                                        Минимальное время предзаказа — через {PREORDER_MIN_OFFSET_MIN} минут от текущего момента.
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Товары */}
                        <div className="form-section">
                            <div className="section-header"><Package size={20}/><h3>Товары</h3></div>

                            <div className="form-group">
                                <label htmlFor="search">Поиск товаров *</label>
                                <div className="search-container">
                                    <div className="input-with-icon">
                                        <Search size={16}/>
                                        <input
                                            id="search" type="text" value={searchTerm}
                                            onChange={(e)=>{ setSearchTerm(e.target.value); setShowSearchResults(e.target.value.length>0); }}
                                            onFocus={()=>setShowSearchResults(searchTerm.length>0)}
                                            className={errors.items ? "error" : ""} placeholder="Начните печатать название блюда..."
                                        />
                                    </div>

                                    {showSearchResults && searchResults.length > 0 && (
                                        <div className="search-results">
                                            {searchResults.map(item => (
                                                <div key={item.id} className="search-result-item" onClick={() => addItemToOrder(item)}>
                                                    <div className="item-info">
                                                        <span className="item-name">{item.name}</span>
                                                        <span className="item-price">
                              {item.discount > 0 ? (
                                  <>
                                      <span className="original-price">€{item.price.toFixed(2)}</span>
                                      <span className="discounted-price">€{(item.price*(1-item.discount/100)).toFixed(2)}</span>
                                      <span className="discount-badge">-{item.discount}%</span>
                                  </>
                              ) : <span>€{item.price.toFixed(2)}</span>}
                            </span>
                                                    </div>
                                                    <Plus size={16} className="add-icon" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {errors.items && <span className="error-text">{errors.items}</span>}
                            </div>

                            {selectedItems.length > 0 && (
                                <div className="selected-items">
                                    <h4>Выбранные товары:</h4>
                                    {selectedItems.map(item => {
                                        const finalPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
                                        const totalPrice = finalPrice * item.quantity;
                                        return (
                                            <div key={item.id} className="selected-item">
                                                <div className="item-details">
                                                    <span className="item-name">{item.name}</span>
                                                    <div className="item-price-info">
                                                        {item.discount > 0 && <span className="discount-info">-{item.discount}%</span>}
                                                        <span className="unit-price">€{finalPrice.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="quantity-controls">
                                                    <button type="button" onClick={() => updateItemQuantity(item.id, item.quantity-1)} className="quantity-btn"><Minus size={14}/></button>
                                                    <span className="quantity">{item.quantity}</span>
                                                    <button type="button" onClick={() => updateItemQuantity(item.id, item.quantity+1)} className="quantity-btn"><Plus size={14}/></button>
                                                </div>
                                                <div className="item-total"><span>€{totalPrice.toFixed(2)}</span></div>
                                                <button type="button" onClick={() => removeItem(item.id)} className="remove-btn"><X size={16}/></button>
                                            </div>
                                        );
                                    })}
                                    <div className="order-total"><strong>Сумма к оплате: €{calculateTotal().toFixed(2)}</strong></div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="payment">Вид оплаты *</label>
                                    <select id="payment" value={formData.payment}
                                            onChange={(e)=>handleInputChange("payment", e.target.value)}
                                            className={errors.payment ? "error" : ""}>
                                        <option value="">Вид оплаты</option>
                                        {["Наличные", "Карта", "Перечислением"].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    {errors.payment && <span className="error-text">{errors.payment}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="pickup">Точка комплектации *</label>
                                    <select id="pickup" value={formData.pickupId}
                                            onChange={(e)=>handleInputChange("pickupId", e.target.value)}
                                            className={errors.restaurant ? "error" : ""}>
                                        <option value="">Выберите точку</option>
                                        {pickupPoints.map(p => <option key={p.id} value={p.id}>{p.nickname}</option>)}
                                    </select>
                                    {errors.restaurant && <span className="error-text">{errors.restaurant}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="form-section full-width">
                            <div className="section-header"><Clock size={20}/><h3>Дополнительные заметки</h3></div>
                            <div className="form-group">
                                <label htmlFor="notes">Заметки (необязательно)</label>
                                <textarea id="notes" rows="3" value={formData.notes}
                                          onChange={(e)=>handleInputChange("notes", e.target.value)}
                                          placeholder="Дополнительная информация о заказе" />
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button type="button" className="btn-secondary" onClick={onBack}>Отменить</button>
                        <button type="button" className="btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
                            <Save size={16}/> {isSubmitting ? "Создание..." : "Создать заказ"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateOrder;
