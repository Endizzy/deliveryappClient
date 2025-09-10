import React from "react";
import styles from "./Header.module.css";

const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <nav>
                    <ul className={styles.navList}>
                        <li className={styles.navItem}>
                            <div className={styles.itemBlock}>
                                <span>+</span>
                                <a href="/adminPanel" className={styles.itemLink}>Новый заказ</a>
                            </div>
                        </li>
                        <li className={styles.navItem}>
                            <div className={styles.itemBlock}>
                                <span>0</span>
                                <a href="/info" className={styles.itemLink}>Активные</a>
                            </div>
                        </li>
                        <li className={styles.navItem}>
                            <div className={styles.itemBlock}>
                                <span>0</span>
                                <a href="#" className={styles.itemLink}>Предзаказы</a>
                            </div>
                        </li>
                        <li className={styles.navItem}>
                            <div className={styles.itemBlock}>
                                <span>0</span>
                                <a href="#" className={styles.itemLink}>Завершенные</a>
                            </div>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;
