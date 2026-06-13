import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import "./CreateOrder.css";
import { useNavigate } from "react-router-dom";
import useNotification from "./hooks/useNotification.jsx";
import { useTranslation } from "react-i18next";
import { toCents } from "./utils/money.js";
import { normalizePhoneForLookup } from "./utils/phone.js";
import { toLocalDateInput, toLocalTimeInput } from "./utils/datetime.js";
import useOrderResources from "./hooks/useOrderResources.js";
import useCustomerLookup from "./hooks/useCustomerLookup.js";
import useOrderItems from "./hooks/useOrderItems.js";
import CustomerSection from "./components/CreateOrder/CustomerSection.jsx";
import ItemsSection from "./components/CreateOrder/ItemsSection.jsx";
import NotesSection from "./components/CreateOrder/NotesSection.jsx";
import DeliveryMapModal from "./components/CreateOrder/DeliveryMapModal.jsx";
import { findZoneForPoint } from "./utils/zones.js";

const PREORDER_MIN_OFFSET_MIN = 15;

const CreateOrder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

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
    payment: "",
    pickupId: "",
    orderType: "active",
    notes: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  const deliveryFeeNum = Number(String(formData.deliveryFee).replace(",", "."));
  const safeDeliveryFee = Number.isFinite(deliveryFeeNum) ? deliveryFeeNum : 0;

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Проверка адреса доставки на карте ──
  // geo: { lat, lng } | null — текущая точка на карте
  // geoConfirmed: адрес проверен и подтверждён администратором (обязательно перед созданием)
  const [geo, setGeo] = useState(null);
  const [geoConfirmed, setGeoConfirmed] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Зоны доставки компании (для показа на карте и определения зоны точки)
  const [zones, setZones] = useState([]);
  const currentZone = useMemo(
    () => (geo ? findZoneForPoint(geo.lat, geo.lng, zones) : null),
    [geo, zones]
  );

  // Загружаем зоны компании один раз
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/delivery-zones`, { headers: authHeaders });
        if (res.status === 401) return;
        const data = await res.json();
        if (res.ok && data.ok) setZones(data.zones || []);
      } catch (e) {
        // зоны не критичны для создания заказа
      }
    })();
  }, [API, authHeaders]);

  // Модалка с большой интерактивной картой адреса доставки
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleUnauthorized = useCallback(() => {
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    } catch (e) { }
    navigate("/login");
  }, [navigate]);

  // ---- курьеры/точки/меню ----
  const { couriers, pickupPoints, allMenu } = useOrderResources({
    API,
    authHeaders,
    token,
    navigate,
    notify,
    t,
    handleUnauthorized,
  });

  // ---- lookup клиента по номеру ----
  const {
    customerLookupData,
    phoneLookupState,
    markApplied,
    handlePhoneChanged,
    reset: resetCustomerLookup,
  } = useCustomerLookup({
    phone: formData.phone,
    API,
    authHeaders,
    handleUnauthorized,
    t,
  });

  // ---- поиск по меню ----
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  // ---- позиции заказа ----
  const { selectedItems, addItem, removeItem, updateItemQuantity, itemsTotalCents } =
    useOrderItems();

  const addItemToOrder = (menuItem) => {
    addItem(menuItem);
    setSearchTerm("");
    setShowSearchResults(false);
  };

  const calculateItemsTotalCents = itemsTotalCents;

  const calculateGrandTotalCents = () =>
    itemsTotalCents() + toCents(safeDeliveryFee);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "orderType" && value === "active") {
        next.scheduledDate = "";
        next.scheduledTime = "";
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "orderType" && value === "active") {
      setErrors((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
    }

    if (field === "phone") {
      handlePhoneChanged(value);
    }

    // Любое изменение адреса требует повторной проверки на карте
    if (["street", "house", "building", "apart"].includes(field)) {
      setGeoConfirmed(false);
      setGeoError(null);
    }
  };

  // ── Геокодинг адреса через сервер (ключ Geoapify скрыт на бэкенде) ──
  const verifyAddress = useCallback(async () => {
    if (!formData.street.trim()) return;
    setGeoLoading(true);
    setGeoError(null);
    try {
      const res = await fetch(`${API}/geocode`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          street: formData.street,
          house: formData.house,
          building: formData.building,
          apart: formData.apart,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.ok || !Number.isFinite(Number(data.lat))) {
        throw new Error(data.error || "geocode failed");
      }
      setGeo({ lat: Number(data.lat), lng: Number(data.lng) });
      setGeoConfirmed(false);
    } catch (e) {
      setGeo(null);
      setGeoConfirmed(false);
      setGeoError(
        t("createOrder.map.error", {
          defaultValue:
            "Не удалось определить координаты. Уточните адрес и попробуйте снова.",
        })
      );
    } finally {
      setGeoLoading(false);
    }
  }, [API, authHeaders, formData.street, formData.house, formData.building, formData.apart, handleUnauthorized, t]);

  // Перетаскивание маркера админом → координаты обновлены, требуется повторное подтверждение
  const handleMarkerMove = useCallback((latlng) => {
    if (!latlng || !Number.isFinite(latlng.lat)) return;
    setGeo({ lat: latlng.lat, lng: latlng.lng });
    setGeoConfirmed(false);
  }, []);

  const confirmAddress = useCallback(() => {
    if (geo) {
      setGeoConfirmed(true);
      setErrors((prev) => ({ ...prev, address: "" }));
    }
  }, [geo]);

  const applyFoundCustomerData = useCallback(() => {
    if (!customerLookupData) return;

    setFormData((prev) => ({
      ...prev,
      customer: customerLookupData.customerName || "",
      street: customerLookupData.street || "",
      house: customerLookupData.house || "",
      apart: customerLookupData.apart || "",
      building: customerLookupData.building || "",
      floor: customerLookupData.floor || "",
      code: customerLookupData.code || "",
      notes: customerLookupData.notes || "",
    }));

    // Адрес сменился — требуется заново проверить на карте
    setGeo(null);
    setGeoConfirmed(false);
    setGeoError(null);

    markApplied(formData.phone);
  }, [customerLookupData, formData.phone, markApplied]);

  const clearCustomerFields = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      phone: "",
      customer: "",
      street: "",
      house: "",
      apart: "",
      building: "",
      floor: "",
      code: "",
      notes: "",
    }));

    setGeo(null);
    setGeoConfirmed(false);
    setGeoError(null);

    resetCustomerLookup();
  }, [resetCustomerLookup]);

  const now = new Date();
  const minDate = toLocalDateInput(now);
  const minTimeToday = (() => {
    const t0 = new Date(now);
    t0.setMinutes(t0.getMinutes() + PREORDER_MIN_OFFSET_MIN);
    return toLocalTimeInput(t0);
  })();

  const validateForm = () => {
    const e = {};

    if (!formData.customer.trim()) {
      e.customer = t("createOrder.validation.customerRequired");
    }

    if (!formData.phone.trim()) {
      e.phone = t("createOrder.validation.phoneRequired");
    } else if (!/^\+\d{8,15}$/.test(formData.phone.replace(/\s/g, ""))) {
      e.phone = t("createOrder.validation.phoneInvalid");
    }

    if (selectedItems.length === 0) {
      e.items = t("createOrder.validation.itemsRequired");
    }

    if (!formData.pickupId) {
      e.restaurant = t("createOrder.validation.pickupRequired");
    }

    if (!formData.payment) {
      e.payment = t("createOrder.validation.paymentRequired");
    }

    // Если указан адрес доставки — он должен быть проверен и подтверждён на карте
    if (formData.street.trim() && (!geoConfirmed || !geo)) {
      e.address = t("createOrder.map.mustConfirm", {
        defaultValue: "Подтвердите адрес доставки на карте перед созданием заказа",
      });
    }

    if (formData.orderType === "preorder") {
      if (!formData.scheduledDate) {
        e.scheduledDate = t("createOrder.validation.scheduledDateRequired");
      }

      if (!formData.scheduledTime) {
        e.scheduledTime = t("createOrder.validation.scheduledTimeRequired");
      }

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
          ? new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString()
          : null;

      const payload = {
        orderType: formData.orderType,
        status: "new",
        scheduledAt,
        courierId: Number(formData.courierId) || null,
        pickupId: Number(formData.pickupId) || null,
        payment: formData.payment,
        deliveryFee: safeDeliveryFee,

        customer: formData.customer.trim(),
        phone: normalizePhoneForLookup(formData.phone),

        street: formData.street.trim(),
        house: formData.house.trim(),
        apart: formData.apart.trim(),
        building: formData.building.trim(),
        floor: formData.floor.trim(),
        code: formData.code.trim(),
        numOfPeople: formData.numOfPeople.trim(),

        // Подтверждённые на карте координаты доставки (сервер сохранит их как есть)
        addressLat: geo?.lat ?? null,
        addressLng: geo?.lng ?? null,

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

  const showApplyDataButton =
    phoneLookupState === "found" && !!customerLookupData;

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
            <CustomerSection
              t={t}
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              phoneLookupState={phoneLookupState}
              customerLookupData={customerLookupData}
              showApplyDataButton={showApplyDataButton}
              applyFoundCustomerData={applyFoundCustomerData}
              clearCustomerFields={clearCustomerFields}
              couriers={couriers}
              minDate={minDate}
              minTimeToday={minTimeToday}
              preorderMinOffset={PREORDER_MIN_OFFSET_MIN}
            />

            <ItemsSection
              t={t}
              errors={errors}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showSearchResults={showSearchResults}
              setShowSearchResults={setShowSearchResults}
              searchResults={searchResults}
              addItemToOrder={addItemToOrder}
              selectedItems={selectedItems}
              updateItemQuantity={updateItemQuantity}
              removeItem={removeItem}
              calculateItemsTotalCents={calculateItemsTotalCents}
              calculateGrandTotalCents={calculateGrandTotalCents}
              safeDeliveryFee={safeDeliveryFee}
              formData={formData}
              handleInputChange={handleInputChange}
              pickupPoints={pickupPoints}
              geo={geo}
              geoConfirmed={geoConfirmed}
              geoLoading={geoLoading}
              geoError={geoError}
              addressError={errors.address}
              onVerifyAddress={verifyAddress}
              onConfirmAddress={confirmAddress}
              onMarkerMove={handleMarkerMove}
              onExpandMap={() => setIsMapOpen(true)}
              zones={zones}
              currentZone={currentZone}
            />

            <NotesSection
              t={t}
              formData={formData}
              handleInputChange={handleInputChange}
            />
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

          {isMapOpen && geo && (
            <DeliveryMapModal
              t={t}
              position={geo}
              onChange={handleMarkerMove}
              confirmed={geoConfirmed}
              zones={zones}
              onConfirm={() => {
                confirmAddress();
                setIsMapOpen(false);
              }}
              onClose={() => setIsMapOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
