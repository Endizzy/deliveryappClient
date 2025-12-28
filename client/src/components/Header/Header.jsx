import React, { useState } from "react";
import styles from "./Header.module.css";
import {Map as MapIcon, Moon, Settings, MonitorCog, Sun, User, Box, Menu, X} from "lucide-react";
import { ThemeProvider, useTheme } from "../../provider/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";

const Header = ({user = null}) => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { openSettings } = useTheme();

    // function ThemeSelector() {
    //     const { changeTheme } = useTheme();
    //     return (
    //         <div className={styles.theme_selector}>
    //             <button className={styles.icon_btn} onClick={() => changeTheme("purpleTheme")} title="Светлая тема"><Sun size={20} /></button>
    //             <button className={styles.icon_btn} onClick={() => changeTheme("darkGreenTheme")} title="Тёмная тема"><Moon size={20} /></button>
    //         </div>
    //     );
    // }

    const handleNavigation = (path) => {
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={styles.header_section}>
            <div className={styles.header_left}>
                <div className={styles.logo}>
                    <div className={styles.logo_icon}>
                        <svg viewBox="0 0 24 24" width="32" height="32">
                            <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"/>
                        </svg>
                    </div>
                    <span className={styles.logo_text}>DeliveryApp</span>
                </div>
            </div>

            {/* Desktop Navigation */}
            <nav className={styles.header_right}>
                <div className={styles.header_icons}>
                    {/* <ThemeSelector/> */}
                    <div className={styles.icon_content}>
                        <span className={styles.icon_span}>Настройки</span>
                        <button className={styles.icon_btn} onClick={openSettings} title="Настройки"><MonitorCog size={24}/>
                        </button>
                    </div>
                    <div className={styles.icon_content}>
                        <span className={styles.icon_span}>Настройки</span>
                        <button className={styles.icon_btn} onClick={() => handleNavigation("/ownerSettings")} title="Настройки"><Settings size={24}/>
                        </button>
                    </div>
                    <div className={styles.icon_content}>
                        <span className={styles.icon_span}>Карта</span>
                        <button className={styles.icon_btn} onClick={() => handleNavigation("/map")} title="Карта"><MapIcon size={24}/>
                        </button>
                    </div>
                    <div className={styles.icon_content}>
                        <span className={styles.icon_span}>Профиль</span>
                        <button className={styles.icon_btn} onClick={() => handleNavigation("/userProfile")} title="Профиль"><User size={24}/>
                        </button>
                    </div>
                    <div className={styles.icon_content}>
                        <span className={styles.icon_span}>Заказы</span>
                        <button className={styles.icon_btn} onClick={() => handleNavigation("/orderPanel")} title="Заказы"><Box size={24}/>
                        </button>
                    </div>
                    <div className={styles.user_info}>
                        <span className={styles.user_name}>
                            {user?.firstName ?? 'undefined'} {user?.lastName ?? 'undefined'}
                        </span>
                        <button className={styles.logout_btn}>Выход</button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Button */}
            <button 
                className={styles.mobile_menu_btn}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Меню"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <nav className={styles.mobile_menu}>
                    <div className={styles.mobile_menu_content}>
                        {/* <div className={styles.mobile_theme_selector}>
                            <ThemeSelector/>
                        </div> */}
                        <button 
                            className={styles.mobile_menu_item}
                            onClick={openSettings}
                        >
                            <MonitorCog size={20} />
                            <span>Персонализация</span>
                        </button>
                        <button 
                            className={styles.mobile_menu_item}
                            onClick={() => handleNavigation("/ownerSettings")}
                        >
                            <Settings size={20} />
                            <span>Настройки</span>
                        </button>
                        <button 
                            className={styles.mobile_menu_item}
                            onClick={() => handleNavigation("/map")}
                        >
                            <MapIcon size={20} />
                            <span>Карта</span>
                        </button>
                        <button 
                            className={styles.mobile_menu_item}
                            onClick={() => handleNavigation("/userProfile")}
                        >
                            <User size={20} />
                            <span>Профиль</span>
                        </button>
                        <button 
                            className={styles.mobile_menu_item}
                            onClick={() => handleNavigation("/orderPanel")}
                        >
                            <Box size={20} />
                            <span>Заказы</span>
                        </button>
                        <div className={styles.mobile_user_section}>
                            <span className={styles.mobile_user_name}>
                                {user?.firstName ?? 'undefined'} {user?.lastName ?? 'undefined'}
                            </span>
                            <button className={styles.mobile_logout_btn}>Выход</button>
                        </div>
                    </div>
                </nav>
            )}
        </header>
    );
};

export default Header;
