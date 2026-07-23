import React, { useState, useEffect } from "react";
import styles from "./Header.module.css";
import { Map as MapIcon, Settings, MonitorCog, User, Box, Menu, X, BarChart2 } from "lucide-react";
import { useTheme } from "../../provider/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "./../LanguageSelect/LanguageSelect.jsx";
import { useTranslation } from "react-i18next";
import useUserStore from "../../store/userStore.js";

// user-проп больше не нужен: имя берём из общего store.
// Пропс оставлен опциональным ради обратной совместимости со старыми вызовами.
const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { openSettings } = useTheme();
  const { t } = useTranslation();

  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);
  const logout = useUserStore((s) => s.logout);

  // Гидрация: если токен есть, а профиль в store пуст
  // (первый заход после деплоя, очищенный persist) — догружаем с сервера.
  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token && !user) fetchUser();
  }, [user, fetchUser]);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const displayName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : t("header.guest", { defaultValue: "—" });

  return (
    <header className={styles.header_section}>
      <div className={styles.header_left}>
        <div className={styles.logo}>
          <div className={styles.logo_icon}>
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path
                fill="currentColor"
                d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"
              />
            </svg>
          </div>
          <span className={styles.logo_text}>{t("header.appName")}</span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className={styles.header_right}>
        <div className={styles.header_icons}>
          <LanguageSelector />

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.personalization")}</span>
            <button
              className={styles.icon_btn}
              onClick={openSettings}
              title={t("header.personalization")}
            >
              <MonitorCog size={24} />
            </button>
          </div>

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.ownerSettings")}</span>
            <button
              className={styles.icon_btn}
              onClick={() => handleNavigation("/ownerSettings")}
              title={t("header.ownerSettings")}
            >
              <Settings size={24} />
            </button>
          </div>

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.map")}</span>
            <button
              className={styles.icon_btn}
              onClick={() => handleNavigation("/map")}
              title={t("header.map")}
            >
              <MapIcon size={24} />
            </button>
          </div>

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.profile")}</span>
            <button
              className={styles.icon_btn}
              onClick={() => handleNavigation("/userProfile")}
              title={t("header.profile")}
            >
              <User size={24} />
            </button>
          </div>

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.orders")}</span>
            <button
              className={styles.icon_btn}
              onClick={() => handleNavigation("/orderPanel")}
              title={t("header.orders")}
            >
              <Box size={24} />
            </button>
          </div>

          <div className={styles.icon_content}>
            <span className={styles.icon_span}>{t("header.report")}</span>
            <button
              className={styles.icon_btn}
              onClick={() => handleNavigation("/report")}
              title={t("header.report")}
            >
              <BarChart2 size={24} />
            </button>
          </div>

          <div className={styles.user_info}>
            <span className={styles.user_name}>{displayName}</span>
            <button className={styles.logout_btn} onClick={handleLogout}>
              {t("header.logout")}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button
        className={styles.mobile_menu_btn}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={t("header.menu")}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <nav className={styles.mobile_menu}>
          <div className={styles.mobile_menu_content}>
            <button className={styles.mobile_menu_item} onClick={openSettings}>
              <MonitorCog size={20} />
              <span>{t("header.personalization")}</span>
            </button>

            <button
              className={styles.mobile_menu_item}
              onClick={() => handleNavigation("/ownerSettings")}
            >
              <Settings size={20} />
              <span>{t("header.ownerSettings")}</span>
            </button>

            <button className={styles.mobile_menu_item} onClick={() => handleNavigation("/map")}>
              <MapIcon size={20} />
              <span>{t("header.map")}</span>
            </button>

            <button
              className={styles.mobile_menu_item}
              onClick={() => handleNavigation("/userProfile")}
            >
              <User size={20} />
              <span>{t("header.profile")}</span>
            </button>

            <button
              className={styles.mobile_menu_item}
              onClick={() => handleNavigation("/orderPanel")}
            >
              <Box size={20} />
              <span>{t("header.orders")}</span>
            </button>

            <button
              className={styles.mobile_menu_item}
              onClick={() => handleNavigation("/report")}
            >
              <BarChart2 size={20} />
              <span>{t("header.report")}</span>
            </button>

            <div className={styles.mobile_user_section}>
              <span className={styles.mobile_user_name}>{displayName}</span>
              <button className={styles.mobile_logout_btn} onClick={handleLogout}>
                {t("header.logout")}
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
