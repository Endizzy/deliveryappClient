import React from "react";
import styles from "./Footer.module.css";

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.versionBadge} title="Application version">
                <span className={styles.versionDot} aria-hidden="true" />
                <span className={styles.versionLabel}>ver</span>
                <span className={styles.versionValue}>prod_v4.2.1</span>
            </div>
        </footer>
    );
};

export default Footer;
