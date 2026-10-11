import React, { useState, useEffect } from "react";
import styles from "./Footer.module.css";


const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerText}>
                <p>Version: prod_v2.3.5</p>
            </div>
        </footer>
    );
};

export default Footer;