// OwnerSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Settings, Save, Upload, Image as ImageIcon, Plus, Edit, Trash2,
    Search, Percent, Package, Users, Shield, Phone, Mail,
    BadgeCheck, X, ChevronDown, ChevronUp
} from "lucide-react";
import "./ownerSettings.css";
import Header from "../../components/Header/Header.jsx";

const toEUR = (n) => `€${Number(n || 0).toFixed(2)}`;

export default function OwnerSettings() {
    const navigate = useNavigate();
    const API = import.meta.env.VITE_API_URL;

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // визуальные поля
    const [restaurant, setRestaurant] = useState({ name: "", logo: "" });

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
        form: { role: "courier", nickname: "", phone: "", email: "", password: "" }
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
        if (res.status === 401) throw new Error("Не авторизован");
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Не удалось получить данные компании");

        if (data.company) {
            setRestaurant(r => ({
                ...r,
                name: data.company.name || "",
                logo: data.company.logoUrl || "",
            }));
        }
    };

    // ---- profile + menu ----
    const fetchProfile = async () => {
        const res = await fetch(`${API}/user/me`, { headers: authHeaders });
        if (res.status === 401) throw new Error("Не авторизован");
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Не удалось получить профиль");
        setUser(data.user);
    };

    const fetchMenu = async () => {
        const res = await fetch(`${API}/menu`, { headers: authHeaders });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось загрузить меню");
        setMenu(data.items);
    };

    // ---- staff ----
    const fetchStaff = async (q = "") => {
        setStaffLoading(true);
        try {
            const url = q ? `${API}/staff?q=${encodeURIComponent(q)}` : `${API}/staff`;
            const res = await fetch(url, { headers: authHeaders });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось загрузить сотрудников");
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
                setError(e.message);
                if (String(e.message).includes("Не авторизован")) navigate("/login");
            } finally {
                setLoading(false);
            }
        })();
    }, [navigate]);

    // ---- derived: menu ----
    const filteredMenu = useMemo(() => {
        const q = menuSearch.trim().toLowerCase();
        let list = !q ? [...menu] : menu.filter(m =>
            (m.name || "").toLowerCase().includes(q) ||
            (m.category || "").toLowerCase().includes(q)
        );
        const { field, dir } = menuSortBy;
        list.sort((a, b) => {
            const va = field === "price" || field === "discount" ? Number(a[field]) : String(a[field] ?? "").toLowerCase();
            const vb = field === "price" || field === "discount" ? Number(b[field]) : String(b[field] ?? "").toLowerCase();
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
    const onLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setRestaurant(r => ({ ...r, logo: reader.result }));
        reader.readAsDataURL(file);
    };

    // ---- MENU modal ----
    const [menuModal, setMenuModal] = useState({
        open: false, editId: null,
        form: { name: "", price: "", discount: 0, category: "", available: true }
    });

    const openAddMenu = () =>
        setMenuModal({ open: true, editId: null,
            form: { name: "", price: "", discount: 0, category: "", available: true } });

    const openEditMenu = (item) =>
        setMenuModal({ open: true, editId: item.id,
            form: { name: item.name, price: item.price, discount: item.discount, category: item.category, available: !!item.available } });

    const closeMenuModal = () => setMenuModal(m => ({ ...m, open: false }));

    // ---- MENU CRUD ----
    const createMenuItem = async (payload) => {
        const res = await fetch(`${API}/menu`, { method: "POST", headers: authHeaders, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось создать позицию");
        return data.item;
    };
    const updateMenuItem = async (id, payload) => {
        const res = await fetch(`${API}/menu/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось обновить позицию");
        return data.item;
    };
    const deleteMenuItem = async (id) => {
        const res = await fetch(`${API}/menu/${id}`, { method: "DELETE", headers: authHeaders });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось удалить позицию");
    };

    const toggleAvailable = async (item) => {
        const updated = await updateMenuItem(item.id, { available: !item.available });
        setMenu(list => list.map(m => (m.id === item.id ? updated : m)));
    };

    const saveMenu = async () => {
        try {
            const f = menuModal.form;
            if (!f.name || f.price === "") return alert("Введите название и цену");
            if (menuModal.editId) {
                const updated = await updateMenuItem(menuModal.editId, {
                    name: f.name,
                    category: f.category,
                    price: Number(f.price),
                    discount: Number(f.discount || 0),
                    available: !!f.available,
                });
                setMenu(list => list.map(it => (it.id === updated.id ? updated : it)));
            } else {
                const created = await createMenuItem({
                    name: f.name,
                    category: f.category,
                    price: Number(f.price),
                    discount: Number(f.discount || 0),
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
        if (!confirm("Удалить позицию меню?")) return;
        try {
            await deleteMenuItem(id);
            setMenu(list => list.filter(it => it.id !== id));
        } catch (e) {
            alert(e.message);
        }
    };

    // ---- STAFF helpers ----
    const genPassword = () => {
        const chars =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
        let s = "";
        for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    };

    // ---- STAFF modal ----
    const openAddStaff = () =>
        setStaffModal({
            open: true, editId: null,
            form: { role: "courier", nickname: "", phone: "", email: "", password: genPassword() }
        });

    const openEditStaff = (u) =>
        setStaffModal({
            open: true, editId: u.id,
            form: { role: u.role, nickname: u.nickname, phone: u.phone, email: u.email || "", password: "" } // пустой пароль = не менять
        });

    const closeStaffModal = () => setStaffModal(m => ({ ...m, open: false }));

    // ---- STAFF CRUD ----
    const createStaff = async (payload) => {
        const res = await fetch(`${API}/staff`, { method: "POST", headers: authHeaders, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось создать аккаунт");
        return data.item;
    };

    const updateStaff = async (id, payload) => {
        const res = await fetch(`${API}/staff/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось обновить аккаунт");
        return data.item;
    };

    const deleteStaffApi = async (id) => {
        const res = await fetch(`${API}/staff/${id}`, { method: "DELETE", headers: authHeaders });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось удалить аккаунт");
    };

    const saveStaff = async () => {
        const f = staffModal.form;
        if (!f.nickname || !f.role || !f.phone) {
            alert("Укажите роль, никнейм и телефон");
            return;
        }
        try {
            if (staffModal.editId) {
                const payload = {
                    role: f.role, nickname: f.nickname, phone: f.phone, email: f.email || null,
                };
                if (f.password) payload.password = f.password; // меняем пароль только если введён
                const updated = await updateStaff(staffModal.editId, payload);
                setStaff(list => list.map(u => (u.id === updated.id ? updated : u)));
            } else {
                if (!f.password) f.password = genPassword();
                const created = await createStaff({
                    role: f.role, nickname: f.nickname, phone: f.phone, email: f.email || null, password: f.password,
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
        if (!confirm("Удалить аккаунт?")) return;
        try {
            await deleteStaffApi(id);
            setStaff(list => list.filter(u => u.id !== id));
        } catch (e) {
            alert(e.message);
        }
    };

    // live-поиск: можно дергать API, если хочешь серверный фильтр
    useEffect(() => {
        // Серверный поиск
        // const q = staffSearch.trim();
        // fetchStaff(q).catch(() => {});
    }, [staffSearch]);

    // ---- render ----
    if (loading) return <div className="owner-page"><div className="owner-content">Загрузка…</div></div>;
    if (error)   return <div className="owner-page"><div className="owner-content">Ошибка: {error}</div></div>;
    if (!user)   return null;

    return (
        <div className="owner-page">
            <Header user={user}/>

            {/* Tabs */}
            <nav className="owner-tabs">
                <strong className="owner-title">Настройки ресторана</strong>
                <div className="owner-stats">
                    <div className="owner-chip"><BadgeCheck size={14}/> Позиции: {stats.total}</div>
                    <div className="owner-chip"><ChevronUp size={14}/> Активно: {stats.active}</div>
                    <div className="owner-chip"><ChevronDown size={14}/> Средняя цена: {toEUR(stats.avg)}</div>
                </div>
            </nav>

            {/* Content */}
            <div className="owner-content">
                {/* Общие сведения */}
                <section className="owner-card">
                    <div className="owner-card-header">
                        <div className="owner-card-title"><Shield size={18}/> Общие сведения</div>
                        <button className="owner-primary-btn" onClick={() => alert("Здесь будет PATCH /api/company/:id")}>
                            <Save size={16}/> Сохранить
                        </button>
                    </div>

                    <div className="owner-grid-2">
                        <div className="owner-field">
                            <label>Название ресторана</label>
                            <input
                                value={restaurant.name}
                                onChange={(e) => setRestaurant((r) => ({ ...r, name: e.target.value }))}
                                placeholder="Например, Briana Sushi"
                            />
                        </div>
                        <div className="owner-field">
                            <label>Логотип</label>
                            <div className="owner-logo-uploader">
                                {restaurant.logo ? (
                                    <img className="owner-logo-preview" src={restaurant.logo} alt="logo" />
                                ) : (
                                    <div className="owner-logo-placeholder">
                                        <ImageIcon size={24} />
                                        <span>Нет логотипа</span>
                                    </div>
                                )}
                                <label className="owner-upload-btn">
                                    <Upload size={16}/> Загрузить
                                    <input type="file" accept="image/*" onChange={onLogoChange} hidden />
                                </label>
                                {restaurant.logo && (
                                    <button className="owner-secondary-btn" onClick={() => setRestaurant((r) => ({ ...r, logo: "" }))}>
                                        <X size={16}/> Удалить
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Меню */}
                <section className="owner-card">
                    <div className="owner-card-header">
                        <div className="owner-card-title"><Package size={18}/> Меню ресторана</div>
                        <div className="owner-card-actions">
                            <div className="owner-search">
                                <Search className="owner-search-icon" size={16}/>
                                <input
                                    placeholder="Поиск по названию/категории…"
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
                                    <option value="name:asc">Название ↑</option>
                                    <option value="name:desc">Название ↓</option>
                                    <option value="price:asc">Цена ↑</option>
                                    <option value="price:desc">Цена ↓</option>
                                    <option value="discount:desc">Скидка ↓</option>
                                    <option value="discount:asc">Скидка ↑</option>
                                </select>
                            </div>
                            <button className="owner-primary-btn" onClick={openAddMenu}>
                                <Plus size={16}/> Добавить позицию
                            </button>
                        </div>
                    </div>

                    <div className="owner-table">
                        <div className="owner-thead owner-grid-6">
                            <div>#</div><div>Название</div><div>Категория</div>
                            <div>Цена</div><div>Скидка</div><div>Действия</div>
                        </div>

                        <div className="owner-tbody">
                            {filteredMenu.map((it, idx) => (
                                <div key={it.id} className={`owner-row owner-grid-6 ${!it.available ? "muted" : ""}`}>
                                    <div className="owner-cell index">{idx + 1}</div>
                                    <div className="owner-cell">{it.name}</div>
                                    <div className="owner-cell">{it.category || "-"}</div>
                                    <div className="owner-cell">{toEUR(it.price)}</div>
                                    <div className="owner-cell">
                                        {it.discount
                                            ? <span className="owner-discount"><Percent size={12}/> -{it.discount}%</span>
                                            : "—"}
                                    </div>
                                    <div className="owner-cell actions">
                                        <label className="owner-switch">
                                            <input type="checkbox" checked={!!it.available} onChange={() => toggleAvailable(it)} />
                                            <span/><small>{it.available ? "В продаже" : "Скрыто"}</small>
                                        </label>
                                        <button className="owner-icon small" onClick={() => openEditMenu(it)} title="Редактировать">
                                            <Edit size={16}/>
                                        </button>
                                        <button className="owner-icon small danger" onClick={() => deleteMenu(it.id)} title="Удалить">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredMenu.length === 0 && <div className="owner-empty">Нет позиций. Добавьте первую.</div>}
                        </div>
                    </div>
                </section>

                {/* Сотрудники */}
                <section className="owner-card">
                    <div className="owner-card-header">
                        <div className="owner-card-title">
                            <Users size={18}/> Аккаунты (админы и курьеры)
                        </div>

                        <div className="owner-card-actions">
                            <div className="owner-search">
                                <Search className="owner-search-icon" size={16}/>
                                <input
                                    placeholder="Поиск по роли/нику/телефону…"
                                    value={staffSearch}
                                    onChange={(e) => setStaffSearch(e.target.value)}
                                />
                            </div>

                            <button className="owner-primary-btn" onClick={openAddStaff}>
                                <Plus size={16}/> Создать аккаунт
                            </button>
                        </div>
                    </div>

                    <div className="owner-table">
                        <div className="owner-thead owner-grid-5">
                            <div>#</div>
                            <div>Роль</div>
                            <div>Никнейм</div>
                            <div>Контакты</div>
                            <div>Действия</div>
                        </div>

                        <div className="owner-tbody">
                            {staffLoading && <div className="owner-empty">Загрузка сотрудников…</div>}
                            {!staffLoading && filteredStaff.map((u, idx) => (
                                <div key={u.id} className="owner-row owner-grid-5">
                                    <div className="owner-cell index">{idx + 1}</div>
                                    <div className="owner-cell">
                                        <span className={`owner-role ${u.role}`}>{u.role}</span>
                                    </div>
                                    <div className="owner-cell">{u.nickname}</div>
                                    <div className="owner-cell">
                                        <div className="owner-contact"><Phone size={14}/> {u.phone || "—"}</div>
                                        {u.email && <div className="owner-contact"><Mail size={14}/> {u.email}</div>}
                                    </div>
                                    <div className="owner-cell actions">
                                        <label className="owner-switch">
                                            <input type="checkbox" checked={!!u.active} onChange={() => toggleActive(u)} />
                                            <span/><small>{u.active ? "Активен" : "Отключен"}</small>
                                        </label>
                                        <button className="owner-icon small" onClick={() => openEditStaff(u)} title="Редактировать">
                                            <Edit size={16}/>
                                        </button>
                                        <button className="owner-icon small danger" onClick={() => deleteStaff(u.id)} title="Удалить">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!staffLoading && filteredStaff.length === 0 && (
                                <div className="owner-empty">Нет аккаунтов.</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* ---- МОДАЛКА Меню ---- */}
            {menuModal.open && (
                <div className="owner-modal" onMouseDown={closeMenuModal}>
                    <div className="owner-modal-card" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="owner-modal-header">
                            <h3>{menuModal.editId ? "Редактировать позицию" : "Добавить позицию"}</h3>
                            <button className="owner-icon" onClick={closeMenuModal}><X size={18}/></button>
                        </div>

                        <div className="owner-modal-body owner-grid-2">
                            <div className="owner-field">
                                <label>Название</label>
                                <input
                                    value={menuModal.form.name}
                                    onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                                    placeholder="Например, Ролл Калифорния"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Категория</label>
                                <input
                                    value={menuModal.form.category}
                                    onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, category: e.target.value } }))}
                                    placeholder="Суши / Роллы / Горячее…"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Цена</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={menuModal.form.price}
                                    onChange={(e) => setMenuModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Скидка, %</label>
                                <input
                                    type="number" min="0" max="90"
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
                                В продаже
                            </label>
                        </div>

                        <div className="owner-modal-footer">
                            <button className="owner-secondary-btn" onClick={closeMenuModal}>Отмена</button>
                            <button className="owner-primary-btn" onClick={saveMenu}><Save size={16}/> Сохранить</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- МОДАЛКА Сотрудники ---- */}
            {staffModal.open && (
                <div className="owner-modal" onMouseDown={closeStaffModal}>
                    <div className="owner-modal-card" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="owner-modal-header">
                            <h3>{staffModal.editId ? "Редактировать аккаунт" : "Создать аккаунт"}</h3>
                            <button className="owner-icon" onClick={closeStaffModal}><X size={18}/></button>
                        </div>

                        <div className="owner-modal-body owner-grid-2">
                            <div className="owner-field">
                                <label>Роль</label>
                                <select
                                    value={staffModal.form.role}
                                    onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, role: e.target.value } }))}
                                >
                                    <option value="courier">courier</option>
                                    <option value="admin">admin</option>
                                </select>
                            </div>

                            <div className="owner-field">
                                <label>Никнейм</label>
                                <input
                                    value={staffModal.form.nickname}
                                    onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, nickname: e.target.value } }))}
                                    placeholder="Например, CourierMihail"
                                />
                            </div>

                            <div className="owner-field">
                                <label>Телефон</label>
                                <input
                                    value={staffModal.form.phone}
                                    onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, phone: e.target.value } }))}
                                    placeholder="+371..."
                                />
                            </div>

                            <div className="owner-field">
                                <label>Email (необязательно)</label>
                                <input
                                    type="email"
                                    value={staffModal.form.email}
                                    onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, email: e.target.value } }))}
                                    placeholder="dispatcher@company.com"
                                />
                            </div>

                            <div className="owner-field">
                                <label>Пароль {staffModal.editId ? "(оставь пустым — не менять)" : ""}</label>
                                <div className="owner-password-row">
                                    <input
                                        type="text"
                                        value={staffModal.form.password}
                                        onChange={(e) => setStaffModal((s) => ({ ...s, form: { ...s.form, password: e.target.value } }))}
                                        placeholder="Сгенерировать или ввести"
                                    />
                                    <button
                                        type="button"
                                        className="owner-secondary-btn"
                                        onClick={() => setStaffModal((s) => ({ ...s, form: { ...s.form, password: genPassword() } }))}
                                    >
                                        Сгенерировать
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="owner-modal-footer">
                            <button className="owner-secondary-btn" onClick={closeStaffModal}>Отмена</button>
                            <button className="owner-primary-btn" onClick={saveStaff}><Save size={16}/> Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
