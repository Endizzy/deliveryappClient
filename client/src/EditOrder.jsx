// EditOrder.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft, Save, User, Phone, Package, Truck, Clock,
    Search, Plus, Minus, X
} from "lucide-react";
import "./CreateOrder.css";
import { useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toLocalTimeInput = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const PREORDER_MIN_OFFSET_MIN = 15;

const mapApiToUiPayment = (p) => (p === "cash" ? "Наличные" : p === "card" ? "Карта" : "Перечислением");
const mapUiToApiPayment = (p) => (p === "Наличные" ? "cash" : p === "Карта" ? "card" : "wire");

const EditOrder = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const token = useMemo(
        () => localStorage.getItem("token") || sessionStorage.getItem("token"),
        []
    );
    const authHeaders = useMemo(
        () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
        [token]
    );

    // справочники
    const [couriers, setCouriers] = useState([]);
    const [pickupPoints, setPickupPoints] = useState([]);
    const [allMenu, setAllMenu] = useState([]);

    // поиск по меню
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);

    // форма
    const [formData, setFormData] = useState({
        orderType: "active",
        status: "new",
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
        notes: "",
        scheduledDate: "",
        scheduledTime: ""
    });
    const [selectedItems, setSelectedItems] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // минимум для предзаказа
    const now = new Date();
    const minDate = toLocalDateInput(now);
    const minTimeToday = (() => {
        const t = new Date(now);
        t.setMinutes(t.getMinutes() + PREORDER_MIN_OFFSET_MIN);
        return toLocalTimeInput(t);
    })();

    // справочники
    const fetchCouriers = async () => {
        const r = await fetch(`${API}/order-support/couriers`, { headers: authHeaders });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Не удалось загрузить курьеров");
        setCouriers(d.items || []);
    };
    const fetchPickupPoints = async () => {
        const r = await fetch(`${API}/order-support/pickup-points`, { headers: authHeaders });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Не удалось загрузить точки");
        setPickupPoints(d.items || []);
    };
    const fetchAllMenu = async () => {
        const r = await fetch(`${API}/order-support/menu?all=1`, { headers: authHeaders });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Не удалось загрузить меню");
        setAllMenu(d.items || []);
    };

    // загрузка заказа
    const loadOrder = async () => {
        const r = await fetch(`${API}/current-orders/${id}`, { headers: authHeaders });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || "Не удалось получить заказ");

        const o = d.item;

        // разбор scheduledAt -> date/time
        let scheduledDate = "", scheduledTime = "";
        if (o.scheduledAt) {
            const dt = new Date(o.scheduledAt);
            scheduledDate = toLocalDateInput(dt);
            scheduledTime = toLocalTimeInput(dt);
        }

        setFormData({
            orderType: o.orderType,
            status: o.status,
            phone: o.phone || "",
            customer: o.customer || "",
            street: o.addressStreet || "",
            house: o.addressHouse || "",
            apart: o.addressApartment || "",
            building: o.addressBuilding || "",
            floor: o.addressFloor || "",
            code: o.addressCode || "",
            courierId: o.courierId || "",
            payment: mapApiToUiPayment(o.paymentMethod),
            pickupId: o.pickupId || "",
            notes: o.notes || "",
            scheduledDate,
            scheduledTime
        });
        setSelectedItems(
            (o.items || []).map(i => ({
                id: i.id, name: i.name, price: Number(i.price || 0),
                discount: Number(i.discount || 0), quantity: Number(i.quantity || 1),
            }))
        );
    };

    useEffect(() => {
        if (!token) { navigate("/login"); return; }
        (async () => {
            try {
                await Promise.all([fetchCouriers(), fetchPickupPoints(), fetchAllMenu()]);
                await loadOrder();
            } catch (e) { alert(e.message); }
        })();
    }, [token, id, navigate]); // eslint-disable-line

    const searchResults = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return [];
        const filtered = allMenu.filter(it =>
            (it.name || "").toLowerCase().includes(q) ||
            (it.category || "").toLowerCase().includes(q)
        );
        return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
    }, [searchTerm, allMenu]);

    // товары
    const addItemToOrder = (menuItem) => {
        const existing = selectedItems.find(i => i.id === menuItem.id);
        if (existing) {
            setSelectedItems(prev => prev.map(i => i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems(prev => [...prev, { ...menuItem, quantity: 1 }]);
        }
        setSearchTerm(""); setShowSearchResults(false);
    };
    const updateItemQuantity = (id2, qty) => {
        if (qty <= 0) return removeItem(id2);
        setSelectedItems(prev => prev.map(i => i.id === id2 ? { ...i, quantity: qty } : i));
    };
    const removeItem = (id2) => setSelectedItems(prev => prev.filter(i => i.id !== id2));
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

    const validateForm = () => {
        const e = {};
        if (!formData.customer.trim()) e.customer = "Имя клиента обязательно";
        if (!formData.phone.trim()) e.phone = "Телефон обязателен";
        if (selectedItems.length === 0) e.items = "Добавьте хотя бы один товар";
        if (!formData.courierId) e.courier = "Выберите курьера";
        if (!formData.pickupId) e.restaurant = "Выберите точку комплектации";
        if (!formData.payment) e.payment = "Выберите способ оплаты";
        if (formData.orderType === "preorder") {
            if (!formData.scheduledDate) e.scheduledDate = "Укажите дату доставки";
            if (!formData.scheduledTime) e.scheduledTime = "Укажите время доставки";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const scheduledAt =
                formData.orderType === "preorder" && formData.scheduledDate && formData.scheduledTime
                    ? `${formData.scheduledDate}T${formData.scheduledTime}`
                    : null;

            const payload = {
                orderType: formData.orderType,
                status: formData.status, // важное: не сбрасываем
                scheduledAt,
                courierId: Number(formData.courierId) || null,
                pickupId: Number(formData.pickupId) || null,
                payment: mapUiToApiPayment(formData.payment),
                customer: formData.customer,
                phone: formData.phone,
                street: formData.street,
                house: formData.house,
                apart: formData.apart,
                building: formData.building,
                floor: formData.floor,
                code: formData.code,
                notes: formData.notes,
                selectedItems: selectedItems.map(i => ({
                    id: i.id, name: i.name, price: i.price,
                    discount: i.discount || 0, quantity: i.quantity
                })),
            };

            const r = await fetch(`${API}/current-orders/${id}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            const d = await r.json();
            if (!r.ok || !d.ok) throw new Error(d.error || "Ошибка сохранения");

            navigate("/orderPanel");
        } catch (e) {
            alert(e.message);
        } finally {
            setIsSaving(false);
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
                        <h1>Редактирование заказа #{id}</h1>
                        <p>Измените данные и позиции, затем сохраните</p>
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
                                    <label>Телефон *</label>
                                    <div className="input-with-icon">
                                        <Phone size={16}/>
                                        <input
                                            value={formData.phone}
                                            onChange={(e)=>handleInputChange("phone", e.target.value)}
                                            className={errors.phone ? "error" : ""}
                                            placeholder="+371XXXXXXXX"
                                        />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Имя клиента *</label>
                                    <input
                                        value={formData.customer}
                                        onChange={(e)=>handleInputChange("customer", e.target.value)}
                                        className={errors.customer ? "error" : ""}
                                        placeholder="Введите имя клиента"
                                    />
                                    {errors.customer && <span className="error-text">{errors.customer}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label>Улица</label>
                                    <input value={formData.street} onChange={(e)=>handleInputChange("street",e.target.value)} />
                                </div>
                                <div className="form-group"><label>Дом</label>
                                    <input value={formData.house} onChange={(e)=>handleInputChange("house",e.target.value)} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label>Корпус</label>
                                    <input value={formData.building} onChange={(e)=>handleInputChange("building",e.target.value)} />
                                </div>
                                <div className="form-group"><label>Квартира</label>
                                    <input value={formData.apart} onChange={(e)=>handleInputChange("apart",e.target.value)} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label>Этаж</label>
                                    <input value={formData.floor} onChange={(e)=>handleInputChange("floor",e.target.value)} />
                                </div>
                                <div className="form-group"><label>Код</label>
                                    <input value={formData.code} onChange={(e)=>handleInputChange("code",e.target.value)} />
                                </div>
                            </div>

                            {/* Доставка */}
                            <div className="section-header"><Truck size={20}/><h3>Доставка</h3></div>
                            <div className="form-group">
                                <label>Курьер *</label>
                                <select
                                    value={formData.courierId}
                                    onChange={(e)=>handleInputChange("courierId", e.target.value)}
                                    className={errors.courier ? "error" : ""}>
                                    <option value="">Выберите курьера</option>
                                    {couriers.map(c => <option key={c.id} value={c.id}>{c.nickname}</option>)}
                                </select>
                                {errors.courier && <span className="error-text">{errors.courier}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Тип заказа</label>
                                    <div className="radio-group">
                                        <label className="radio-option">
                                            <input type="radio" name="orderType" value="active"
                                                   checked={formData.orderType === "active"}
                                                   onChange={(e)=>handleInputChange("orderType", e.target.value)} />
                                            <span>Активный</span>
                                        </label>
                                        <label className="radio-option">
                                            <input type="radio" name="orderType" value="preorder"
                                                   checked={formData.orderType === "preorder"}
                                                   onChange={(e)=>handleInputChange("orderType", e.target.value)} />
                                            <span>Предзаказ</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Статус</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e)=>handleInputChange("status", e.target.value)}
                                    >
                                        <option value="new">new</option>
                                        <option value="ready">ready</option>
                                        <option value="enroute">enroute</option>
                                        <option value="paused">paused</option>
                                        <option value="cancelled">cancelled</option>
                                    </select>
                                </div>
                            </div>

                            {formData.orderType === "preorder" && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Дата доставки *</label>
                                            <input
                                                type="date"
                                                min={minDate}
                                                value={formData.scheduledDate}
                                                onChange={(e)=>handleInputChange("scheduledDate", e.target.value)}
                                                className={errors.scheduledDate ? "error" : ""}
                                            />
                                            {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>Время доставки *</label>
                                            <input
                                                type="time"
                                                value={formData.scheduledTime}
                                                onChange={(e)=>handleInputChange("scheduledTime", e.target.value)}
                                                className={errors.scheduledTime ? "error" : ""}
                                                min={formData.scheduledDate === minDate ? minTimeToday : undefined}
                                            />
                                            {errors.scheduledTime && <span className="error-text">{errors.scheduledTime}</span>}
                                        </div>
                                    </div>
                                    <div className="hint muted" style={{ marginTop: 4 }}>
                                        Минимальное время предзаказа — через {PREORDER_MIN_OFFSET_MIN} минут.
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Товары */}
                        <div className="form-section">
                            <div className="section-header"><Package size={20}/><h3>Товары</h3></div>

                            <div className="form-group">
                                <label>Поиск товаров *</label>
                                <div className="search-container">
                                    <div className="input-with-icon">
                                        <Search size={16}/>
                                        <input
                                            value={searchTerm}
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
                                    <label>Вид оплаты *</label>
                                    <select
                                        value={formData.payment}
                                        onChange={(e)=>handleInputChange("payment", e.target.value)}
                                        className={errors.payment ? "error" : ""}
                                    >
                                        <option value="">Вид оплаты</option>
                                        <option>Наличные</option>
                                        <option>Карта</option>
                                        <option>Перечислением</option>
                                    </select>
                                    {errors.payment && <span className="error-text">{errors.payment}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Точка комплектации *</label>
                                    <select
                                        value={formData.pickupId}
                                        onChange={(e)=>handleInputChange("pickupId", e.target.value)}
                                        className={errors.restaurant ? "error" : ""}
                                    >
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
                                <label>Заметки (необязательно)</label>
                                <textarea rows="3" value={formData.notes}
                                          onChange={(e)=>handleInputChange("notes", e.target.value)}
                                          placeholder="Дополнительная информация о заказе" />
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button type="button" className="btn-secondary" onClick={() => navigate("/orderPanel")}>Отменить</button>
                        <button type="button" className="btn-primary" disabled={isSaving} onClick={handleSave}>
                            <Save size={16}/> {isSaving ? "Сохранение..." : "Сохранить изменения"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditOrder;
