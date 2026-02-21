import React from "react";
import styles from "./Loader.module.css";
import { useTranslation } from "react-i18next";

const Loader = ({ label = "Loading..." }) => {
    const { t } = useTranslation();

  return (
    <div className={styles.container} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <div className={styles.spinnerWrap}>
          <div className={styles.glow} />
          <div className={styles.spinner} />
        </div>

        <div className={styles.text}>
          <div className={styles.title}>{t("loadingSpin.title")}</div>
          <div className={styles.sub}>{t("loadingSpin.desc")}</div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
