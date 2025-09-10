import React, { useState } from "react";
import { ArrowLeft, Save, User, Phone, MapPin, Package, CreditCard, Truck, Clock, Search, Plus, Minus, X } from "lucide-react";
import './CreateOrder.css'
import {useNavigate} from "react-router-dom";

// JSON меню - в реальном приложении это бы загружалось из API
const menuItems = [
    { id: 1, name: "Суши лосось", price: 2.50, discount: 0 },
    { id: 2, name: "Суши тунец", price: 3.00, discount: 10 },
    { id: 3, name: "Суши угорь", price: 2.80, discount: 0 },
    { id: 4, name: "Ролл Калифорния", price: 8.50, discount: 0 },
    { id: 5, name: "Ролл Филадельфия", price: 9.20, discount: 15 },
    { id: 6, name: "Ролл дракон", price: 12.00, discount: 0 },
    { id: 7, name: "Рамен с курицей", price: 7.50, discount: 0 },
    { id: 8, name: "Рамен с свининой", price: 8.00, discount: 5 },
    { id: 9, name: "Удон с морепродуктами", price: 10.50, discount: 0 },
    { id: 10, name: "Пад тай с креветками", price: 9.80, discount: 0 },
    { id: 11, name: "Курица терияки", price: 8.20, discount: 0 },
    { id: 12, name: "Говядина по-корейски", price: 11.00, discount: 20 },
    { id: 13, name: "Том ям с креветками", price: 6.80, discount: 0 },
    { id: 14, name: "Мисо суп", price: 3.20, discount: 0 },
    { id: 15, name: "Спринг роллы", price: 4.50, discount: 0 },
    { id: 16, name: "Гёза с курицей", price: 5.20, discount: 0 },
    { id: 17, name: "Темпура креветки", price: 7.80, discount: 10 },
    { id: 18, name: "Салат с водорослями", price: 4.00, discount: 0 },
    { id: 19, name: "Жареный рис с яйцом", price: 5.50, discount: 0 },
    { id: 20, name: "Биф строганов по-азиатски", price: 12.50, discount: 0 },
    { id: 21, name: "Суп фо бо", price: 8.50, discount: 0 },
    { id: 22, name: "Креветки в кисло-сладком соусе", price: 10.20, discount: 0 },
    { id: 23, name: "Утка по-пекински", price: 15.00, discount: 25 },
    { id: 24, name: "Кимчи", price: 3.80, discount: 0 },
    { id: 25, name: "Зеленый чай матча", price: 2.50, discount: 0 },
    { id: 26, name: "Сакэ классик", price: 6.00, discount: 0 },
    { id: 27, name: "Мороженое темпура", price: 4.80, discount: 0 },
    { id: 28, name: "Моти ассорти", price: 5.50, discount: 0 }
];

const CreateOrder = ({ onBack, onSubmit }) => {
    const [formData, setFormData] = useState({
        phone: "",
        customer: "",
        street: "",
        house: "",
        apart: "",
        building: "",
        floor: "",
        code: "",
        courier: "",
        payment: "",
        restaurant: "",
        orderType: "active",
        notes: ""
    });

    const navigate = useNavigate()
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const courierOptions = [
        "Михаил", "Данила", "Егор", "Алексей", "Владимир"
    ];

    const paymentMethod = [
        "Наличные", "Карта", "Перечислением"
    ];

    const restaurantOptions = [
        "Briana", "Zep", "Saga"
    ];

    // Поиск товаров
    const searchResults = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8); // Ограничиваем количество результатов

    // Расчет общей суммы
    const calculateTotal = () => {
        return selectedItems.reduce((total, item) => {
            const finalPrice = item.discount > 0
                ? item.price * (1 - item.discount / 100)
                : item.price;
            return total + (finalPrice * item.quantity);
        }, 0);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }));
        }
    };

    // Добавление товара в заказ
    const addItemToOrder = (menuItem) => {
        const existingItem = selectedItems.find(item => item.id === menuItem.id);

        if (existingItem) {
            setSelectedItems(prev => prev.map(item =>
                item.id === menuItem.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setSelectedItems(prev => [...prev, { ...menuItem, quantity: 1 }]);
        }

        setSearchTerm("");
        setShowSearchResults(false);
    };

    // Изменение количества товара
    const updateItemQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeItem(itemId);
            return;
        }

        setSelectedItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, quantity: newQuantity }
                : item
        ));
    };

    // Удаление товара
    const removeItem = (itemId) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.customer.trim()) {
            newErrors.customer = "Имя клиента обязательно";
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Телефон обязателен";
        } else if (!/^\+371\d{8}$/.test(formData.phone.replace(/\s/g, ""))) {
            newErrors.phone = "Введите корректный телефон (+37127424725)";
        }

        if (selectedItems.length === 0) {
            newErrors.items = "Добавьте хотя бы один товар";
        }

        if (!formData.courier) {
            newErrors.courier = "Выберите курьера";
        }

        if (!formData.restaurant) {
            newErrors.restaurant = "Выберите точку комплектации";
        }

        if (!formData.payment) {
            newErrors.payment = "Выберите способ оплаты";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newOrder = {
            id: Date.now(),
            number: `N заказа ${Date.now()}`,
            status: formData.orderType === "preorder" ? "Новый" : "В пути",
            time: new Date().toLocaleTimeString("ru", {
                hour: "2-digit",
                minute: "2-digit"
            }) + " 00:00",
            customer: formData.customer,
            phone: formData.phone,
            amount: calculateTotal().toFixed(2),
            items: selectedItems.map(item => `${item.name} x${item.quantity}`).join(", "),
            courier: formData.courier,
            selectedItems: selectedItems
        };

        if (onSubmit) {
            onSubmit(newOrder);
        }

        setIsSubmitting(false);
    };

    const formatPhoneNumber = (value) => {
        let cleaned = value.replace(/\D/g, "");

        if (cleaned.startsWith("371")) {
            cleaned = "+" + cleaned;
        } else if (!cleaned.startsWith("+371") && cleaned.length > 0) {
            cleaned = "+371" + cleaned;
        }

        return cleaned;
    };

    return (
        <div className="create-order-page">
            <header className="header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/orderPanel')}>
                        <ArrowLeft size={20} />
                        Назад
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
                        {/* Информация о клиенте */}
                        <div className="form-section">
                            <div className="section-header">
                                <User size={20}/>
                                <h3>Информация о клиенте</h3>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="phone">Телефон *</label>
                                    <div className="input-with-icon">
                                        <Phone size={16}/>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) =>
                                                handleInputChange("phone", formatPhoneNumber(e.target.value))
                                            }
                                            className={errors.phone ? "error" : ""}
                                            placeholder="+37127424725"
                                        />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="customer">Имя клиента *</label>
                                    <input
                                        id="customer"
                                        type="text"
                                        value={formData.customer}
                                        onChange={(e) => handleInputChange("customer", e.target.value)}
                                        className={errors.customer ? "error" : ""}
                                        placeholder="Введите имя клиента"
                                    />
                                    {errors.customer && <span className="error-text">{errors.customer}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="street">Улица</label>
                                    <input
                                        id="street"
                                        type="text"
                                        value={formData.street || ""}
                                        onChange={(e) => handleInputChange("street", e.target.value)}
                                        placeholder="Введите улицу"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="house">Дом</label>
                                    <input
                                        id="house"
                                        type="text"
                                        value={formData.house || ""}
                                        onChange={(e) => handleInputChange("house", e.target.value)}
                                        placeholder="Введите дом"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="building">Корпус</label>
                                    <input
                                        id="building"
                                        type="text"
                                        value={formData.building || ""}
                                        onChange={(e) => handleInputChange("building", e.target.value)}
                                        placeholder="Введите корпус"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="apart">Квартира</label>
                                    <input
                                        id="apart"
                                        type="text"
                                        value={formData.apart || ""}
                                        onChange={(e) => handleInputChange("apart", e.target.value)}
                                        placeholder="Введите квартиру"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="floor">Этаж</label>
                                    <input
                                        id="floor"
                                        type="text"
                                        value={formData.floor || ""}
                                        onChange={(e) => handleInputChange("floor", e.target.value)}
                                        placeholder="Введите этаж"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="code">Код</label>
                                    <input
                                        id="code"
                                        type="text"
                                        value={formData.code || ""}
                                        onChange={(e) => handleInputChange("code", e.target.value)}
                                        placeholder="Введите код"
                                    />
                                </div>
                            </div>
                            {/* ДОСТАВКА */}
                            <div className="section-header">
                                <Truck size={20}/>
                                <h3>Доставка</h3>
                            </div>

                            <div className="form-group">
                                <label htmlFor="courier">Курьер *</label>
                                <select
                                    id="courier"
                                    value={formData.courier}
                                    onChange={(e) => handleInputChange("courier", e.target.value)}
                                    className={errors.courier ? "error" : ""}
                                >
                                    <option value="">Выберите курьера</option>
                                    {courierOptions.map(courier => (
                                        <option key={courier} value={courier}>
                                            {courier}
                                        </option>
                                    ))}
                                </select>
                                {errors.courier && <span className="error-text">{errors.courier}</span>}
                            </div>

                            <div className="form-group">
                                <label>Тип заказа</label>
                                <div className="radio-group">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="orderType"
                                            value="active"
                                            checked={formData.orderType === "active"}
                                            onChange={(e) => handleInputChange("orderType", e.target.value)}
                                        />
                                        <span>Активный заказ</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="orderType"
                                            value="preorder"
                                            checked={formData.orderType === "preorder"}
                                            onChange={(e) => handleInputChange("orderType", e.target.value)}
                                        />
                                        <span>Предзаказ</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Товары */}
                        <div className="form-section">
                            <div className="section-header">
                                <Package size={20}/>
                                <h3>Товары</h3>
                            </div>

                            {/* Поиск товаров */}
                            <div className="form-group">
                                <label htmlFor="search">Поиск товаров *</label>
                                <div className="search-container">
                                    <div className="input-with-icon">
                                        <Search size={16}/>
                                        <input
                                            id="search"
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowSearchResults(e.target.value.length > 0);
                                            }}
                                            onFocus={() => setShowSearchResults(searchTerm.length > 0)}
                                            className={errors.items ? "error" : ""}
                                            placeholder="Начните печатать название блюда..."
                                        />
                                    </div>

                                    {/* Результаты поиска */}
                                    {showSearchResults && searchResults.length > 0 && (
                                        <div className="search-results">
                                            {searchResults.map(item => (
                                                <div
                                                    key={item.id}
                                                    className="search-result-item"
                                                    onClick={() => addItemToOrder(item)}
                                                >
                                                    <div className="item-info">
                                                        <span className="item-name">{item.name}</span>
                                                        <span className="item-price">
                                                            {item.discount > 0 ? (
                                                                <>
                                                                    <span
                                                                        className="original-price">€{item.price.toFixed(2)}</span>
                                                                    <span className="discounted-price">
                                                                        €{(item.price * (1 - item.discount / 100)).toFixed(2)}
                                                                    </span>
                                                                    <span className="discount-badge">-{item.discount}%</span>
                                                                </>
                                                            ) : (
                                                                <span>€{item.price.toFixed(2)}</span>
                                                            )}
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

                            {/* Выбранные товары */}
                            {selectedItems.length > 0 && (
                                <div className="selected-items">
                                    <h4>Выбранные товары:</h4>
                                    {selectedItems.map(item => {
                                        const finalPrice = item.discount > 0
                                            ? item.price * (1 - item.discount / 100)
                                            : item.price;
                                        const totalPrice = finalPrice * item.quantity;

                                        return (
                                            <div key={item.id} className="selected-item">
                                                <div className="item-details">
                                                    <span className="item-name">{item.name}</span>
                                                    <div className="item-price-info">
                                                        {item.discount > 0 && (
                                                            <span className="discount-info">-{item.discount}%</span>
                                                        )}
                                                        <span className="unit-price">€{finalPrice.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="quantity-controls">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                                        className="quantity-btn"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="quantity">{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                                        className="quantity-btn"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <div className="item-total">
                                                    <span>€{totalPrice.toFixed(2)}</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="remove-btn"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    <div className="order-total">
                                        <strong>Сумма к оплате: €{calculateTotal().toFixed(2)}</strong>
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="payment">Вид оплаты *</label>
                                    <select
                                        id="payment"
                                        value={formData.payment}
                                        onChange={(e) => handleInputChange("payment", e.target.value)}
                                        className={errors.payment ? "error" : ""}
                                    >
                                        <option value="">Вид оплаты</option>
                                        {paymentMethod.map(method => (
                                            <option key={method} value={method}>
                                                {method}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.payment && <span className="error-text">{errors.payment}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="restaurant">Точка комплектации *</label>
                                    <select
                                        id="restaurant"
                                        value={formData.restaurant}
                                        onChange={(e) => handleInputChange("restaurant", e.target.value)}
                                        className={errors.restaurant ? "error" : ""}
                                    >
                                        <option value="">Ресторан</option>
                                        {restaurantOptions.map(restaurant => (
                                            <option key={restaurant} value={restaurant}>
                                                {restaurant}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.restaurant && <span className="error-text">{errors.restaurant}</span>}
                                </div>
                            </div>
                        </div>

                        {/*/!* Доставка *!/*/}
                        {/*<div className="form-section">*/}
                        {/*    <div className="section-header">*/}
                        {/*        <Truck size={20}/>*/}
                        {/*        <h3>Доставка</h3>*/}
                        {/*    </div>*/}

                        {/*    <div className="form-group">*/}
                        {/*        <label htmlFor="courier">Курьер *</label>*/}
                        {/*        <select*/}
                        {/*            id="courier"*/}
                        {/*            value={formData.courier}*/}
                        {/*            onChange={(e) => handleInputChange("courier", e.target.value)}*/}
                        {/*            className={errors.courier ? "error" : ""}*/}
                        {/*        >*/}
                        {/*            <option value="">Выберите курьера</option>*/}
                        {/*            {courierOptions.map(courier => (*/}
                        {/*                <option key={courier} value={courier}>*/}
                        {/*                    {courier}*/}
                        {/*                </option>*/}
                        {/*            ))}*/}
                        {/*        </select>*/}
                        {/*        {errors.courier && <span className="error-text">{errors.courier}</span>}*/}
                        {/*    </div>*/}

                        {/*    <div className="form-group">*/}
                        {/*        <label>Тип заказа</label>*/}
                        {/*        <div className="radio-group">*/}
                        {/*            <label className="radio-option">*/}
                        {/*                <input*/}
                        {/*                    type="radio"*/}
                        {/*                    name="orderType"*/}
                        {/*                    value="active"*/}
                        {/*                    checked={formData.orderType === "active"}*/}
                        {/*                    onChange={(e) => handleInputChange("orderType", e.target.value)}*/}
                        {/*                />*/}
                        {/*                <span>Активный заказ</span>*/}
                        {/*            </label>*/}
                        {/*            <label className="radio-option">*/}
                        {/*                <input*/}
                        {/*                    type="radio"*/}
                        {/*                    name="orderType"*/}
                        {/*                    value="preorder"*/}
                        {/*                    checked={formData.orderType === "preorder"}*/}
                        {/*                    onChange={(e) => handleInputChange("orderType", e.target.value)}*/}
                        {/*                />*/}
                        {/*                <span>Предзаказ</span>*/}
                        {/*            </label>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/* Дополнительные заметки */}
                        <div className="form-section full-width">
                            <div className="section-header">
                                <Clock size={20} />
                                <h3>Дополнительные заметки</h3>
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">Заметки (необязательно)</label>
                                <textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange("notes", e.target.value)}
                                    placeholder="Дополнительная информация о заказе"
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onBack}
                        >
                            Отменить
                        </button>

                        <button
                            type="button"
                            className="btn-primary"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                        >
                            <Save size={16} />
                            {isSubmitting ? "Создание..." : "Создать заказ"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateOrder;