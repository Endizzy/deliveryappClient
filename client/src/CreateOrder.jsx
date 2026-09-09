import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import "./CreateOrder.css";
import { useNavigate } from "react-router-dom";
import useNotification from "./hooks/useNotification.jsx";
import { useTranslation } from "react-i18next";
import {
  toCents,
  formatCents,
  customerDiscountCents as calcCustomerDiscountCents,
  MANUAL_DISCOUNT_OPTIONS,
} from "./utils/money.js";
import { normalizePhoneForLookup, isValidPhone } from "./utils/phone.js";
import { toLocalDateInput, toLocalTimeInput, localInputsToISO } from "./utils/datetime.js";
import useOrderResources from "./hooks/useOrderResources.js";
import useCustomerLookup from "./hooks/useCustomerLookup.js";
import useOrderItems from "./hooks/useOrderItems.js";
import CustomerSection from "./components/CreateOrder/CustomerSection.jsx";
import DeliverySection from "./components/CreateOrder/DeliverySection.jsx";
import ItemsSection from "./components/CreateOrder/ItemsSection.jsx";
import NotesSection from "./components/CreateOrder/NotesSection.jsx";
import DeliveryMapModal from "./components/CreateOrder/DeliveryMapModal.jsx";
import PastOrdersModal from "./components/CreateOrder/PastOrdersModal.jsx";
import { findZoneForPoint, getZoneDeliveryRules } from "./utils/zones.js";

const PREORDER_MIN_OFFSET_MIN = 15;

const CreateOrder = () => {
  const { t, i18n } = useTranslation();
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
    // Разовая скидка на этот заказ, 0 — без скидки
    manualDiscountPercent: 0,
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

  // ---- персональная скидка клиента (по телефону) ----
  const [customerDiscount, setCustomerDiscount] = useState(null);

  useEffect(() => {
    const raw = (formData.phone || "").replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(raw)) {
      setCustomerDiscount(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/customers/discount-by-phone?phone=${encodeURIComponent(raw)}`,
          { headers: authHeaders }
        );
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (!cancelled) setCustomerDiscount(data?.ok ? data.discount || null : null);
      } catch {
        if (!cancelled) setCustomerDiscount(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formData.phone, API, authHeaders, handleUnauthorized]);

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
  const {
    selectedItems,
    addItem,
    removeItem,
    updateItemQuantity,
    itemsTotalCents,
    setItems,
  } = useOrderItems();

  // ── Прошлые заказы клиента ────────────────────────────────────────────────
  // Клиент часто просит «то же, что в прошлый раз». Историю грузим по тому же
  // номеру, что и скидку, и только когда номер выглядит полным — иначе запрос
  // уходил бы на каждую набранную цифру.
  const [pastOrders, setPastOrders] = useState([]);
  const [pastOrdersLoading, setPastOrdersLoading] = useState(false);
  const [pastOrdersError, setPastOrdersError] = useState("");
  const [pastOrdersOpen, setPastOrdersOpen] = useState(false);

  useEffect(() => {
    const raw = (formData.phone || "").replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(raw)) {
      setPastOrders([]);
      setPastOrdersError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPastOrdersLoading(true);
      setPastOrdersError("");
      try {
        const res = await fetch(
          `${API}/customers/${encodeURIComponent(raw)}/orders?limit=10`,
          { headers: authHeaders }
        );
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) throw new Error(data.error || "load failed");
        setPastOrders(data.items || []);
      } catch {
        if (!cancelled) {
          setPastOrders([]);
          setPastOrdersError(
            t("createOrder.pastOrders.loadFailed", {
              defaultValue: "Не удалось загрузить прошлые заказы",
            })
          );
        }
      } finally {
        if (!cancelled) setPastOrdersLoading(false);
      }
    }, 350);
    // Быстрая правка номера не должна оставить на экране историю чужого клиента
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.phone, API, authHeaders, handleUnauthorized]);

  // Меню по id — для сверки прошлого заказа с актуальным меню
  const menuById = useMemo(() => {
    const map = new Map();
    for (const m of allMenu) map.set(String(m.id), m);
    return map;
  }, [allMenu]);

  // Повтор прошлого заказа.
  //
  // Из истории берём только состав и количества. Цену и скидку — из ТЕКУЩЕГО
  // меню: цены меняются, и повтор по старым был бы прямой потерей денег.
  // Позиции, которых в меню больше нет или которые выключены, пропускаем
  // и говорим об этом вслух.
  const repeatPastOrder = (order) => {
    const merged = new Map();
    const missing = [];

    for (const it of order?.items || []) {
      const fresh = menuById.get(String(it.id));
      if (!fresh) {
        missing.push(it.name || `#${it.id}`);
        continue;
      }
      const qty = Math.max(1, Math.trunc(Number(it.quantity) || 1));
      const prev = merged.get(String(fresh.id));
      // Одна позиция могла попасть в заказ дважды — складываем количества
      merged.set(String(fresh.id), {
        ...fresh,
        quantity: (prev?.quantity || 0) + qty,
      });
    }

    const items = Array.from(merged.values());
    if (items.length === 0) {
      notify({
        type: "error",
        title: t("createOrder.pastOrders.nothingToRepeat", {
          defaultValue: "Ни одной позиции этого заказа нет в меню",
        }),
        duration: 4500,
      });
      return;
    }

    // Уже набранный заказ молча заменять нельзя
    if (selectedItems.length > 0) {
      const ok = window.confirm(
        t("createOrder.pastOrders.replaceConfirm", {
          defaultValue: "Текущий список позиций будет заменён. Продолжить?",
        })
      );
      if (!ok) return;
    }

    setItems(items);
    setPastOrdersOpen(false);

    notify(
      missing.length > 0
        ? {
            type: "error",
            title: t("createOrder.pastOrders.repeated", {
              defaultValue: "Позиции прошлого заказа перенесены",
            }),
            message: t("createOrder.pastOrders.someMissing", {
              defaultValue: "Не перенеслись (нет в меню): {{names}}",
              names: missing.join(", "),
            }),
            duration: 6000,
          }
        : {
            title: t("createOrder.pastOrders.repeated", {
              defaultValue: "Позиции прошлого заказа перенесены",
            }),
            duration: 3000,
          }
    );
  };

  const addItemToOrder = (menuItem) => {
    addItem(menuItem);
    setSearchTerm("");
    setShowSearchResults(false);
  };

  const calculateItemsTotalCents = itemsTotalCents;

  // Персональная скидка клиента (подставляется по телефону, применяется сервером).
  // Процент считается только от позиций без скидки в меню — иначе на акционном
  // товаре скидка складывалась бы дважды.
  const customerDiscountCents = useMemo(
    () =>
      calcCustomerDiscountCents(
        selectedItems,
        customerDiscount,
        formData.manualDiscountPercent
      ),
    [customerDiscount, selectedItems, formData.manualDiscountPercent]
  );

  // Какая из двух скидок реально применилась — её и подписываем в итогах.
  // Считаем обе по отдельности той же функцией: так подпись не может
  // разойтись с суммой.
  const appliedDiscountLabel = useMemo(() => {
    const personal = calcCustomerDiscountCents(selectedItems, customerDiscount, 0);
    const manual = calcCustomerDiscountCents(selectedItems, null, formData.manualDiscountPercent);

    if (manual > 0 && manual >= personal) {
      return {
        title: t("createOrder.summary.manualDiscount", {
          defaultValue: "Разовая скидка",
        }),
        detail: `(−${formData.manualDiscountPercent}%)`,
      };
    }
    return {
      title: t("createOrder.summary.customerDiscount", {
        defaultValue: "Скидка клиента",
      }),
      detail:
        customerDiscount?.type === "fixed"
          ? `(−${formatCents(toCents(customerDiscount.value))} €)`
          : `(−${customerDiscount?.value ?? 0}%)`,
    };
  }, [selectedItems, customerDiscount, formData.manualDiscountPercent, t]);

  // Есть процентная скидка, но часть позиций уже со скидкой в меню —
  // показываем диспетчеру, почему сумма скидки меньше ожидаемой.
  const percentDiscountPartial = useMemo(() => {
    if (!customerDiscount || customerDiscount.type === "fixed") return false;
    if (!(Number(customerDiscount.value) > 0)) return false;
    return selectedItems.some((it) => Number(it?.discount) > 0);
  }, [customerDiscount, selectedItems]);

  const calculateGrandTotalCents = () =>
    Math.max(0, itemsTotalCents() - customerDiscountCents) + toCents(safeDeliveryFee);

  // ── Правила зоны по сумме заказа ──────────────────────────────────────────
  // База — товары со скидкой, без доставки: сама доставка не должна влиять на
  // то, бесплатна ли она.
  const itemsWithDiscount = useMemo(
    () => Math.max(0, itemsTotalCents() - customerDiscountCents) / 100,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedItems, customerDiscountCents]
  );

  const zoneRules = useMemo(
    () => getZoneDeliveryRules(currentZone, itemsWithDiscount),
    [currentZone, itemsWithDiscount]
  );

  // Подставляем стоимость доставки из зоны: при попадании в зону, смене суммы
  // (перешли порог бесплатной доставки) — но не затираем ручную правку оператора.
  const feeTouchedRef = useRef(false);
  const lastAutoFeeRef = useRef(null);

  useEffect(() => {
    if (!currentZone) return;
    const next = zoneRules.fee.toFixed(2);
    // оператор менял поле вручную и значение отличается от прошлого авто — не трогаем
    if (feeTouchedRef.current && formData.deliveryFee !== lastAutoFeeRef.current) return;
    if (formData.deliveryFee === next) return;
    lastAutoFeeRef.current = next;
    setFormData((prev) => ({ ...prev, deliveryFee: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentZone, zoneRules.fee]);

  const handleInputChange = (field, value) => {
    // Ручная правка стоимости доставки отключает автоподстановку из зоны:
    // оператор мог согласовать особые условия, и перезаписывать их нельзя.
    if (field === "deliveryFee") feeTouchedRef.current = true;

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
      // Та же проверка, что и в EditOrder — правило живёт в utils/phone.js.
      // Раньше здесь и там были две независимые копии, и они разъехались.
    } else if (!isValidPhone(formData.phone)) {
      e.phone = t("createOrder.validation.phoneInvalid");
    }

    if (selectedItems.length === 0) {
      e.items = t("createOrder.validation.itemsRequired");
    }

    // if (!formData.pickupId) {
    //   e.restaurant = t("createOrder.validation.pickupRequired");
    // }

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
        formData.orderType === "preorder"
          ? localInputsToISO(formData.scheduledDate, formData.scheduledTime)
          : null;

      const payload = {
        orderType: formData.orderType,
        status: "new",
        scheduledAt,
        courierId: Number(formData.courierId) || null,
        pickupId: Number(formData.pickupId) || null,
        payment: formData.payment,
        manualDiscountPercent: Number(formData.manualDiscountPercent) || 0,
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
        <div className="co-shell">
          <div className="co-feed">
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
              minDate={minDate}
              minTimeToday={minTimeToday}
              preorderMinOffset={PREORDER_MIN_OFFSET_MIN}
            />

            <NotesSection
              t={t}
              formData={formData}
              handleInputChange={handleInputChange}
            />

            <DeliverySection
              t={t}
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              couriers={couriers}
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
              pastOrdersCount={pastOrders.length}
              onOpenPastOrders={() => setPastOrdersOpen(true)}
            />

            {/* <NotesSection
              t={t}
              formData={formData}
              handleInputChange={handleInputChange}
            /> */}
          </div>

          <aside className="co-rail">
            <div className="co-rail-card">
              <h3 className="co-rail-title">
                {t("createOrder.summary.title", { defaultValue: "Итог заказа" })}
              </h3>

              <div className="co-rail-row">
                <span>{t("createOrder.fields.orderType")}</span>
                <span className="v">
                  {formData.orderType === "preorder"
                    ? t("createOrder.orderType.preorder")
                    : t("createOrder.orderType.active")}
                </span>
              </div>

              {formData.orderType === "preorder" &&
                formData.scheduledDate &&
                formData.scheduledTime && (
                  <div className="co-rail-row">
                    <span>{t("createOrder.fields.scheduledTime")}</span>
                    <span className="v">
                      {formData.scheduledDate} {formData.scheduledTime}
                    </span>
                  </div>
                )}

              <div className="co-rail-row">
                <span>{t("createOrder.summary.items", { defaultValue: "Позиции" })}</span>
                <span className="v">
                  {selectedItems.reduce((a, i) => a + (i.quantity || 0), 0)}
                </span>
              </div>

              <div className="co-rail-divider" />

              <div className="co-rail-row">
                <span>{t("createOrder.fields.itemsPrice")}</span>
                <span className="v">{formatCents(calculateItemsTotalCents())} €</span>
              </div>
              {customerDiscountCents > 0 && (
                <div className="co-rail-row co-rail-discount">
                  <span>
                    {appliedDiscountLabel.title}{" "}
                    {appliedDiscountLabel.detail}
                  </span>
                  <span className="v">−{formatCents(customerDiscountCents)} €</span>
                </div>
              )}
              {percentDiscountPartial && (
                <div className="co-rail-hint">
                  {t("createOrder.summary.discountOnlyFullPrice", {
                    defaultValue:
                      "Скидка клиента применяется только к позициям без скидки в меню",
                  })}
                </div>
              )}

              <div className="co-rail-row">
                <span>{t("createOrder.fields.deliveryFee")}</span>
                <span className="v">
                  {formatCents(toCents(safeDeliveryFee))} €
                  {zoneRules.isFree && safeDeliveryFee === 0 && (
                    <span className="co-zone-free">
                      {" "}{t("createOrder.zone.free", { defaultValue: "бесплатно" })}
                    </span>
                  )}
                </span>
              </div>

              {/* Сколько не хватает до бесплатной доставки — оператор может
                  предложить клиенту добрать заказ */}
              {currentZone && !zoneRules.isFree && zoneRules.missingToFree > 0 && (
                <div className="co-rail-hint">
                  {t("createOrder.zone.missingToFree", {
                    defaultValue: "До бесплатной доставки не хватает {{sum}} €",
                    sum: zoneRules.missingToFree.toFixed(2),
                  })}
                </div>
              )}

              <div className="co-rail-divider" />

              <div className="co-rail-total">
                <span className="lbl">{t("createOrder.fields.totalPrice")}</span>
                <span className="amt">{formatCents(calculateGrandTotalCents())} €</span>
              </div>

              {/* Заказ ниже минимума зоны — предупреждаем, но создать разрешаем:
                  бывают постоянные клиенты и согласованные исключения */}
              {currentZone && zoneRules.belowMin && (
                <div className="co-rail-status warn">
                  {t("createOrder.zone.belowMin", {
                    defaultValue:
                      "Минимальный заказ в зоне «{{zone}}» — {{min}} €. Не хватает {{missing}} €",
                    zone: currentZone.name,
                    min: zoneRules.minOrder.toFixed(2),
                    missing: zoneRules.missingToMin.toFixed(2),
                  })}
                </div>
              )}

              {formData.street.trim() &&
                (geoConfirmed ? (
                  <div className="co-rail-status ok">
                    {currentZone
                      ? `${t("createOrder.map.zoneLabel", { defaultValue: "Зона" })}: ${currentZone.name}`
                      : t("createOrder.map.confirmed", { defaultValue: "Адрес подтверждён" })}
                  </div>
                ) : (
                  <div className="co-rail-status warn">
                    {t("createOrder.map.mustConfirm", {
                      defaultValue: "Подтвердите адрес доставки на карте",
                    })}
                  </div>
                ))}

              {/* Разовая скидка на заказ: день рождения, извинение за задержку.
                  Стоит в итогах, рядом с суммой — сразу видно, как она меняется.
                  Постоянная скидка клиента живёт отдельно, в его карточке. */}
              {selectedItems.length > 0 && (
                <div className="co-rail-discount-picker">
                  <label htmlFor="manualDiscount">
                    {t("createOrder.fields.manualDiscount", {
                      defaultValue: "Разовая скидка на заказ",
                    })}
                  </label>
                  <select
                    id="manualDiscount"
                    value={formData.manualDiscountPercent || 0}
                    onChange={(e) =>
                      handleInputChange("manualDiscountPercent", Number(e.target.value))
                    }
                  >
                    <option value={0}>
                      {t("createOrder.manualDiscount.none", { defaultValue: "Без скидки" })}
                    </option>
                    {MANUAL_DISCOUNT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </select>
                  {/* <span className="co-rail-hint">
                    {t("createOrder.manualDiscount.hint", {
                      defaultValue:
                        "Считается от позиций без скидки в меню. Если у клиента есть постоянная скидка, применяется большая из двух",
                    })}
                  </span> */}
                </div>
              )}

              <div className="co-rail-actions">
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate("/orderPanel")}
                  disabled={isSubmitting}
                >
                  {t("createOrder.buttons.cancel")}
                </button>
              </div>
            </div>
          </aside>
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

        <PastOrdersModal
          open={pastOrdersOpen}
          onClose={() => setPastOrdersOpen(false)}
          orders={pastOrders}
          loading={pastOrdersLoading}
          error={pastOrdersError}
          onRepeat={repeatPastOrder}
          menuById={menuById}
          t={t}
          locale={i18n.language}
        />
      </div>
    </div>
  );
};

export default CreateOrder;
