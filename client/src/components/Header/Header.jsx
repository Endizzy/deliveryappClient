import React, { useState, useEffect } from "react";
import styles from "./Header.module.css";
import { Map as MapIcon, Settings, MonitorCog, User, Box, Menu, X, BarChart2 } from "lucide-react";
import { useTheme } from "../../provider/ThemeContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import LanguageSelector from "./../LanguageSelect/LanguageSelect.jsx";
import { useTranslation } from "react-i18next";
import useUserStore from "../../store/userStore.js";

// user-проп больше не нужен: имя берём из общего store.
// Пропс оставлен опциональным ради обратной совместимости со старыми вызовами.
const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Подсветка текущей страницы
  const isActive = (path) => location.pathname.toLowerCase().startsWith(path.toLowerCase());

  const displayName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : t("header.guest", { defaultValue: "—" });

  return (
    <header className={styles.header_section}>
      <div className={styles.header_left}>
        <div className={styles.logo}>
          <div className={styles.logo_icon}>
            <a href="/orderPanel">
              <img src="/logoDeli.png" alt="Logo" className={styles.logo_image} />
            </a>
          </div>
          <span className={styles.logo_text}>{t("header.appName")}</span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className={styles.header_right}>
        <div className={styles.header_icons}>
          <LanguageSelector />

          <div className={styles.icon_content}>
            <button
              className={styles.icon_btn}
              onClick={openSettings}
              title={t("header.personalization")}
            >
              <MonitorCog size={24} />
              <span className={styles.icon_span}>{t("header.personalization")}</span>
            </button>
          </div>

          <div className={styles.icon_content}>
            <button
              className={`${styles.icon_btn} ${isActive("/ownerSettings") ? styles.icon_btn_active : ""}`}
              onClick={() => handleNavigation("/ownerSettings")}
              aria-current={isActive("/ownerSettings") ? "page" : undefined}
              title={t("header.ownerSettings")}
            >
              <Settings size={24} />
              <span className={styles.icon_span}>{t("header.ownerSettings")}</span>
            </button>
          </div>

          <div className={styles.icon_content}>
            <button
              className={`${styles.icon_btn} ${isActive("/map") ? styles.icon_btn_active : ""}`}
              onClick={() => handleNavigation("/map")}
              aria-current={isActive("/map") ? "page" : undefined}
              title={t("header.map")}
            >
              <MapIcon size={24} />
              <span className={styles.icon_span}>{t("header.map")}</span>
            </button>
          </div>

          <div className={styles.icon_content}>
            <button
              className={`${styles.icon_btn} ${isActive("/userProfile") ? styles.icon_btn_active : ""}`}
              onClick={() => handleNavigation("/userProfile")}
              aria-current={isActive("/userProfile") ? "page" : undefined}
              title={t("header.profile")}
            >
              <User size={24} />
              <span className={styles.icon_span}>{t("header.profile")}</span>
            </button>
          </div>

          <div className={styles.icon_content}>
            <button
              className={`${styles.icon_btn} ${isActive("/orderPanel") ? styles.icon_btn_active : ""}`}
              onClick={() => handleNavigation("/orderPanel")}
              aria-current={isActive("/orderPanel") ? "page" : undefined}
              title={t("header.orders")}
            >
              <Box size={24} />
              <span className={styles.icon_span}>{t("header.orders")}</span>
            </button>
          </div>

          <div className={styles.icon_content}>
            <button
              className={`${styles.icon_btn} ${isActive("/report") ? styles.icon_btn_active : ""}`}
              onClick={() => handleNavigation("/report")}
              aria-current={isActive("/report") ? "page" : undefined}
              title={t("header.report")}
            >
              <BarChart2 size={24} />
              <span className={styles.icon_span}>{t("header.report")}</span>
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
            <div className={styles.mobile_lang}>
              <LanguageSelector variant="segmented" />
            </div>

            <button
              className={`${styles.mobile_menu_item} ${isActive("/orderPanel") ? styles.mobile_menu_item_active : ""}`}
              onClick={() => handleNavigation("/orderPanel")}
              aria-current={isActive("/orderPanel") ? "page" : undefined}
            >
              <Box size={20} />
              <span>{t("header.orders")}</span>
            </button>

            <button
              className={`${styles.mobile_menu_item} ${isActive("/map") ? styles.mobile_menu_item_active : ""}`}
              onClick={() => handleNavigation("/map")}
              aria-current={isActive("/map") ? "page" : undefined}
            >
              <MapIcon size={20} />
              <span>{t("header.map")}</span>
            </button>

            <button
              className={`${styles.mobile_menu_item} ${isActive("/report") ? styles.mobile_menu_item_active : ""}`}
              onClick={() => handleNavigation("/report")}
              aria-current={isActive("/report") ? "page" : undefined}
            >
              <BarChart2 size={20} />
              <span>{t("header.report")}</span>
            </button>

            <button
              className={`${styles.mobile_menu_item} ${isActive("/userProfile") ? styles.mobile_menu_item_active : ""}`}
              onClick={() => handleNavigation("/userProfile")}
              aria-current={isActive("/userProfile") ? "page" : undefined}
            >
              <User size={20} />
              <span>{t("header.profile")}</span>
            </button>

            <button
              className={`${styles.mobile_menu_item} ${isActive("/ownerSettings") ? styles.mobile_menu_item_active : ""}`}
              onClick={() => handleNavigation("/ownerSettings")}
              aria-current={isActive("/ownerSettings") ? "page" : undefined}
            >
              <Settings size={20} />
              <span>{t("header.ownerSettings")}</span>
            </button>

            <button className={styles.mobile_menu_item} onClick={openSettings}>
              <MonitorCog size={20} />
              <span>{t("header.personalization")}</span>
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
