import React from "react";
import styles from "./Header.module.css";
import {Map as MapIcon, Moon, Settings, Sun, User} from "lucide-react";
import { ThemeProvider, useTheme } from "../../provider/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";

const Header = () => {

    const navigate = useNavigate();

    function ThemeSelector() {
        const { changeTheme } = useTheme();
        return (
            <div style={{ display: "Flex", gap: 16 }}>
                <button className={styles.icon_btn} onClick={() => changeTheme("purpleTheme")}><Sun size={24} /></button>
                <button className={styles.icon_btn} onClick={() => changeTheme("darkGreenTheme")}><Moon size={24} /></button>
            </div>
        );
    }

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

            <div className={styles.header_right}>
                <div className={styles.header_icons}>
                    <ThemeSelector/>
                    <button className={styles.icon_btn} onClick={() => navigate("/ownerSettings")}><Settings size={24}/>
                    </button>
                    <button className={styles.icon_btn} onClick={() => navigate("/map")}><MapIcon size={24}/></button>
                    <button className={styles.icon_btn} onClick={() => navigate("/userProfile")}><User size={24}/></button>
                    <div className={styles.user_info}>
                        <span className={styles.user_name}>Briana</span>
                        <button className={styles.logout_btn}>Выход</button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
