import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./userProfile.module.css";
import Header from "../../components/Header/Header.jsx";
import TwoFactorSection from "../../components/TwoFactorSection/TwoFactorSection.jsx";
import { useTranslation } from "react-i18next";

export default function UserProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
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
        if (!res.ok || !data.ok) throw new Error(data.error || t("userProfile.errors.profileFetchFailed"));

        setUser(data.user);
        setCompany(data.company ?? null);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [navigate]); // eslint-disable-line

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>{t("userProfile.loading")}</div>
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
                <path
                  fill="currentColor"
                  d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"
                />
              </svg>
            </div>
            <span>{t("header.appName")}</span>
          </div>
        </header>

        <main className={styles.container}>
          <div className={styles.cardError}>
            <div className={styles.errorTitle}>{t("userProfile.errorTitle")}</div>
            <div className={styles.errorText}>{err}</div>
            <button className={styles.btnPrimary} onClick={() => navigate("/login")}>
              {t("userProfile.actions.loginAgain")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const initials = `${(user?.firstName || "?")[0]}${(user?.lastName || "?")[0]}`.toUpperCase();
  const companyInitial = (company?.name?.[0] || "C").toUpperCase();

  return (
    <div className={styles.page}>
      <Header user={user} />

      <main className={styles.container}>
        {/* User card */}
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
              <div className={styles.label}>{t("userProfile.fields.email")}</div>
              <div className={styles.value}>{user.email}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.label}>{t("userProfile.fields.phone")}</div>
              <div className={styles.value}>{user.phone || t("common.dash")}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.label}>{t("userProfile.fields.role")}</div>
              <div className={`${styles.value} ${styles.cap}`}>{user.role}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.label}>{t("userProfile.fields.companyId")}</div>
              <div className={styles.value}>{user.companyId ?? t("common.dash")}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.label}>{t("userProfile.fields.userId")}</div>
              <div className={styles.value}>{user.id}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.label}>{t("userProfile.fields.createdAt")}</div>
              <div className={styles.value}>{new Date(user.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </section>

        {/* Company card */}
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
                  <div className={styles.subtitle}>{t("userProfile.company.id", { id: company.id })}</div>
                </div>
              </>
            ) : (
              <span>{t("userProfile.company.noCompany")}</span>
            )}
          </div>

          {company && (
            <>
              <div className={styles.divider} />
              <div className={styles.grid}>
                <div className={styles.item}>
                  <div className={styles.label}>{t("userProfile.company.phone")}</div>
                  <div className={styles.value}>{company.phone || t("common.dash")}</div>
                </div>

                <div className={styles.item}>
                  <div className={styles.label}>{t("userProfile.company.ownerEmail")}</div>
                  <div className={styles.value}>{company.ownerEmail || t("common.dash")}</div>
                </div>

                <div className={styles.item}>
                  <div className={styles.label}>{t("userProfile.company.ownerUserId")}</div>
                  <div className={styles.value}>{company.ownerUserId}</div>
                </div>

                <div className={styles.item}>
                  <div className={styles.label}>{t("userProfile.company.menuId")}</div>
                  <div className={styles.value}>{company.menuId ?? t("common.dash")}</div>
                </div>

                <div className={styles.item}>
                  <div className={styles.label}>{t("userProfile.company.createdAt")}</div>
                  <div className={styles.value}>{new Date(company.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 2FA section */}
        <TwoFactorSection />
      </main>
    </div>
  );
}
