import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Settings,
    Save,
    Upload,
    Image as ImageIcon,
    Plus,
    Edit,
    Trash2,
    Search,
    Percent,
    Package,
    Users,
    Shield,
    Phone,
    Mail,
    BadgeCheck,
    X,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import "./ownerSettings.css";

// Хелперы
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const toEUR = (n) => `€${Number(n || 0).toFixed(2)}`;

// Ключи localStorage
const LS_KEYS = {
    restaurant: "owner.restaurant",
    menu: "owner.menu",
    staff: "owner.staff",
};

export default function OwnerSettings() {
    const navigate = useNavigate();

    // ---------- Состояния ----------
    const [restaurant, setRestaurant] = useState(() => {
        const saved = localStorage.getItem(LS_KEYS.restaurant);
        return saved
            ? JSON.parse(saved)
            : { name: "", logo: "", createdAt: new Date().toISOString() };
    });

    const [menu, setMenu] = useState(() => {
        const saved = localStorage.getItem(LS_KEYS.menu);
        return saved
            ? JSON.parse(saved)
            : [
                { id: uid(), name: "Суши лосось", price: 2.5, discount: 0, category: "Суши", available: true },
                { id: uid(), name: "Ролл Филадельфия", price: 9.2, discount: 10, category: "Роллы", available: true },
                { id: uid(), name: "Рамен с курицей", price: 7.5, discount: 0, category: "Горячее", available: true },
            ];
    });

    const [staff, setStaff] = useState(() => {
        const saved = localStorage.getItem(LS_KEYS.staff);
        return saved
            ? JSON.parse(saved)
            : [
                { id: uid(), role: "admin", nickname: "Dispatcher1", phone: "+37120000001", email: "disp@example.com", active: true },
                { id: uid(), role: "courier", nickname: "CourierMihail", phone: "+37120000002", email: "", active: true },
            ];
    });

    // Поисковые строки
    const [menuSearch, setMenuSearch] = useState("");
    const [staffSearch, setStaffSearch] = useState("");

    // UI-модалки
    const [menuModal, setMenuModal] = useState({ open: false, editId: null, form: { name: "", price: "", discount: 0, category: "", available: true } });
    const [staffModal, setStaffModal] = useState({ open: false, editId: null, form: { role: "courier", nickname: "", phone: "", email: "" } });

    const [menuSortBy, setMenuSortBy] = useState({ field: "name", dir: "asc" });

    // ---------- Persist ----------
    useEffect(() => localStorage.setItem(LS_KEYS.restaurant, JSON.stringify(restaurant)), [restaurant]);
    useEffect(() => localStorage.setItem(LS_KEYS.menu, JSON.stringify(menu)), [menu]);
    useEffect(() => localStorage.setItem(LS_KEYS.staff, JSON.stringify(staff)), [staff]);

    // ---------- Derived ----------
    const filteredMenu = useMemo(() => {
        let list = [...menu].filter(
            (m) =>
                m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
                m.category.toLowerCase().includes(menuSearch.toLowerCase())
        );
        const { field, dir } = menuSortBy;
        list.sort((a, b) => {
            const va = field === "price" || field === "discount" ? Number(a[field]) : String(a[field]).toLowerCase();
            const vb = field === "price" || field === "discount" ? Number(b[field]) : String(b[field]).toLowerCase();
            if (va < vb) return dir === "asc" ? -1 : 1;
            if (va > vb) return dir === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [menu, menuSearch, menuSortBy]);

    const filteredStaff = useMemo(() => {
        return staff.filter(
            (s) =>
                s.nickname.toLowerCase().includes(staffSearch.toLowerCase()) ||
                s.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
                s.phone.toLowerCase().includes(staffSearch.toLowerCase())
        );
    }, [staff, staffSearch]);

    const stats = useMemo(() => {
        const total = menu.length;
        const active = menu.filter((m) => m.available).length;
        const avg = total ? menu.reduce((acc, m) => acc + Number(m.price), 0) / total : 0;
        return { total, active, avg };
    }, [menu]);

    // ---------- Handlers: Restaurant ----------
    const onLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setRestaurant((r) => ({ ...r, logo: reader.result }));
        reader.readAsDataURL(file);
    };

    // ---------- Handlers: Menu ----------
    const openAddMenu = () =>
        setMenuModal({ open: true, editId: null, form: { name: "", price: "", discount: 0, category: "", available: true } });

    const openEditMenu = (item) =>
        setMenuModal({ open: true, editId: item.id, form: { name: item.name, price: item.price, discount: item.discount, category: item.category, available: item.available } });

    const closeMenuModal = () => setMenuModal((m) => ({ ...m, open: false }));

    const saveMenu = () => {
        const f = menuModal.form;
        if (!f.name || f.price === "") return alert("Введите название и цену");
        if (menuModal.editId) {
            setMenu((list) => list.map((it) => (it.id === menuModal.editId ? { ...it, ...f, price: Number(f.price), discount: Number(f.discount) } : it)));
        } else {
            setMenu((list) => [...list, { id: uid(), ...f, price: Number(f.price), discount: Number(f.discount) }]);
        }
        closeMenuModal();
    };

    const deleteMenu = (id) => {
        if (!confirm("Удалить позицию меню?")) return;
        setMenu((list) => list.filter((it) => it.id !== id));
    };

    // ---------- Handlers: Staff ----------
    const openAddStaff = () =>
        setStaffModal({ open: true, editId: null, form: { role: "courier", nickname: "", phone: "", email: "" } });

    const openEditStaff = (user) =>
        setStaffModal({ open: true, editId: user.id, form: { role: user.role, nickname: user.nickname, phone: user.phone, email: user.email || "" } });

    const closeStaffModal = () => setStaffModal((m) => ({ ...m, open: false }));

    const saveStaff = () => {
        const f = staffModal.form;
        if (!f.nickname || !f.role) return alert("Укажите роль и никнейм");
        if (staffModal.editId) {
            setStaff((list) => list.map((u) => (u.id === staffModal.editId ? { ...u, ...f } : u)));
        } else {
            setStaff((list) => [...list, { id: uid(), active: true, ...f }]);
        }
        closeStaffModal();
    };

    const deleteStaff = (id) => {
        if (!confirm("Удалить аккаунт?")) return;
        setStaff((list) => list.filter((u) => u.id !== id));
    };

    const toggleActive = (id) => {
        setStaff((list) => list.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
    };

    // ---------- Render ----------
    return (
        <div className="owner-page">
            {/* Header */}
            <header className="owner-header">
                <div className="owner-header-left">
                    <div className="owner-logo">
                        <div className="owner-logo-icon">
                            <svg viewBox="0 0 24 24" width="32" height="32">
                                <path
                                    fill="currentColor"
                                    d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"
                                />
                            </svg>
                        </div>
                        <span className="owner-logo-text">DeliveryApp</span>
                    </div>
                </div>

                <div className="owner-header-right">
                    <button className="owner-icon-btn" onClick={() => navigate("/orderPanel")}>
                        <Package size={24} />
                    </button>
                    <button className="owner-icon-btn">
                        <Settings size={24} />
                    </button>
                    <div className="owner-user-info">
                        <span className="owner-user-name">Owner</span>
                        <button className="owner-logout-btn" onClick={() => navigate("/login")}>Выход</button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="owner-tabs">
                <strong className="owner-title">
                    Настройки ресторана
                </strong>
                <div className="owner-stats">
                    <div className="owner-chip"><BadgeCheck size={14}/> Позиции: {stats.total}</div>
                    <div className="owner-chip"><ChevronUp size={14}/> Активно: {stats.active}</div>
                    <div className="owner-chip"><ChevronDown size={14}/> Средняя цена: {toEUR(stats.avg)}</div>
                </div>
            </nav>

            {/* Content */}
            <div className="owner-content">
                {/* Блок: Общие настройки ресторана */}
                <section className="owner-card">
                    <div className="owner-card-header">
                        <div className="owner-card-title">
                            <Shield size={18}/> Общие сведения
                        </div>
                        <button className="owner-primary-btn" onClick={() => alert("В проде тут полетит PATCH на API")}>
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

                {/* Блок: Меню */}
                <section className="owner-card">
                    <div className="owner-card-header">
                        <div className="owner-card-title">
                            <Package size={18}/> Меню ресторана
                        </div>

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
                            <div>#</div>
                            <div>Название</div>
                            <div>Категория</div>
                            <div>Цена</div>
                            <div>Скидка</div>
                            <div>Действия</div>
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
                                            <span className="owner-discount"><Percent size={12}/> -{it.discount}%</span>
                                        ) : "—"}
                                    </div>
                                    <div className="owner-cell actions">
                                        <label className="owner-switch">
                                            <input
                                                type="checkbox"
                                                checked={!!it.available}
                                                onChange={() =>
                                                    setMenu((list) =>
                                                        list.map((m) => (m.id === it.id ? { ...m, available: !m.available } : m))
                                                    )
                                                }
                                            />
                                            <span/>
                                            <small>{it.available ? "В продаже" : "Скрыто"}</small>
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

                            {filteredMenu.length === 0 && (
                                <div className="owner-empty">
                                    Нет позиций. Добавьте первую.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Блок: Сотрудники */}
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
                            {filteredStaff.map((u, idx) => (
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
                                            <input type="checkbox" checked={!!u.active} onChange={() => toggleActive(u.id)} />
                                            <span/>
                                            <small>{u.active ? "Активен" : "Отключен"}</small>
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

                            {filteredStaff.length === 0 && (
                                <div className="owner-empty">Нет аккаунтов.</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* ---------- МОДАЛКИ ---------- */}
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
                                    onChange={(e) => setMenuModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                                    placeholder="Например, Ролл Калифорния"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Категория</label>
                                <input
                                    value={menuModal.form.category}
                                    onChange={(e) => setMenuModal((m) => ({ ...m, form: { ...m.form, category: e.target.value } }))}
                                    placeholder="Суши / Роллы / Горячее…"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Цена</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={menuModal.form.price}
                                    onChange={(e) => setMenuModal((m) => ({ ...m, form: { ...m.form, price: e.target.value } }))}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="owner-field">
                                <label>Скидка, %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="90"
                                    value={menuModal.form.discount}
                                    onChange={(e) => setMenuModal((m) => ({ ...m, form: { ...m.form, discount: e.target.value } }))}
                                    placeholder="0"
                                />
                            </div>

                            <label className="owner-checkbox">
                                <input
                                    type="checkbox"
                                    checked={menuModal.form.available}
                                    onChange={(e) => setMenuModal((m) => ({ ...m, form: { ...m.form, available: e.target.checked } }))}
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
