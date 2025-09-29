import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./styles/userProfile.module.css";
import { Package } from "lucide-react";

export default function UserProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null); // NEW: company
    const [err, setErr] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) { navigate("/login"); return; }

        const fetchMe = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/user/me`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.status === 401) { navigate("/login"); return; }

                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось получить профиль");

                setUser(data.user);
                setCompany(data.company ?? null); // NEW: company
            } catch (e) {
                setErr(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMe();
    }, [navigate]);

    const logout = () => {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        navigate("/login");
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12" />
                            </svg>
                        </div>
                        <span>DeliveryApp</span>
                    </div>
                </header>
                <main className={styles.container}>
                    <div className={styles.card}>Загружаем профиль…</div>
                </main>
            </div>
        );
    }

    if (err) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12" />
                            </svg>
                        </div>
                        <span>DeliveryApp</span>
                    </div>
                </header>
                <main className={styles.container}>
                    <div className={styles.cardError}>
                        <div className={styles.errorTitle}>Ошибка</div>
                        <div className={styles.errorText}>{err}</div>
                        <button className={styles.btnPrimary} onClick={() => navigate("/login")}>
                            Войти заново
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const initials = `${(user?.firstName || "?")[0]}${(user?.lastName || "?")[0]}`.toUpperCase();
    const companyInitial = (company?.name?.[0] || "C").toUpperCase(); // NEW

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12" />
                            </svg>
                        </div>
                        <span>DeliveryApp</span>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <button className="owner-icon-btn" onClick={() => navigate("/orderPanel")}>
                        <Package size={24} />
                    </button>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{user.firstName} {user.lastName}</div>
                        <span className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}>{user.role}</span>
                    </div>
                    <button className={styles.logoutBtn} onClick={logout}>Выйти</button>
                </div>
            </header>

            <main className={styles.container}>
                {/* Карточка пользователя */}
                <section className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.avatar}>{initials}</div>
                        <div>
                            <h2 className={styles.title}>{user.firstName} {user.lastName}</h2>
                            <div className={styles.subtitle}>{user.email}</div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.grid}>
                        <div className={styles.item}>
                            <div className={styles.label}>Email</div>
                            <div className={styles.value}>{user.email}</div>
                        </div>
                        <div className={styles.item}>
                            <div className={styles.label}>Телефон</div>
                            <div className={styles.value}>{user.phone || "—"}</div>
                        </div>
                        <div className={styles.item}>
                            <div className={styles.label}>Роль</div>
                            <div className={`${styles.value} ${styles.cap}`}>{user.role}</div>
                        </div>
                        <div className={styles.item}>
                            <div className={styles.label}>Компания (ID)</div>
                            <div className={styles.value}>{user.companyId ?? "—"}</div>
                        </div>
                        <div className={styles.item}>
                            <div className={styles.label}>ID пользователя</div>
                            <div className={styles.value}>{user.id}</div>
                        </div>
                        <div className={styles.item}>
                            <div className={styles.label}>Создан</div>
                            <div className={styles.value}>{new Date(user.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                </section>

                {/* Карточка компании */}
                <section className={styles.card}>
                    <div className={styles.cardHeader}>
                        {company ? (
                            <>
                                {company.logoUrl ? (
                                    <img className={styles.companyLogo} src={company.logoUrl} alt={company.name} />
                                ) : (
                                    <div className={styles.avatar}>{companyInitial}</div>
                                )}
                                <div>
                                    <h2 className={styles.title}>{company.name}</h2>
                                    <div className={styles.subtitle}>ID: {company.id}</div>
                                </div>
                            </>
                        ) : (
                            <span>У вас нет компании</span>
                        )}
                    </div>

                    {company && (
                        <>
                            <div className={styles.divider} />
                            <div className={styles.grid}>
                                <div className={styles.item}>
                                    <div className={styles.label}>Телефон</div>
                                    <div className={styles.value}>{company.phone || "—"}</div>
                                </div>
                                <div className={styles.item}>
                                    <div className={styles.label}>E-mail владельца</div>
                                    <div className={styles.value}>{company.ownerEmail || "—"}</div>
                                </div>
                                <div className={styles.item}>
                                    <div className={styles.label}>ID владельца</div>
                                    <div className={styles.value}>{company.ownerUserId}</div>
                                </div>
                                <div className={styles.item}>
                                    <div className={styles.label}>Меню (ID)</div>
                                    <div className={styles.value}>{company.menuId ?? "—"}</div>
                                </div>
                                <div className={styles.item}>
                                    <div className={styles.label}>Создана</div>
                                    <div className={styles.value}>{new Date(company.createdAt).toLocaleString()}</div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
