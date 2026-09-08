import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Package,
  Clock,
  Search,
  Plus,
  Minus,
  X,
  Printer,
} from "lucide-react";
import "./CreateOrder.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import {
  discountedUnitCents,
  formatCents,
  lineTotalCents,
  toCents,
  customerDiscountCents as calcCustomerDiscountCents,
  MANUAL_DISCOUNT_OPTIONS,
} from "./utils/money.js";
import TimeSelect24 from "./components/CreateOrder/TimeSelect24.jsx";
import { pad2, toLocalDateInput, toLocalTimeInput, localInputsToISO } from "./utils/datetime.js";
// Общие хелперы телефона: раньше в этом файле лежала своя копия, которая знала
// только латвийские номера, — из-за неё заказ с иностранным номером нельзя
// было сохранить, а сам номер портился при вводе.
import { formatPhoneInput, isValidPhone } from "./utils/phone.js";
import Loader from "./components/Loader/Loader.jsx";
import InvoiceTemplate from "./pages/InvoiceSettings/InvoiceTemplate.jsx";
import AddressMapField from "./components/CreateOrder/AddressMapField.jsx";
import DeliveryMapModal from "./components/CreateOrder/DeliveryMapModal.jsx";
import DeliverySection from "./components/CreateOrder/DeliverySection.jsx";
import { findZoneForPoint } from "./utils/zones.js";

const API = import.meta.env.VITE_API_URL;

// Payment label mapping
const PAYMENT_LABELS = {
  cash: "Skaidra nauda",
  card: "Karte",
  wire: "Pārskaitījums",
  paid: "Apmaksāts",
};

const PREORDER_MIN_OFFSET_MIN = 15;

const EditOrder = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();

  // ref for printing
  const printRef = useRef(null);
  const [orderCreatedAt, setOrderCreatedAt] = useState("");
  // Отображаемый номер заказа (как в OrderPanel: orderSeq → orderNo → id)
  const [orderNumber, setOrderNumber] = useState("");

  // Реквизиты накладной компании (для печати) — тянутся с сервера по company_id
  const [invoiceSettings, setInvoiceSettings] = useState(null);

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  // Загрузка реквизитов накладной компании (для печати)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/invoice-settings`, { headers: authHeaders });
        if (res.status === 401) return;
        const data = await res.json();
        if (data?.ok && data.settings) setInvoiceSettings(data.settings);
      } catch {
        // при ошибке шаблон использует значения по умолчанию
      }
    })();
  }, [authHeaders]);

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
    numOfPeople: "",
    courierId: "",
    deliveryFee: "",
    payment: "",
    // Разовая скидка на этот заказ, 0 — без скидки
    manualDiscountPercent: 0,
    pickupId: "",
    notes: "",
    scheduledDate: "",
    scheduledTime: "",
  });

  const deliveryFeeNum = Number(String(formData.deliveryFee).replace(",", "."));
  const safeDeliveryFee = Number.isFinite(deliveryFeeNum) ? deliveryFeeNum : 0;

  const [selectedItems, setSelectedItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Заказ пришёл как активный, но со временем доставки — значит это предзаказ,
  // активированный автоматикой. Признак нужен только для подписи в интерфейсе.
  const [wasActivatedPreorder, setWasActivatedPreorder] = useState(false);

  // Время доставки редактируется, если это предзаказ ИЛИ время уже задано.
  // Раньше блок показывался только для предзаказов, поэтому у активированного
  // заказа время было не видно — и молча стиралось при сохранении.
  const hasSchedule = Boolean(formData.scheduledDate || formData.scheduledTime);
  const showSchedule = formData.orderType === "preorder" || hasSchedule;

  // карта адреса (без обязательного подтверждения; точка показывается сразу)
  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [zones, setZones] = useState([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const currentZone = useMemo(
    () => (geo ? findZoneForPoint(geo.lat, geo.lng, zones) : null),
    [geo, zones]
  );

  // минимум для предзаказа
  const now = new Date();
  const minDate = toLocalDateInput(now);
  const minTimeToday = (() => {
    const d = new Date(now);
    d.setMinutes(d.getMinutes() + PREORDER_MIN_OFFSET_MIN);
    return toLocalTimeInput(d);
  })();

  // Build the invoice order object from current form state
  const invoiceOrder = useMemo(() => {
    const addressParts = [formData.street, formData.house, formData.building]
      .filter(Boolean)
      .join(" ");
    const apartPart = formData.apart ? `-${formData.apart}` : "";
    const address = addressParts + apartPart;

    const deliveryDate = formData.scheduledDate && formData.scheduledTime
      ? `${formData.scheduledDate.split("-").reverse().join(".")} ${formData.scheduledTime}`
      : formData.orderType === "active"
        ? t("createOrder.orderType.active", { defaultValue: "Aktīvs" })
        : "—";

    return {
      number: orderNumber || id,
      createdAt: orderCreatedAt,
      deliveryDate,
      customerPhone: formData.phone,
      customerName: formData.customer,
      address,
      floor: formData.floor,
      doorCode: formData.code,
      peopleCount: formData.numOfPeople,
      notes: formData.notes,
      paymentMethod: PAYMENT_LABELS[formData.payment] || formData.payment,
      items: selectedItems.map((i) => ({
        name: i.name,
        price: i.discount > 0
          ? (discountedUnitCents(i.price, i.discount) / 100).toFixed(2)
          : i.price,
        quantity: i.quantity,
      })),
      deliveryFee: safeDeliveryFee,
      discount: 0,
    };
  }, [formData, selectedItems, id, orderNumber, orderCreatedAt, safeDeliveryFee, t]);

  // react-to-print hook
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Order_${id}`,
  });

  // справочники
  const fetchCouriers = async () => {
    const r = await fetch(`${API}/order-support/couriers`, { headers: authHeaders });
    if (r.status === 401) { navigate("/login"); return; }
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || t("createOrder.errors.couriersLoadFailed"));
    setCouriers(d.items || []);
  };

  const fetchPickupPoints = async () => {
    const r = await fetch(`${API}/order-support/pickup-points`, { headers: authHeaders });
    if (r.status === 401) { navigate("/login"); return; }
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || t("createOrder.errors.pickupPointsLoadFailed"));
    setPickupPoints(d.items || []);
  };

  const fetchAllMenu = async () => {
    const r = await fetch(`${API}/order-support/menu?all=1`, { headers: authHeaders });
    if (r.status === 401) { navigate("/login"); return; }
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || t("createOrder.errors.menuLoadFailed"));
    setAllMenu(d.items || []);
  };

  const fetchZones = async () => {
    try {
      const r = await fetch(`${API}/delivery-zones`, { headers: authHeaders });
      if (r.status === 401) return;
      const d = await r.json();
      if (r.ok && d.ok) setZones(d.zones || []);
    } catch { /* зоны не критичны */ }
  };

  // загрузка заказа
  const loadOrder = async () => {
    const r = await fetch(`${API}/current-orders/${id}`, { headers: authHeaders });
    if (r.status === 401) { navigate("/login"); return; }
    const d = await r.json();
    if (!r.ok || !d.ok)
      throw new Error(d.error || t("createOrder.errors.getOrderFailed", { defaultValue: "Не удалось получить заказ" }));

    const o = d.item;

    // Номер заказа для накладной — тот же, что в OrderPanel
    setOrderNumber(String(o.orderSeq ?? o.orderNo ?? id));

    // Save original createdAt for the invoice
    if (o.createdAt) {
      const dt = new Date(o.createdAt);
      setOrderCreatedAt(
        `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`
      );
    }

    let scheduledDate = "", scheduledTime = "";
    if (o.scheduledAt) {
      const dt = new Date(o.scheduledAt);
      scheduledDate = toLocalDateInput(dt);
      scheduledTime = toLocalTimeInput(dt);
    }

    // Предзаказ, который автоматика перевела в активные за 2 часа до времени:
    // тип уже active, но время доставки осталось. Запоминаем это, чтобы
    // показать время админу — иначе он его не увидит и потеряет при сохранении.
    setWasActivatedPreorder(Boolean(o.scheduledAt) && (o.orderType || "active") !== "preorder");

    setFormData({
      orderType: o.orderType || "active",
      status: o.status || "new",
      phone: o.phone || "",
      customer: o.customer || "",
      street: o.addressStreet || "",
      house: o.addressHouse || "",
      apart: o.addressApartment || "",
      building: o.addressBuilding || "",
      floor: o.addressFloor || "",
      code: o.addressCode || "",
      numOfPeople: o.numOfPeople || "",
      courierId: o.courierId || "",
      deliveryFee: o.deliveryFee ?? "",
      payment: o.paymentMethod || "",
      manualDiscountPercent: Number(o.manualDiscountPercent) || 0,
      pickupId: o.pickupId || "",
      notes: o.notes || "",
      scheduledDate,
      scheduledTime,
    });

    setSelectedItems(
      (o.items || []).map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price || 0),
        discount: Number(i.discount || 0),
        quantity: Number(i.quantity || 1),
      }))
    );

    // сразу показываем точку заказа на карте, если координаты есть
    if (o.addressLat != null && o.addressLng != null) {
      const lat = Number(o.addressLat);
      const lng = Number(o.addressLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) setGeo({ lat, lng });
    }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    (async () => {
      try {
        await Promise.all([fetchCouriers(), fetchPickupPoints(), fetchAllMenu(), fetchZones()]);
        await loadOrder();
      } catch (e) {
        alert(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, navigate]);

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

  // товары
  const addItemToOrder = (menuItem) => {
    const existing = selectedItems.find((i) => i.id === menuItem.id);
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((i) => (i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setSelectedItems((prev) => [...prev, { ...menuItem, quantity: 1 }]);
    }
    setSearchTerm("");
    setShowSearchResults(false);
  };

  // ── навигация по списку поиска с клавиатуры ──
  const [activeIndex, setActiveIndex] = useState(0);
  const resultsRef = useRef(null);
  const listOpen = showSearchResults && searchResults.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm, searchResults.length]);

  useEffect(() => {
    if (!listOpen || !resultsRef.current) return;
    const el = resultsRef.current.querySelector(".search-result-item.active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listOpen]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSearchResults(false);
      return;
    }
    if (!listOpen) return;
    const len = searchResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % len);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + len) % len);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = searchResults[Math.min(activeIndex, len - 1)];
      if (item) addItemToOrder(item);
    }
  };

  const updateItemQuantity = (id2, qty) => {
    if (qty <= 0) return removeItem(id2);
    setSelectedItems((prev) => prev.map((i) => (i.id === id2 ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (id2) => setSelectedItems((prev) => prev.filter((i) => i.id !== id2));

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
        if (res.status === 401) { navigate("/login"); return; }
        const data = await res.json();
        if (!cancelled) setCustomerDiscount(data?.ok ? data.discount || null : null);
      } catch {
        if (!cancelled) setCustomerDiscount(null);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.phone]);

  const calculateItemsTotalCents = () =>
    selectedItems.reduce(
      (sumCents, it) => sumCents + lineTotalCents(it.price, it.discount, it.quantity),
      0
    );

  // Персональная скидка клиента (по телефону, применяется сервером и при правке).
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
    Math.max(0, calculateItemsTotalCents() - customerDiscountCents) + toCents(safeDeliveryFee);

  // Стирание времени доставки — отдельное осознанное действие.
  // Раньше оно происходило само при переключении типа заказа, и вместе с ним
  // тихо терялось время, обещанное клиенту.
  const clearSchedule = () => {
    setFormData((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
    setErrors((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
  };

  const confirmClearSchedule = () => {
    if (!hasSchedule) return true;
    const when = [formData.scheduledDate, formData.scheduledTime]
      .filter(Boolean)
      .join(" ");
    return window.confirm(
      t("editOrder.schedule.clearConfirm", {
        defaultValue: "Время доставки {{when}} будет удалено. Продолжить?",
        when,
      })
    );
  };

  const handleInputChange = (field, value) => {
    // Переключение на текущий заказ у заказа с временем доставки — спрашиваем.
    // Отказ оставляет и тип, и время нетронутыми.
    if (field === "orderType" && value === "active" && hasSchedule) {
      if (!confirmClearSchedule()) return;
      setFormData((prev) => ({
        ...prev,
        orderType: "active",
        scheduledDate: "",
        scheduledTime: "",
      }));
      setErrors((prev) => ({ ...prev, scheduledDate: "", scheduledTime: "" }));
      setWasActivatedPreorder(false);
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (["street", "house", "building", "apart"].includes(field)) {
      setGeoError(null);
    }
  };

  // Перегеокодировать адрес (если поменяли адрес) — подтверждение не требуется
  const verifyAddress = async () => {
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
      if (res.status === 401) { navigate("/login"); return; }
      const data = await res.json();
      if (!res.ok || !data.ok || !Number.isFinite(Number(data.lat))) {
        throw new Error(data.error || "geocode failed");
      }
      setGeo({ lat: Number(data.lat), lng: Number(data.lng) });
    } catch (e) {
      setGeoError(
        t("createOrder.map.error", {
          defaultValue: "Не удалось определить координаты. Уточните адрес.",
        })
      );
    } finally {
      setGeoLoading(false);
    }
  };

  const handleMarkerMove = (latlng) => {
    if (!latlng || !Number.isFinite(latlng.lat)) return;
    setGeo({ lat: latlng.lat, lng: latlng.lng });
  };

  const validateForm = () => {
    const e = {};
    if (!formData.customer.trim()) e.customer = t("createOrder.validation.customerRequired");
    // Международный формат, как в CreateOrder. Жёсткая маска /^\+371\d{8}$/
    // не давала сохранить заказ клиента с иностранным номером — заказ
    // создавался, но становился нередактируемым.
    if (!formData.phone.trim()) e.phone = t("createOrder.validation.phoneRequired");
    else if (!isValidPhone(formData.phone)) {
      e.phone = t("createOrder.validation.phoneInvalid");
    }
    if (selectedItems.length === 0) e.items = t("createOrder.validation.itemsRequired");
    if (!formData.pickupId) e.restaurant = t("createOrder.validation.pickupRequired");
    if (!formData.payment) e.payment = t("createOrder.validation.paymentRequired");
    // Половина времени доставки хуже, чем его отсутствие: заказ уйдёт с датой
    // без часа (или наоборот) и в базе окажется NULL. Поэтому для активного
    // заказа требуем оба поля, если заполнено хоть одно.
    if (formData.orderType !== "preorder" && hasSchedule) {
      if (!formData.scheduledDate) e.scheduledDate = t("createOrder.validation.scheduledDateRequired");
      if (!formData.scheduledTime) e.scheduledTime = t("createOrder.validation.scheduledTimeRequired");
    }
    if (formData.orderType === "preorder") {
      if (!formData.scheduledDate) e.scheduledDate = t("createOrder.validation.scheduledDateRequired");
      if (!formData.scheduledTime) e.scheduledTime = t("createOrder.validation.scheduledTimeRequired");
      if (formData.scheduledDate && formData.scheduledTime) {
        const scheduled = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
        const minAllowed = new Date();
        minAllowed.setMinutes(minAllowed.getMinutes() + PREORDER_MIN_OFFSET_MIN);
        // if (scheduled < minAllowed) {
        //   e.scheduledTime = t("createOrder.validation.scheduledTooEarly", { min: PREORDER_MIN_OFFSET_MIN });
        // }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      // ISO с зоной, как и в CreateOrder: «наивная» строка без Z трактовалась
      // сервером (TZ=UTC) как UTC, из-за чего предзаказ уезжал на +3 часа.
      // Источник правды — заполненные поля, а не тип заказа. Раньше здесь
      // стояло условие «тип === preorder», и у активированного предзаказа
      // (тип уже active, время осталось) время доставки уходило в NULL при
      // любом сохранении — даже если правили телефон.
      const scheduledAt =
        formData.scheduledDate && formData.scheduledTime
          ? localInputsToISO(formData.scheduledDate, formData.scheduledTime)
          : null;

      const payload = {
        orderType: formData.orderType,
        status: formData.status,
        scheduledAt,
        courierId: Number(formData.courierId) || null,
        pickupId: Number(formData.pickupId) || null,
        payment: formData.payment,
        manualDiscountPercent: Number(formData.manualDiscountPercent) || 0,
        deliveryFee: safeDeliveryFee,
        customer: formData.customer,
        phone: formData.phone,
        street: formData.street,
        house: formData.house,
        apart: formData.apart,
        building: formData.building,
        floor: formData.floor,
        code: formData.code,
        numOfPeople: formData.numOfPeople ? Number(formData.numOfPeople) : null,
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

      const r = await fetch(`${API}/current-orders/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const d = await r.json();
      if (!r.ok || !d.ok)
        throw new Error(d.error || t("createOrder.errors.updateOrderFailed", { defaultValue: "Ошибка сохранения" }));

      navigate("/orderPanel");
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-order-page">
      {/* Hidden invoice for printing */}
      <div style={{ display: "none" }}>
        <InvoiceTemplate ref={printRef} order={invoiceOrder} settings={invoiceSettings || {}} />
      </div>

      <header className="header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/orderPanel")}>
            <ArrowLeft size={20} /> {t("createOrder.back")}
          </button>

          <div className="page-title">
            <h1>
              {t("createOrder.title")} #{id}
            </h1>
            <p>{t("createOrder.subtitle")}</p>
          </div>
        </div>
      </header>

      <div className="form-container">
        {isLoading ? (
          <Loader />
        ) : (
          <div className="co-shell">
            <div className="co-feed">
              {/* Клиент */}
              <div className="form-section">
                <div className="section-header">
                  <User size={20} />
                  <h3>{t("createOrder.sections.customerInfo")}</h3>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.phone")} *</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", formatPhoneInput(e.target.value))}
                        className={errors.phone ? "error" : ""}
                        placeholder={t("createOrder.placeholders.phone")}
                      />
                    </div>
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label>{t("createOrder.fields.customer")} *</label>
                    <input
                      value={formData.customer}
                      onChange={(e) => handleInputChange("customer", e.target.value)}
                      className={errors.customer ? "error" : ""}
                      placeholder={t("createOrder.placeholders.customer")}
                    />
                    {errors.customer && <span className="error-text">{errors.customer}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.street")}</label>
                    <input
                      value={formData.street}
                      onChange={(e) => handleInputChange("street", e.target.value)}
                      placeholder={t("createOrder.placeholders.street")}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("createOrder.fields.house")}</label>
                    <input
                      value={formData.house}
                      onChange={(e) => handleInputChange("house", e.target.value)}
                      placeholder={t("createOrder.placeholders.house")}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.building")}</label>
                    <input
                      value={formData.building}
                      onChange={(e) => handleInputChange("building", e.target.value)}
                      placeholder={t("createOrder.placeholders.building")}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("createOrder.fields.apart")}</label>
                    <input
                      value={formData.apart}
                      onChange={(e) => handleInputChange("apart", e.target.value)}
                      placeholder={t("createOrder.placeholders.apart")}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.floor")}</label>
                    <input
                      value={formData.floor}
                      onChange={(e) => handleInputChange("floor", e.target.value)}
                      placeholder={t("createOrder.placeholders.floor")}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t("createOrder.fields.code")}</label>
                    <input
                      value={formData.code}
                      onChange={(e) => handleInputChange("code", e.target.value)}
                      placeholder={t("createOrder.placeholders.code")}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.numOfPeople")}</label>
                    <input
                      value={formData.numOfPeople}
                      onChange={(e) => handleInputChange("numOfPeople", e.target.value)}
                      placeholder={t("createOrder.placeholders.numOfPeople")}
                    />
                  </div>
                </div>

                {/* Тип заказа — последний пункт секции: доставка и позиции
                    ниже зависят от того, текущий это заказ или предзаказ. */}
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

                {showSchedule && (
                  <>
                    {/* Активированный предзаказ: тип уже «текущий», но время
                        доставки осталось. Без этой плашки админ его не видит. */}
                    {wasActivatedPreorder && formData.orderType !== "preorder" && (
                      <div className="eo-schedule-note">
                        <Clock size={16} />
                        <span>
                          {t("editOrder.schedule.activatedPreorder", {
                            defaultValue:
                              "Предзаказ активирован автоматически. Время доставки сохраняется.",
                          })}
                        </span>
                        <button
                          type="button"
                          className="eo-schedule-clear"
                          onClick={() => {
                            if (confirmClearSchedule()) {
                              clearSchedule();
                              setWasActivatedPreorder(false);
                            }
                          }}
                        >
                          {t("editOrder.schedule.clear", {
                            defaultValue: "Убрать время доставки",
                          })}
                        </button>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group">
                        <label>{t("createOrder.fields.scheduledDate")} *</label>
                        {/* Ограничение «не раньше сегодня» — только для новых
                            предзаказов. У активированного заказа время уже
                            наступает или прошло, и min мешал бы его править. */}
                        <input
                          type="date"
                          min={formData.orderType === "preorder" ? minDate : undefined}
                          value={formData.scheduledDate}
                          onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                          className={errors.scheduledDate ? "error" : ""}
                        />
                        {errors.scheduledDate && <span className="error-text">{errors.scheduledDate}</span>}
                      </div>

                      <div className="form-group">
                        <label>{t("createOrder.fields.scheduledTime")} *</label>
                        {/* 24-часовой формат независимо от локали браузера */}
                        <TimeSelect24
                          value={formData.scheduledTime}
                          onChange={(v) => handleInputChange("scheduledTime", v)}
                          className={errors.scheduledTime ? "error" : ""}
                          min={
                            formData.orderType === "preorder" &&
                            formData.scheduledDate === minDate
                              ? minTimeToday
                              : undefined
                          }
                          hourLabel={t("createOrder.time.hours", { defaultValue: "Часы" })}
                          minuteLabel={t("createOrder.time.minutes", { defaultValue: "Минуты" })}
                        />
                        {errors.scheduledTime && <span className="error-text">{errors.scheduledTime}</span>}
                      </div>
                    </div>

                    {formData.orderType === "preorder" && (
                      <div className="hint muted" style={{ marginTop: 4 }}>
                        {t("createOrder.preorderHint", { min: PREORDER_MIN_OFFSET_MIN })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="form-section full-width">
                <div className="section-header">
                  <Clock size={20} />
                  <h3>{t("createOrder.sections.notes")}</h3>
                </div>

                <div className="form-group">
                  <label>{t("createOrder.fields.notes")}</label>
                  <textarea
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder={t("createOrder.placeholders.notes")}
                  />
                </div>
              </div>

              {/* Доставка */}
              <DeliverySection
                t={t}
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                couriers={couriers}
                showStatus
              />

              {/* Товары */}
              <div className="form-section">
                <div className="section-header">
                  <Package size={20} />
                  <h3>{t("createOrder.sections.items")}</h3>
                </div>

                <div className="form-group">
                  <label>{t("createOrder.fields.searchItems")} *</label>
                  <div className="search-container">
                    <div className="input-with-icon">
                      <Search size={16} />
                      <input
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowSearchResults(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowSearchResults(searchTerm.length > 0)}
                        onKeyDown={handleSearchKeyDown}
                        className={errors.items ? "error" : ""}
                        placeholder={t("createOrder.placeholders.search")}
                        role="combobox"
                        aria-expanded={listOpen}
                        aria-activedescendant={listOpen ? `edit-search-result-${activeIndex}` : undefined}
                        autoComplete="off"
                      />
                    </div>

                    {showSearchResults && searchResults.length > 0 && (
                      <div className="search-results" role="listbox" ref={resultsRef}>
                        {searchResults.map((item, idx) => (
                          <div
                            key={item.id}
                            id={`edit-search-result-${idx}`}
                            role="option"
                            aria-selected={idx === activeIndex}
                            className={`search-result-item ${idx === activeIndex ? "active" : ""}`}
                            onClick={() => addItemToOrder(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                          >
                            <div className="item-info">
                              <span className="item-name">{item.name}</span>
                              <span className="item-price">
                                {item.discount > 0 ? (
                                  <>
                                    <span className="original-price">€{formatCents(toCents(item.price))}</span>
                                    <span className="discounted-price">
                                      €{formatCents(discountedUnitCents(item.price, item.discount))}
                                    </span>
                                    <span className="discount-badge">-{item.discount}%</span>
                                  </>
                                ) : (
                                  <span>€{formatCents(toCents(item.price))}</span>
                                )}
                              </span>
                              {item.discount > 0 && (
                                <span className="item-discount-note">
                                  {t("createOrder.items.noCustomerDiscount", {
                                    defaultValue: "скидка клиента не применяется",
                                  })}
                                </span>
                              )}
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
                              {item.discount > 0 && <span className="discount-info">-{item.discount}%</span>}
                              <span className="unit-price">€{formatCents(unitCents)}</span>
                            </div>
                            {/* На товар со скидкой в меню персональная скидка
                                клиента не распространяется — иначе скидка
                                сложилась бы дважды. */}
                            {item.discount > 0 && (
                              <span className="item-discount-note">
                                {t("createOrder.items.hasMenuDiscount", {
                                  defaultValue:
                                    "Товар со скидкой {{percent}}% — скидка клиента не применяется",
                                  percent: item.discount,
                                })}
                              </span>
                            )}
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

                          <button type="button" onClick={() => removeItem(item.id)} className="remove-btn">
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}

                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>{t("createOrder.fields.payment")} *</label>
                    <select
                      value={formData.payment}
                      onChange={(e) => handleInputChange("payment", e.target.value)}
                      className={errors.payment ? "error" : ""}
                    >
                      <option value="">{t("createOrder.placeholders.payment")}</option>
                      <option value="cash">{t("createOrder.payment.cash")}</option>
                      <option value="card">{t("createOrder.payment.card")}</option>
                      <option value="wire">{t("createOrder.payment.wire")}</option>
                      <option value="paid">{t("createOrder.payment.paid")}</option>
                    </select>
                    {errors.payment && <span className="error-text">{errors.payment}</span>}
                  </div>

                  <div className="form-group">
                    <label>{t("createOrder.fields.pickup")} *</label>
                    <select
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
                    {errors.restaurant && <span className="error-text">{errors.restaurant}</span>}
                  </div>
                </div>

                <AddressMapField
                  t={t}
                  formData={formData}
                  geo={geo}
                  geoConfirmed={true}
                  geoLoading={geoLoading}
                  geoError={geoError}
                  requireConfirm={false}
                  onVerifyAddress={verifyAddress}
                  onMarkerMove={handleMarkerMove}
                  onExpandMap={() => setIsMapOpen(true)}
                  zones={zones}
                  currentZone={currentZone}
                />
              </div>

              {/* <div className="form-section full-width">
                <div className="section-header">
                  <Clock size={20} />
                  <h3>{t("createOrder.sections.notes")}</h3>
                </div>

                <div className="form-group">
                  <label>{t("createOrder.fields.notes")}</label>
                  <textarea
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder={t("createOrder.placeholders.notes")}
                  />
                </div>
              </div> */}
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

                <div className="co-rail-row">
                  <span>{t("createOrder.fields.status", { defaultValue: "Status" })}</span>
                  <span className="v">{formData.status}</span>
                </div>

                {/* Время доставки в итогах — по факту наличия, а не по типу:
                    у активированного предзаказа тип уже «текущий». */}
                {formData.scheduledDate &&
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
                  <span className="v">{formatCents(toCents(safeDeliveryFee))} €</span>
                </div>

                <div className="co-rail-divider" />

                <div className="co-rail-total">
                  <span className="lbl">{t("createOrder.fields.totalPrice")}</span>
                  <span className="amt">{formatCents(calculateGrandTotalCents())} €</span>
                </div>

                {geo && currentZone && (
                  <div className="co-rail-status ok">
                    {t("createOrder.map.zoneLabel", { defaultValue: "Зона" })}: {currentZone.name}
                  </div>
                )}
                {geo && zones.length > 0 && !currentZone && (
                  <div className="co-rail-status warn">
                    {t("createOrder.map.outsideZones", { defaultValue: "Точка вне зон доставки" })}
                  </div>
                )}

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
                  <button type="button" className="btn-primary" disabled={isSaving} onClick={handleSave}>
                    <Save size={16} />{" "}
                    {isSaving
                      ? t("createOrder.buttons.creating", { defaultValue: "Сохранение..." })
                      : t("createOrder.buttons.save", { defaultValue: "Сохранить изменения" })}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handlePrint}
                    disabled={isLoading}
                    title={t("createOrder.buttons.print")}
                  >
                    <Printer size={16} /> {t("createOrder.buttons.print")}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => navigate("/orderPanel")}>
                    {t("createOrder.buttons.cancel")}
                  </button>
                </div>
              </div>
            </aside>

            {isMapOpen && geo && (
              <DeliveryMapModal
                t={t}
                position={geo}
                onChange={handleMarkerMove}
                confirmed={true}
                requireConfirm={false}
                zones={zones}
                onConfirm={() => setIsMapOpen(false)}
                onClose={() => setIsMapOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditOrder;