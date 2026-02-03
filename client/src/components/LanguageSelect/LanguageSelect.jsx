import React, { useState, useRef, useEffect } from "react";
import i18n from "i18next";
import { Globe, ChevronDown } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import styles from "./LanguageSelector.module.css";

const LANGUAGES = [
  { code: "en", label: "EN", country: "US" },
  { code: "lv", label: "LV", country: "LV" },
  { code: "ru", label: "RU", country: "RU" },
];

const LanguageSelector = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang =
    LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.button}
        onClick={() => setOpen(!open)}
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe size={18} />
        <span className={styles.label}>{currentLang.label}</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${open ? styles.open : ""}`}
        />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`${styles.item} ${
                lang.code === currentLang.code ? styles.active : ""
              }`}
              onClick={() => changeLanguage(lang.code)}
            >
              <ReactCountryFlag
                svg
                countryCode={lang.country}
                className={styles.flag}
              />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
