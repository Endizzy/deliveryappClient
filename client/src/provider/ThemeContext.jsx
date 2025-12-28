import React, { createContext, useContext, useState, useEffect } from "react";
import { themes } from "../themes/themes";
import ModalSettings from "../components/ModalSettings/ModalSettings.jsx";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // по умолчанию фиолетовая тема
    const [themeKey, setThemeKey] = useState("purpleTheme");

    // при первом запуске читаем сохранённую тему
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme && themes[savedTheme]) {
            setThemeKey(savedTheme);
        }
    }, []);

    // при смене темы сохраняем её в localStorage
    useEffect(() => {
        localStorage.setItem("theme", themeKey);
        const theme = themes[themeKey];
        if (theme?.gradient) {
            // прокидываем градиент в CSS-переменную
            document.documentElement.style.setProperty("--app-gradient", theme.gradient);
            document.documentElement.style.setProperty("--app-fontColor", theme.fontColor);
            document.documentElement.style.setProperty("--app-headerGradient", theme.headerGradient);
        }
    }, [themeKey]);

    const changeTheme = (newKey) => {
        if (themes[newKey]) {
            setThemeKey(newKey);
        }
    };

    // settings modal state available globally via theme context
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const theme = themes[themeKey];

    return (
        <ThemeContext.Provider 
            value={{ 
                theme, 
                changeTheme, 
                themeKey, 
                openSettings,
                closeSettings, 
                isSettingsOpen 
            }}
        >
            {children}
            <ModalSettings isOpen={isSettingsOpen} onClose={closeSettings} />
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
