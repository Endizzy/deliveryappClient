import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Package,
  Truck,
  Clock,
  Search,
  Plus,
  Minus,
  X,
} from "lucide-react";
import "./CreateOrder.css";
import { useNavigate } from "react-router-dom";
import useNotification from "./hooks/useNotification.jsx";
import { useTranslation } from "react-i18next";
import {
  discountedUnitCents,
  formatCents,
  lineTotalCents,
  toCents,
} from "./utils/money.js";

// формат номера LV
const formatPhoneNumber = (value) => {
  let cleaned = value.replace(/\D/g, "");
  if (cleaned.startsWith("371")) cleaned = "+" + cleaned;
  else if (!cleaned.startsWith("+371") && cleaned.length > 0)
    cleaned = "+371" + cleaned;
  return cleaned;
};

// хелперы для дат/времени
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalDateInput = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toLocalTimeInput = (d) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const PREORDER_MIN_OFFSET_MIN = 15;

const CreateOrder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  // ---- auth ----
  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const notify = useNotification();

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
    numOfPeople: "",
    courierId: "",
    deliveryFee: "",
    payment: "", // 'cash' | 'card' | 'wire'
    pickupId: "",
    orderType: "active",
    notes: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  // формат числа и защита
  const deliveryFeeNum = Number(String(formData.deliveryFee).replace(",", "."));
  const safeDeliveryFee = Number.isFinite(deliveryFeeNum) ? deliveryFeeNum : 0;

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // iframe для карты доставки
  const [isMapOpen, setIsMapOpen] = useState(false);
  const MAP_MID = "1HWH688Qze6v_yyq6CpIzY87597ZF2YQM";
  const mapEmbedSrc = `https://www.google.com/maps/d/u/0/embed?mid=${MAP_MID}&ehbc=2E312F`;

  // Если вдруг у кого-то не откроется, можно быстро переключить на:
  // const mapEmbedSrc = `https://www.google.com/maps/d/u/0/viewer?mid=1HWH688Qze6v_yyq6CpIzY87597ZF2YQM&ll=56.94018698553399%2C24.21356397349821&z=11`;

  // ---- курьеры/точки/меню ----
  const [couriers, setCouriers] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [allMenu, setAllMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleUnauthorized = useCallback(() => {
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch (e) { }
    navigate("/login");
  }, [navigate]);

  const fetchCouriers = useCallback(async () => {
    const res = await fetch(`${API}/order-support/couriers`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok)
      throw new Error(
        data.error || t("createOrder.errors.couriersLoadFailed")
      );
    setCouriers(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  const fetchPickupPoints = useCallback(async () => {
    const res = await fetch(`${API}/order-support/pickup-points`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok)
      throw new Error(
        data.error || t("createOrder.errors.pickupPointsLoadFailed")
      );
    setPickupPoints(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  const fetchAllMenu = useCallback(async () => {
    const res = await fetch(`${API}/order-support/menu?all=1`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok)
      throw new Error(data.error || t("createOrder.errors.menuLoadFailed"));
    setAllMenu(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        await Promise.all([fetchCouriers(), fetchPickupPoints(), fetchAllMenu()]);
      } catch (e) {
        notify({
          type: "error",
          title: t("createOrder.notifications.loadErrorTitle"),
          message: e.message || t("createOrder.notifications.loadErrorMessage"),
          duration: 5000,
        });
      }
    })();
  }, [
    token,
    navigate,
    fetchCouriers,
    fetchPickupPoints,
    fetchAllMenu,
    notify,
    t,
  ]);

  // локальный поиск
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const filtered = allMenu.filter(
      (it) =>
        (it.name || "").toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
  }, [searchTerm, allMenu]);

  // ---- выбранные товары ----
  const [selectedItems, setSelectedItems] = useState([]);

  const addItemToOrder = (menuItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...menuItem, quantity: 1 }];
    });
    setSearchTerm("");
    setShowSearchResults(false);
  };

  const removeItem = (id) =>
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));

  const updateItemQuantity = (id, qty) => {
    if (qty <= 0) return removeItem(id);
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  };

  const calculateItemsTotalCents = () =>
    selectedItems.reduce(
      (sumCents, it) => sumCents + lineTotalCents(it.price, it.discount, it.quantity),
      0
    );

  const calculateGrandTotalCents = () =>
    calculateItemsTotalCents() + toCents(safeDeliveryFee);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));

    if (field === "orderType" && value === "active") {
      setFormData((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
      setErrors((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
    }
  };

  // минимум для предзаказа
  const now = new Date();
  const minDate = toLocalDateInput(now);
  const minTimeToday = (() => {
    const t0 = new Date(now);
    t0.setMinutes(t0.getMinutes() + PREORDER_MIN_OFFSET_MIN);
    return toLocalTimeInput(t0);
  })();

  const validateForm = () => {
    const e = {};

    if (!formData.customer.trim())
      e.customer = t("createOrder.validation.customerRequired");

    if (!formData.phone.trim())
      e.phone = t("createOrder.validation.phoneRequired");
    else if (!/^\+371\d{8}$/.test(formData.phone.replace(/\s/g, ""))) {
      e.phone = t("createOrder.validation.phoneInvalid");
    }

    if (selectedItems.length === 0)
      e.items = t("createOrder.validation.itemsRequired");

    if (!formData.courierId)
      e.courier = t("createOrder.validation.courierRequired");
    if (!formData.pickupId)
      e.restaurant = t("createOrder.validation.pickupRequired");
    if (!formData.payment)
      e.payment = t("createOrder.validation.paymentRequired");

    if (formData.orderType === "preorder") {
      if (!formData.scheduledDate)
        e.scheduledDate = t("createOrder.validation.scheduledDateRequired");
      if (!formData.scheduledTime)
        e.scheduledTime = t("createOrder.validation.scheduledTimeRequired");

      if (formData.scheduledDate && formData.scheduledTime) {
        const scheduled = new Date(
          `${formData.scheduledDate}T${formData.scheduledTime}`
        );
        const minAllowed = new Date();
        minAllowed.setMinutes(minAllowed.getMinutes() + PREORDER_MIN_OFFSET_MIN);
        if (scheduled < minAllowed) {
          e.scheduledTime = t("createOrder.validation.scheduledTooEarly", {
            min: PREORDER_MIN_OFFSET_MIN,
          });
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // submit -> API
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      notify({
        type: "error",
        title: t("createOrder.notifications.validationErrorTitle"),
        message: t("createOrder.notifications.validationErrorMessage"),
        duration: 4500,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledAt =
        formData.orderType === "preorder" &&
          formData.scheduledDate &&
          formData.scheduledTime
          ? `${formData.scheduledDate}T${formData.scheduledTime}`
          : null;

      const payload = {
        orderType: formData.orderType,
        status: "new",
        scheduledAt,
        courierId: Number(formData.courierId) || null,
        pickupId: Number(formData.pickupId) || null,
        payment: formData.payment, // 'cash' | 'card' | 'wire'
        deliveryFee: safeDeliveryFee,

        customer: formData.customer.trim(),
        phone: formData.phone.trim(),

        street: formData.street.trim(),
        house: formData.house.trim(),
        apart: formData.apart.trim(),
        building: formData.building.trim(),
        floor: formData.floor.trim(),
        code: formData.code.trim(),
        numOfPeople: formData.numOfPeople.trim(),

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

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("createOrder.errors.createOrderFailed"));
      }

      notify({
        type: "success",
        title: t("createOrder.notifications.createdTitle"),
        message: t("createOrder.notifications.createdMessage"),
        duration: 4500,
      });

      navigate("/orderPanel");
    } catch (e) {
      notify({
        type: "error",
        title: t("createOrder.notifications.createErrorTitle"),
        message: e.message || t("createOrder.notifications.createErrorMessage"),
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-order-page">
      <header className="header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/orderPanel")}>
            <ArrowLeft size={20} /> {t("createOrder.back")}
          </button>

          <div className="page-title">
            <h1>{t("createOrder.title")}</h1>
            <p>{t("createOrder.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="form-container">
        <div className="order-form">
          <div className="form-grid">
            {/* Клиент */}
            <div className="form-section">
              <div className="section-header">
                <User size={20} />
                <h3>{t("createOrder.sections.customerInfo")}</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">{t("createOrder.fields.phone")} *</label>
                  <div className="input-with-icon">
                    <Phone size={16} />
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", formatPhoneNumber(e.target.value))
                      }
                      className={errors.phone ? "error" : ""}
                      placeholder={t("createOrder.placeholders.phone")}
                    />
                  </div>
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="customer">{t("createOrder.fields.customer")} *</label>
                  <input
                    id="customer"
                    type="text"
                    value={formData.customer}
                    onChange={(e) => handleInputChange("customer", e.target.value)}
                    className={errors.customer ? "error" : ""}
                    placeholder={t("createOrder.placeholders.customer")}
                  />
                  {errors.customer && (
                    <span className="error-text">{errors.customer}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="street">{t("createOrder.fields.street")}</label>
                  <input
                    id="street"
                    value={formData.street}
                    onChange={(e) => handleInputChange("street", e.target.value)}
                    placeholder={t("createOrder.placeholders.street")}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="house">{t("createOrder.fields.house")}</label>
                  <input
                    id="house"
                    value={formData.house}
                    onChange={(e) => handleInputChange("house", e.target.value)}
                    placeholder={t("createOrder.placeholders.house")}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="building">{t("createOrder.fields.building")}</label>
                  <input
                    id="building"
                    value={formData.building}
                    onChange={(e) => handleInputChange("building", e.target.value)}
                    placeholder={t("createOrder.placeholders.building")}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apart">{t("createOrder.fields.apart")}</label>
                  <input
                    id="apart"
                    value={formData.apart}
                    onChange={(e) => handleInputChange("apart", e.target.value)}
                    placeholder={t("createOrder.placeholders.apart")}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="floor">{t("createOrder.fields.floor")}</label>
                  <input
                    id="floor"
                    value={formData.floor}
                    onChange={(e) => handleInputChange("floor", e.target.value)}
                    placeholder={t("createOrder.placeholders.floor")}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="code">{t("createOrder.fields.code")}</label>
                  <input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    placeholder={t("createOrder.placeholders.code")}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="numOfPeople">{t("createOrder.fields.numOfPeople")}</label>
                  <input
                    id="numOfPeople"
                    value={formData.numOfPeople}
                    onChange={(e) => handleInputChange("numOfPeople", e.target.value)}
                    placeholder={t("createOrder.placeholders.numOfPeople")}
                  />
                </div>
              </div>

              {/* Доставка */}
              <div className="section-header">
                <Truck size={20} />
                <h3>{t("createOrder.sections.delivery")}</h3>
              </div>

              <div className="form-group">
                <label htmlFor="deliveryFee">{t("createOrder.fields.deliveryFee")} €</label>
                <input
                  id="deliveryFee"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={formData.deliveryFee}
                  onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
                  placeholder={t("createOrder.placeholders.deliveryFee")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="courier">{t("createOrder.fields.courier")} *</label>
                <select
                  id="courier"
                  value={formData.courierId}
                  onChange={(e) => handleInputChange("courierId", e.target.value)}
                  className={errors.courier ? "error" : ""}
                >
                  <option value="">{t("createOrder.placeholders.courier")}</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nickname}
                    </option>
                  ))}
                </select>
                {errors.courier && (
                  <span className="error-text">{errors.courier}</span>
                )}
              </div>

              <div className="form-group">
                <label>{t("createOrder.fields.orderType")}</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="orderType"
                      value="active"
                      checked={formData.orderType === "active"}
                      onChange={(e) => handleInputChange("orderType", e.target.value)}
                    />
                    <span>{t("createOrder.orderType.active")}</span>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="orderType"
                      value="preorder"
                      checked={formData.orderType === "preorder"}
                      onChange={(e) => handleInputChange("orderType", e.target.value)}
                    />
                    <span>{t("createOrder.orderType.preorder")}</span>
                  </label>
                </div>
              </div>

              {/* Появляется только для предзаказа */}
              {formData.orderType === "preorder" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="scheduledDate">
                        {t("createOrder.fields.scheduledDate")} *
                      </label>
                      <input
                        id="scheduledDate"
                        type="date"
                        min={minDate}
                        value={formData.scheduledDate}
                        onChange={(e) =>
                          handleInputChange("scheduledDate", e.target.value)
                        }
                        className={errors.scheduledDate ? "error" : ""}
                      />
                      {errors.scheduledDate && (
                        <span className="error-text">{errors.scheduledDate}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="scheduledTime">
                        {t("createOrder.fields.scheduledTime")} *
                      </label>
                      <input
                        id="scheduledTime"
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) =>
                          handleInputChange("scheduledTime", e.target.value)
                        }
                        className={errors.scheduledTime ? "error" : ""}
                        min={formData.scheduledDate === minDate ? minTimeToday : undefined}
                      />
                      {errors.scheduledTime && (
                        <span className="error-text">{errors.scheduledTime}</span>
                      )}
                    </div>
                  </div>

                  <div className="hint muted" style={{ marginTop: 4 }}>
                    {t("createOrder.preorderHint", { min: PREORDER_MIN_OFFSET_MIN })}
                  </div>
                </>
              )}
            </div>

            {/* Товары */}
            <div className="form-section">
              <div className="section-header">
                <Package size={20} />
                <h3>{t("createOrder.sections.items")}</h3>
              </div>

              <div className="form-group">
                <label htmlFor="search">{t("createOrder.fields.searchItems")} *</label>
                <div className="search-container">
                  <div className="input-with-icon">
                    <Search size={16} />
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
                      placeholder={t("createOrder.placeholders.search")}
                    />
                  </div>

                  {showSearchResults && searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map((item) => (
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
                                  <span className="original-price">
                                    €{formatCents(toCents(item.price))}
                                  </span>
                                  <span className="discounted-price">
                                    €{formatCents(
                                      discountedUnitCents(item.price, item.discount)
                                    )}
                                  </span>
                                  <span className="discount-badge">
                                    -{item.discount}%
                                  </span>
                                </>
                              ) : (
                                <span>€{formatCents(toCents(item.price))}</span>
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

              {selectedItems.length > 0 && (
                <div className="selected-items">
                  <h4>{t("createOrder.selectedItemsTitle")}</h4>

                  {selectedItems.map((item) => {
                    const unitCents = discountedUnitCents(item.price, item.discount);
                    const totalCents = unitCents * item.quantity;

                    return (
                      <div key={item.id} className="selected-item">
                        <div className="item-details">
                          <span className="item-name">{item.name}</span>
                          <div className="item-price-info">
                            {item.discount > 0 && (
                              <span className="discount-info">-{item.discount}%</span>
                            )}
                            <span className="unit-price">€{formatCents(unitCents)}</span>
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
                          <span>€{formatCents(totalCents)}</span>
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
                    <div className="text-muted">
                      {t("createOrder.fields.itemsPrice")}: {formatCents(calculateItemsTotalCents())}€
                    </div>
                    <div className="text-muted">
                      {t("createOrder.fields.deliveryFee")}: {formatCents(toCents(safeDeliveryFee))}€
                    </div>
                    <strong className="text-total">
                      {t("createOrder.fields.totalPrice")}: {formatCents(calculateGrandTotalCents())}€
                    </strong>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="payment">{t("createOrder.fields.payment")} *</label>
                  <select
                    id="payment"
                    value={formData.payment}
                    onChange={(e) => handleInputChange("payment", e.target.value)}
                    className={errors.payment ? "error" : ""}
                  >
                    <option value="">{t("createOrder.placeholders.payment")}</option>
                    <option value="cash">{t("createOrder.payment.cash")}</option>
                    <option value="card">{t("createOrder.payment.card")}</option>
                    <option value="wire">{t("createOrder.payment.wire")}</option>
                  </select>
                  {errors.payment && (
                    <span className="error-text">{errors.payment}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="pickup">{t("createOrder.fields.pickup")} *</label>
                  <select
                    id="pickup"
                    value={formData.pickupId}
                    onChange={(e) => handleInputChange("pickupId", e.target.value)}
                    className={errors.restaurant ? "error" : ""}
                  >
                    <option value="">{t("createOrder.placeholders.pickup")}</option>
                    {pickupPoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname}
                      </option>
                    ))}
                  </select>
                  {errors.restaurant && (
                    <span className="error-text">{errors.restaurant}</span>
                  )}
                </div>
              </div>
              {/* Карта зон доставки / проверка адреса */}
              <label>{t("createOrder.fields.mapCheck") || "Проверка адреса по карте"}</label>

              <div
                className="map-preview"
                role="button"
                tabIndex={0}
                onClick={() => setIsMapOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && setIsMapOpen(true)}
                title="Открыть карту"
              >
                <iframe
                  src={mapEmbedSrc}
                  className="map-iframe"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="map-preview-overlay">
                  <span>Нажми, чтобы увеличить</span>
                </div>
              </div>
            </div>

            <div className="form-section full-width">
              <div className="section-header">
                <Clock size={20} />
                <h3>{t("createOrder.sections.notes")}</h3>
              </div>

              <div className="form-group">
                <label htmlFor="notes">{t("createOrder.fields.notes")}</label>
                <textarea
                  id="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("createOrder.placeholders.notes")}
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/orderPanel")}
              disabled={isSubmitting}
            >
              {t("createOrder.buttons.cancel")}
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              <Save size={16} />{" "}
              {isSubmitting
                ? t("createOrder.buttons.creating")
                : t("createOrder.buttons.create")}
            </button>
          </div>
          {isMapOpen && (
            <div className="map-modal" onClick={() => setIsMapOpen(false)}>
              <div className="map-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="map-modal-header">
                  <div className="map-modal-title">Карта зон доставки</div>
                  <button
                    type="button"
                    className="map-modal-close"
                    onClick={() => setIsMapOpen(false)}
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>

                <iframe
                  src={mapEmbedSrc}
                  className="map-iframe map-iframe--large"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;