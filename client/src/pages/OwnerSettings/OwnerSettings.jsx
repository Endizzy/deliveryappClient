import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Save, Upload, Image as ImageIcon, Plus, Edit, Trash2,
  Search, Percent, Package, Users, Shield, Phone, Mail,
  BadgeCheck, X, ChevronDown, ChevronUp, Map as MapIcon, FileText,
  MapPin, Clock, Globe, Building2, Info, UserCog
} from "lucide-react";
import "./ownerSettings.css";
import Header from "../../components/Header/Header.jsx";
import DeliveryZonesEditor from "./DeliveryZonesEditor.jsx";
import InvoiceSettingsTab from "./InvoiceSettingsTab.jsx";
import CustomersTab from "./CustomersTab.jsx";
import { useTranslation } from "react-i18next";
import { formatCents, toCents } from "../../utils/money.js";

const toEUR = (n) => `€${formatCents(toCents(n))}`;

// Палитра цветов курьеров (для маркеров на карте)
const STAFF_COLORS = [
  "#2F8CFF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];
const randomStaffColor = () => STAFF_COLORS[Math.floor(Math.random() * STAFF_COLORS.length)];

export default function OwnerSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [invoice, setInvoice] = useState(false);

  // активная вкладка настроек: general | menu | accounts
  const [activeTab, setActiveTab] = useState("general");

  // визуальные поля
  const [restaurant, setRestaurant] = useState({ name: "", logo: "" });

  // общие настройки ресторана (пока заглушки — не сохраняются)
  const [general, setGeneral] = useState({
    phone: "",
    email: "",
    address: "",
    website: "",
    openTime: "10:00",
    closeTime: "22:00",
    timezone: "Europe/Riga",
    currency: "EUR",
    minOrder: "",
    defaultDeliveryFee: "",
    freeDeliveryFrom: "",
    prepTimeMin: "",
  });
  const setG = (field, value) => setGeneral((p) => ({ ...p, [field]: value }));

  // --- Меню (из API) ---
  const [menu, setMenu] = useState([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuSortBy, setMenuSortBy] = useState({ field: "name", dir: "asc" });

  // --- Сотрудники (из API) ---
  const [staff, setStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

  const [staffModal, setStaffModal] = useState({
    open: false,
    editId: null,
    form: { role: "courier", nickname: "", phone: "", email: "", password: "", color: "#2F8CFF" }
  });

  // ---- auth ----
  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );
  const authHeaders = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchCompany = async () => {
    const res = await fetch(`${API}/company/me`, { headers: authHeaders });
    if (res.status === 401) throw new Error("unauthorized");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || t("ownerSettings.errors.companyFetchFailed"));

    if (data.company) {
      setRestaurant((r) => ({
        ...r,
        name: data.company.name || "",
        logo: data.company.logoUrl || "",
      }));
    }
  };

  const fetchProfile = async () => {
    const res = await fetch(`${API}/user/me`, { headers: authHeaders });
    if (res.status === 401) throw new Error("unauthorized");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || t("ownerSettings.errors.profileFetchFailed"));
    setUser(data.user);
  };

  const fetchMenu = async () => {
    const res = await fetch(`${API}/menu`, { headers: authHeaders });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.menuLoadFailed"));
    setMenu(data.items);
  };

  const fetchStaff = async (q = "") => {
    setStaffLoading(true);
    try {
      const url = q ? `${API}/staff?q=${encodeURIComponent(q)}` : `${API}/staff`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.staffLoadFailed"));
      setStaff(data.items);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    (async () => {
      try {
        await fetchCompany();
        await fetchProfile();
        await fetchMenu();
        await fetchStaff();
      } catch (e) {
        if (String(e.message) === "unauthorized") {
          setError(t("ownerSettings.errors.unauthorized"));
          navigate("/login");
          return;
        }
        setError(e.message || t("ownerSettings.errors.generic"));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]); // eslint-disable-line

  // ---- derived: menu ----
  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    let list = !q ? [...menu] : menu.filter(m =>
      (m.name || "").toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q)
    );
    const { field, dir } = menuSortBy;
    list.sort((a, b) => {
      const va = field === "price" || field === "discount"
        ? Number(a[field])
        : String(a[field] ?? "").toLowerCase();
      const vb = field === "price" || field === "discount"
        ? Number(b[field])
        : String(b[field] ?? "").toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [menu, menuSearch, menuSortBy]);

  const stats = useMemo(() => {
    const total = menu.length;
    const active = menu.filter(m => m.available).length;
    const avg = total ? menu.reduce((a, m) => a + Number(m.price || 0), 0) / total : 0;
    return { total, active, avg };
  }, [menu]);

  // ---- derived: staff ----
  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s =>
      (s.nickname || "").toLowerCase().includes(q) ||
      (s.role || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q)
    );
  }, [staff, staffSearch]);

  // ---- restaurant logo ----
  const [logoDrag, setLogoDrag] = useState(false);

  const readLogoFile = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setRestaurant((r) => ({ ...r, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const onLogoChange = (e) => readLogoFile(e.target.files?.[0]);

  const onLogoDrop = (e) => {
    e.preventDefault();
    setLogoDrag(false);
    readLogoFile(e.dataTransfer?.files?.[0]);
  };

  // ---- MENU modal ----
  const [menuModal, setMenuModal] = useState({
    open: false, editId: null,
    form: { name: "", price: "", discount: 0, category: "", available: true }
  });

  const openAddMenu = () =>
    setMenuModal({
      open: true, editId: null,
      form: { name: "", price: "", discount: 0, category: "", available: true }
    });

  const openEditMenu = (item) =>
    setMenuModal({
      open: true, editId: item.id,
      form: {
        name: item.name,
        price: item.price,
        discount: item.discount,
        category: item.category,
        available: !!item.available
      }
    });

  const closeMenuModal = () => setMenuModal(m => ({ ...m, open: false }));

  // ---- MENU CRUD ----
  const createMenuItem = async (payload) => {
    const res = await fetch(`${API}/menu`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.menuCreateFailed"));
    return data.item;
  };

  const updateMenuItem = async (id, payload) => {
    const res = await fetch(`${API}/menu/${id}`, {
      method: "PUT", headers: authHeaders, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.menuUpdateFailed"));
    return data.item;
  };

  const deleteMenuItem = async (id) => {
    const res = await fetch(`${API}/menu/${id}`, { method: "DELETE", headers: authHeaders });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.menuDeleteFailed"));
  };

  const toggleAvailable = async (item) => {
    const updated = await updateMenuItem(item.id, { available: !item.available });
    setMenu(list => list.map(m => (m.id === item.id ? updated : m)));
  };

  const saveMenu = async () => {
    try {
      const f = menuModal.form;
      if (!f.name || f.price === "") {
        alert(t("ownerSettings.alerts.enterNameAndPrice"));
        return;
      }

      const priceRaw = String(f.price ?? "").trim().replace(",", ".");
      const priceNum = Number(priceRaw);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        alert(t("ownerSettings.alerts.invalidPrice", { defaultValue: "Некорректная цена" }));
        return;
      }
      const priceCents = toCents(priceNum);

      const discountRaw = String(f.discount ?? "").trim().replace(",", ".");
      const discountNum = discountRaw === "" ? 0 : Number(discountRaw);
      if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
        alert(t("ownerSettings.alerts.invalidDiscount", { defaultValue: "Скидка 0..100" }));
        return;
      }

      if (menuModal.editId) {
        const updated = await updateMenuItem(menuModal.editId, {
          name: f.name,
          category: f.category,
          price: formatCents(priceCents),
          discount: discountNum,
          available: !!f.available,
        });
        setMenu(list => list.map(it => (it.id === updated.id ? updated : it)));
      } else {
        const created = await createMenuItem({
          name: f.name,
          category: f.category,
          price: formatCents(priceCents),
          discount: discountNum,
          available: !!f.available,
        });
        setMenu(list => [...list, created]);
      }
      closeMenuModal();
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteMenu = async (id) => {
    if (!window.confirm(t("ownerSettings.confirm.deleteMenuItem"))) return;
    try {
      await deleteMenuItem(id);
      setMenu(list => list.filter(it => it.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  // ---- STAFF helpers ----
  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let s = "";
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  // ---- STAFF modal ----
  const openAddStaff = () =>
    setStaffModal({
      open: true, editId: null,
      form: { role: "courier", nickname: "", phone: "", email: "", password: genPassword(), color: randomStaffColor() }
    });

  const openEditStaff = (u) =>
    setStaffModal({
      open: true, editId: u.id,
      form: { role: u.role, nickname: u.nickname, phone: u.phone, email: u.email || "", password: "", color: u.color || randomStaffColor() }
    });

  const closeStaffModal = () => setStaffModal(m => ({ ...m, open: false }));

  // ---- STAFF CRUD ----
  const createStaff = async (payload) => {
    const res = await fetch(`${API}/staff`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.staffCreateFailed"));
    return data.item;
  };

  const updateStaff = async (id, payload) => {
    const res = await fetch(`${API}/staff/${id}`, {
      method: "PUT", headers: authHeaders, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.staffUpdateFailed"));
    return data.item;
  };

  const deleteStaffApi = async (id) => {
    const res = await fetch(`${API}/staff/${id}`, { method: "DELETE", headers: authHeaders });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("ownerSettings.errors.staffDeleteFailed"));
  };

  const saveStaff = async () => {
    const f = staffModal.form;
    if (!f.nickname || !f.role || !f.phone) {
      alert(t("ownerSettings.alerts.staffRequiredFields"));
      return;
    }
    try {
      if (staffModal.editId) {
        const payload = { role: f.role, nickname: f.nickname, phone: f.phone, email: f.email || null, color: f.color };
        if (f.password) payload.password = f.password;
        const updated = await updateStaff(staffModal.editId, payload);
        setStaff(list => list.map(u => (u.id === updated.id ? updated : u)));
      } else {
        if (!f.password) f.password = genPassword();
        const created = await createStaff({
          role: f.role,
          nickname: f.nickname,
          phone: f.phone,
          email: f.email || null,
          password: f.password,
          color: f.color,
        });
        setStaff(list => [created, ...list]);
      }
      closeStaffModal();
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      const updated = await updateStaff(u.id, { active: !u.active });
      setStaff(list => list.map(x => (x.id === u.id ? updated : x)));
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteStaff = async (id) => {
    if (!window.confirm(t("ownerSettings.confirm.deleteAccount"))) return;
    try {
      await deleteStaffApi(id);
      setStaff(list => list.filter(u => u.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  // ---- render ----
  if (loading) {
    return (
      <div className="owner-page">
        <div className="owner-content">{t("ownerSettings.loading")}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="owner-page">
        <div className="owner-content">{t("ownerSettings.errorWithMessage", { message: error })}</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="owner-page">
      <Header user={user} />

      {/* Title + (menu) stats */}
      <nav className="owner-tabs">
        <strong className="owner-title">{t("ownerSettings.title")}</strong>
        {activeTab === "menu" && (
          <div className="owner-stats">
            <div className="owner-chip">
              <BadgeCheck size={14} /> {t("ownerSettings.stats.items", { total: stats.total })}
            </div>
            <div className="owner-chip">
              <ChevronUp size={14} /> {t("ownerSettings.stats.active", { active: stats.active })}
            </div>
            <div className="owner-chip">
              <ChevronDown size={14} /> {t("ownerSettings.stats.avgPrice", { price: toEUR(stats.avg) })}
            </div>
          </div>
        )}
      </nav>

      {/* Tab navigation */}
      <div className="owner-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "general"}
          className={`owner-nav-tab ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <Shield size={18} />
          <span>{t("ownerSettings.sections.general")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "menu"}
          className={`owner-nav-tab ${activeTab === "menu" ? "active" : ""}`}
          onClick={() => setActiveTab("menu")}
        >
          <Package size={18} />
          <span>{t("ownerSettings.sections.menu")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "accounts"}
          className={`owner-nav-tab ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          <Users size={18} />
          <span>{t("ownerSettings.sections.accounts")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "customers"}
          className={`owner-nav-tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          <UserCog size={18} />
          <span>{t("ownerSettings.sections.customers", { defaultValue: "Клиенты" })}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "zones"}
          className={`owner-nav-tab ${activeTab === "zones" ? "active" : ""}`}
          onClick={() => setActiveTab("zones")}
        >
          <MapIcon size={18} />
          <span>{t("ownerSettings.sections.zones", { defaultValue: "Зоны доставки" })}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "invoice"}
          className={`owner-nav-tab ${activeTab === "invoice" ? "active" : ""}`}
          onClick={() => setActiveTab("invoice")}
        >
          <FileText size={18} />
          <span>{t("ownerSettings.sections.invoice", { defaultValue: "Накладная" })}</span>
        </button>
      </div>

      {/* Content */}
      <div className="owner-content">
        {/* General info */}
        {activeTab === "general" && (
        <section className="owner-card">
          <div className="owner-card-header">
            <div className="owner-card-title">
              <Shield size={18} /> {t("ownerSettings.sections.general")}
            </div>

            <button
              className="owner-primary-btn"
              onClick={() => alert(t("ownerSettings.alerts.todoSaveCompany"))}
            >
              <Save size={16} /> {t("ownerSettings.actions.save")}
            </button>
          </div>

          {/* Бренд */}
          <div className="os-group">
            <div className="os-group-head">
              <span className="os-ico"><Building2 size={18} /></span>
              <div>
                <h4>{t("ownerSettings.general.brandTitle", { defaultValue: "Бренд" })}</h4>
                <p>{t("ownerSettings.general.brandHint", { defaultValue: "Название и логотип ресторана" })}</p>
              </div>
            </div>

            <div className="os-grid">
              <div className="owner-field">
                <label>{t("ownerSettings.general.restaurantName")}</label>
                <input
                  value={restaurant.name}
                  onChange={(e) => setRestaurant((r) => ({ ...r, name: e.target.value }))}
                  placeholder={t("ownerSettings.general.restaurantNamePlaceholder")}
                />
              </div>

              <div className="owner-field os-col-2">
                <label>{t("ownerSettings.general.logo")}</label>

                <label
                  className={`os-drop ${restaurant.logo ? "filled" : ""} ${logoDrag ? "drag" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setLogoDrag(true); }}
                  onDragLeave={() => setLogoDrag(false)}
                  onDrop={onLogoDrop}
                >
                  <input type="file" accept="image/*" onChange={onLogoChange} hidden />

                  {restaurant.logo ? (
                    <>
                      <img className="os-drop-img" src={restaurant.logo} alt="logo" />
                      <div className="os-drop-overlay">
                        <span className="os-drop-overlay-btn">
                          <Upload size={16} /> {t("ownerSettings.general.logoReplace", { defaultValue: "Заменить" })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="os-drop-empty">
                      <div className="os-drop-ico"><Upload size={22} /></div>
                      <div className="os-drop-text">
                        <strong>{t("ownerSettings.general.logoDropTitle", { defaultValue: "Перетащите логотип сюда" })}</strong>
                        <span>{t("ownerSettings.general.logoDropHint", { defaultValue: "или нажмите, чтобы выбрать · PNG, JPG, SVG до 2 МБ" })}</span>
                      </div>
                    </div>
                  )}
                </label>

                {restaurant.logo && (
                  <button
                    type="button"
                    className="os-logo-remove"
                    onClick={() => setRestaurant((r) => ({ ...r, logo: "" }))}
                  >
                    <Trash2 size={15} /> {t("ownerSettings.actions.delete")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Контакты */}
          <div className="os-group">
            <div className="os-group-head">
              <span className="os-ico"><Phone size={18} /></span>
              <div>
                <h4>{t("ownerSettings.general.contactsTitle", { defaultValue: "Контакты" })}</h4>
                <p>{t("ownerSettings.general.contactsHint", { defaultValue: "Для клиентов и накладной" })}</p>
              </div>
            </div>

            <div className="os-grid">
              <div className="owner-field">
                <label>{t("ownerSettings.general.phone", { defaultValue: "Контактный телефон" })}</label>
                <input value={general.phone} onChange={(e) => setG("phone", e.target.value)} placeholder="+371 20000000" />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.email", { defaultValue: "Email" })}</label>
                <input type="email" value={general.email} onChange={(e) => setG("email", e.target.value)} placeholder="info@restaurant.lv" />
              </div>

              <div className="owner-field os-col-2">
                <label>{t("ownerSettings.general.address", { defaultValue: "Адрес ресторана" })}</label>
                <input
                  value={general.address}
                  onChange={(e) => setG("address", e.target.value)}
                  placeholder={t("ownerSettings.general.addressPlaceholder", { defaultValue: "Улица, дом, город" })}
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.website", { defaultValue: "Сайт" })}</label>
                <input type="url" value={general.website} onChange={(e) => setG("website", e.target.value)} placeholder="www.restaurant.lv" />
              </div>
            </div>
          </div>

          {/* Доставка и работа */}
          <div className="os-group">
            <div className="os-group-head">
              <span className="os-ico"><Clock size={18} /></span>
              <div>
                <h4>{t("ownerSettings.general.opsTitle", { defaultValue: "Доставка и работа" })}</h4>
                <p>{t("ownerSettings.general.opsHint", { defaultValue: "Часы, валюта и параметры доставки" })}</p>
              </div>
            </div>

            <div className="os-grid">
              <div className="owner-field">
                <label>{t("ownerSettings.general.workingHours", { defaultValue: "Часы работы" })}</label>
                <div className="os-hours">
                  <input type="time" value={general.openTime} onChange={(e) => setG("openTime", e.target.value)} />
                  <span className="os-dash">—</span>
                  <input type="time" value={general.closeTime} onChange={(e) => setG("closeTime", e.target.value)} />
                </div>
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.timezone", { defaultValue: "Часовой пояс" })}</label>
                <select value={general.timezone} onChange={(e) => setG("timezone", e.target.value)}>
                  <option value="Europe/Riga">Europe/Riga</option>
                  <option value="Europe/Vilnius">Europe/Vilnius</option>
                  <option value="Europe/Tallinn">Europe/Tallinn</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.currency", { defaultValue: "Валюта" })}</label>
                <select value={general.currency} onChange={(e) => setG("currency", e.target.value)}>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.minOrder", { defaultValue: "Мин. сумма заказа, €" })}</label>
                <input type="number" step="0.01" min="0" value={general.minOrder} onChange={(e) => setG("minOrder", e.target.value)} placeholder="0.00" />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.defaultDeliveryFee", { defaultValue: "Доставка по умолчанию, €" })}</label>
                <input type="number" step="0.01" min="0" value={general.defaultDeliveryFee} onChange={(e) => setG("defaultDeliveryFee", e.target.value)} placeholder="0.00" />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.freeDeliveryFrom", { defaultValue: "Бесплатная доставка от, €" })}</label>
                <input type="number" step="0.01" min="0" value={general.freeDeliveryFrom} onChange={(e) => setG("freeDeliveryFrom", e.target.value)} placeholder="0.00" />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.general.prepTime", { defaultValue: "Время приготовления, мин" })}</label>
                <input type="number" min="0" value={general.prepTimeMin} onChange={(e) => setG("prepTimeMin", e.target.value)} placeholder="30" />
              </div>
            </div>
          </div>

          <div className="os-note">
            <Info size={16} />
            {t("ownerSettings.general.stubNote", {
              defaultValue: "Эти настройки пока не сохраняются — заглушки для будущей логики.",
            })}
          </div>
        </section>
        )}

        {/* Menu */}
        {activeTab === "menu" && (
        <section className="owner-card">
          <div className="owner-card-header">
            <div className="owner-card-title">
              <Package size={18} /> {t("ownerSettings.sections.menu")}
            </div>

            <div className="owner-card-actions">
              <div className="owner-search">
                <Search className="owner-search-icon" size={16} />
                <input
                  placeholder={t("ownerSettings.menu.searchPlaceholder")}
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>

              <div className="owner-sort">
                <select
                  value={`${menuSortBy.field}:${menuSortBy.dir}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split(":");
                    setMenuSortBy({ field, dir });
                  }}
                >
                  <option value="name:asc">{t("ownerSettings.menu.sort.nameAsc")}</option>
                  <option value="name:desc">{t("ownerSettings.menu.sort.nameDesc")}</option>
                  <option value="price:asc">{t("ownerSettings.menu.sort.priceAsc")}</option>
                  <option value="price:desc">{t("ownerSettings.menu.sort.priceDesc")}</option>
                  <option value="discount:desc">{t("ownerSettings.menu.sort.discountDesc")}</option>
                  <option value="discount:asc">{t("ownerSettings.menu.sort.discountAsc")}</option>
                </select>
              </div>

              <button className="owner-primary-btn" onClick={openAddMenu}>
                <Plus size={16} /> {t("ownerSettings.menu.addItem")}
              </button>
            </div>
          </div>

          <div className="owner-table">
            <div className="owner-thead owner-grid-6">
              <div>#</div>
              <div>{t("ownerSettings.menu.table.name")}</div>
              <div>{t("ownerSettings.menu.table.category")}</div>
              <div>{t("ownerSettings.menu.table.price")}</div>
              <div>{t("ownerSettings.menu.table.discount")}</div>
              <div>{t("ownerSettings.menu.table.actions")}</div>
            </div>

            <div className="owner-tbody">
              {filteredMenu.map((it, idx) => (
                <div key={it.id} className={`owner-row owner-grid-6 ${!it.available ? "muted" : ""}`}>
                  <div className="owner-cell index">{idx + 1}</div>
                  <div className="owner-cell">{it.name}</div>
                  <div className="owner-cell">{it.category || "-"}</div>
                  <div className="owner-cell">{toEUR(it.price)}</div>
                  <div className="owner-cell">
                    {it.discount ? (
                      <span className="owner-discount">
                        <Percent size={12} /> -{it.discount}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="owner-cell actions">
                    <label className="owner-switch">
                      <input type="checkbox" checked={!!it.available} onChange={() => toggleAvailable(it)} />
                      <span />
                      <small>{it.available ? t("ownerSettings.menu.inSale") : t("ownerSettings.menu.hidden")}</small>
                    </label>

                    <button
                      className="owner-icon small"
                      onClick={() => openEditMenu(it)}
                      title={t("ownerSettings.actions.edit")}
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      className="owner-icon small danger"
                      onClick={() => deleteMenu(it.id)}
                      title={t("ownerSettings.actions.delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredMenu.length === 0 && (
                <div className="owner-empty">{t("ownerSettings.menu.empty")}</div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Staff */}
        {activeTab === "accounts" && (
        <section className="owner-card">
          <div className="owner-card-header">
            <div className="owner-card-title">
              <Users size={18} /> {t("ownerSettings.sections.accounts")}
            </div>

            <div className="owner-card-actions">
              <div className="owner-search">
                <Search className="owner-search-icon" size={16} />
                <input
                  placeholder={t("ownerSettings.staff.searchPlaceholder")}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>

              <button className="owner-primary-btn" onClick={openAddStaff}>
                <Plus size={16} /> {t("ownerSettings.staff.createAccount")}
              </button>
            </div>
          </div>

          <div className="owner-table">
            <div className="owner-thead owner-grid-5">
              <div>#</div>
              <div>{t("ownerSettings.staff.table.role")}</div>
              <div>{t("ownerSettings.staff.table.nickname")}</div>
              <div>{t("ownerSettings.staff.table.contacts")}</div>
              <div>{t("ownerSettings.staff.table.actions")}</div>
            </div>

            <div className="owner-tbody">
              {staffLoading && <div className="owner-empty">{t("ownerSettings.staff.loading")}</div>}

              {!staffLoading && filteredStaff.map((u, idx) => (
                <div key={u.id} className="owner-row owner-grid-5">
                  <div className="owner-cell index">{idx + 1}</div>

                  <div className="owner-cell">
                    <span className={`owner-role ${u.role}`}>
                      {t(`ownerSettings.staff.roles.${u.role}`, { defaultValue: u.role })}
                    </span>
                  </div>

                  <div className="owner-cell">
                    {u.role === "courier" && u.color && (
                      <span
                        title={u.color}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          background: u.color,
                          display: "inline-block",
                          marginRight: 8,
                          flex: "0 0 auto",
                        }}
                      />
                    )}
                    {u.nickname}
                  </div>

                  <div className="owner-cell">
                    <div className="owner-contact">
                      <Phone size={14} /> {u.phone || "—"}
                    </div>
                    {u.email && (
                      <div className="owner-contact">
                        <Mail size={14} /> {u.email}
                      </div>
                    )}
                  </div>

                  <div className="owner-cell actions">
                    <label className="owner-switch">
                      <input type="checkbox" checked={!!u.active} onChange={() => toggleActive(u)} />
                      <span />
                      <small>{u.active ? t("ownerSettings.staff.active") : t("ownerSettings.staff.disabled")}</small>
                    </label>

                    <button
                      className="owner-icon small"
                      onClick={() => openEditStaff(u)}
                      title={t("ownerSettings.actions.edit")}
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      className="owner-icon small danger"
                      onClick={() => deleteStaff(u.id)}
                      title={t("ownerSettings.actions.delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {!staffLoading && filteredStaff.length === 0 && (
                <div className="owner-empty">{t("ownerSettings.staff.empty")}</div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Delivery zones */}
        {activeTab === "customers" && (
          <CustomersTab API={API} authHeaders={authHeaders} t={t} />
        )}

        {activeTab === "zones" && (
          <DeliveryZonesEditor API={API} authHeaders={authHeaders} t={t} />
        )}

        {/* Invoice settings */}
        {activeTab === "invoice" && (
          <InvoiceSettingsTab API={API} authHeaders={authHeaders} t={t} />
        )}
      </div>

      {/* ---- MENU MODAL ---- */}
      {menuModal.open && (
        <div className="owner-modal" onMouseDown={closeMenuModal}>
          <div className="owner-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3>
                {menuModal.editId ? t("ownerSettings.menuModal.editTitle") : t("ownerSettings.menuModal.addTitle")}
              </h3>
              <button className="owner-icon" onClick={closeMenuModal}>
                <X size={18} />
              </button>
            </div>

            <div className="owner-modal-body owner-grid-2">
              <div className="owner-field">
                <label>{t("ownerSettings.menuModal.fields.name")}</label>
                <input
                  value={menuModal.form.name}
                  onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  placeholder={t("ownerSettings.menuModal.placeholders.name")}
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.menuModal.fields.category")}</label>
                <input
                  value={menuModal.form.category}
                  onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, category: e.target.value } }))}
                  placeholder={t("ownerSettings.menuModal.placeholders.category")}
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.menuModal.fields.price")}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={menuModal.form.price}
                  onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))}
                  placeholder="0.00"
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.menuModal.fields.discount")}</label>
                <input
                  type="number" min="0" max="100"
                  value={menuModal.form.discount}
                  onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, discount: e.target.value } }))}
                  placeholder="0"
                />
              </div>

              <label className="owner-checkbox">
                <input
                  type="checkbox"
                  checked={menuModal.form.available}
                  onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, available: e.target.checked } }))}
                />
                {t("ownerSettings.menuModal.fields.available")}
              </label>
            </div>

            <div className="owner-modal-footer">
              <button className="owner-secondary-btn" onClick={closeMenuModal}>
                {t("ownerSettings.actions.cancel")}
              </button>
              <button className="owner-primary-btn" onClick={saveMenu}>
                <Save size={16} /> {t("ownerSettings.actions.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- STAFF MODAL ---- */}
      {staffModal.open && (
        <div className="owner-modal" onMouseDown={closeStaffModal}>
          <div className="owner-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="owner-modal-header">
              <h3>
                {staffModal.editId ? t("ownerSettings.staffModal.editTitle") : t("ownerSettings.staffModal.addTitle")}
              </h3>
              <button className="owner-icon" onClick={closeStaffModal}>
                <X size={18} />
              </button>
            </div>

            <div className="owner-modal-body owner-grid-2">
              <div className="owner-field">
                <label>{t("ownerSettings.staffModal.fields.role")}</label>
                <select
                  value={staffModal.form.role}
                  onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, role: e.target.value } }))}
                >
                  <option value="courier">{t("ownerSettings.staff.roles.courier")}</option>
                  <option value="admin">{t("ownerSettings.staff.roles.admin")}</option>
                </select>
              </div>

              {staffModal.form.role === "courier" && (
                <div className="owner-field">
                  <label>{t("ownerSettings.staffModal.fields.color", { defaultValue: "Цвет на карте" })}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="color"
                      value={staffModal.form.color || "#2F8CFF"}
                      onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, color: e.target.value } }))}
                      style={{ width: 46, height: 36, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                    />
                    <button
                      type="button"
                      className="owner-secondary-btn"
                      onClick={() => setStaffModal((s) => ({ ...s, form: { ...s.form, color: randomStaffColor() } }))}
                    >
                      {t("ownerSettings.staffModal.actions.randomColor", { defaultValue: "Случайный" })}
                    </button>
                  </div>
                </div>
              )}

              <div className="owner-field">
                <label>{t("ownerSettings.staffModal.fields.nickname")}</label>
                <input
                  value={staffModal.form.nickname}
                  onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, nickname: e.target.value } }))}
                  placeholder={t("ownerSettings.staffModal.placeholders.nickname")}
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.staffModal.fields.phone")}</label>
                <input
                  value={staffModal.form.phone}
                  onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, phone: e.target.value } }))}
                  placeholder={t("ownerSettings.staffModal.placeholders.phone")}
                />
              </div>

              <div className="owner-field">
                <label>{t("ownerSettings.staffModal.fields.email")}</label>
                <input
                  type="email"
                  value={staffModal.form.email}
                  onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, email: e.target.value } }))}
                  placeholder={t("ownerSettings.staffModal.placeholders.email")}
                />
              </div>

              <div className="owner-field">
                <label>
                  {t("ownerSettings.staffModal.fields.password")}
                  {staffModal.editId ? ` ${t("ownerSettings.staffModal.passwordEditHint")}` : ""}
                </label>
                <div className="owner-password-row">
                  <input
                    type="text"
                    value={staffModal.form.password}
                    onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, password: e.target.value } }))}
                    placeholder={t("ownerSettings.staffModal.placeholders.password")}
                  />
                  <button
                    type="button"
                    className="owner-secondary-btn"
                    onClick={() => setStaffModal((s) => ({ ...s, form: { ...s.form, password: genPassword() } }))}
                  >
                    {t("ownerSettings.staffModal.actions.generate")}
                  </button>
                </div>
              </div>
            </div>

            <div className="owner-modal-footer">
              <button className="owner-secondary-btn" onClick={closeStaffModal}>
                {t("ownerSettings.actions.cancel")}
              </button>
              <button className="owner-primary-btn" onClick={saveStaff}>
                <Save size={16} /> {t("ownerSettings.actions.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
