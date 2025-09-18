import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./styles/login.module.css";

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [captchaCode, setCaptchaCode] = useState("7B4K9");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        captcha: "",
        remember: false,
    });

    const generateCaptcha = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let captcha = "";
        for (let i = 0; i < 5; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return captcha;
    };

    const handleCaptchaRefresh = () => {
        setCaptchaCode(generateCaptcha());
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.captcha !== captchaCode) {
            alert("Неверная капча");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Ошибка входа");
            } else {
                localStorage.setItem("token", data.token);

                if (!formData.remember) {
                    sessionStorage.setItem("token", data.token);
                }

                alert("Успешный вход!");
                navigate("/orderPanel"); // редиректим в панель заказов
            }
        } catch (err) {
            console.error("Ошибка сети:", err);
            alert("Ошибка сети. Попробуйте позже.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authBlock}>
                <div className={styles.logoSection}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" width="32" height="32">
                                <path
                                    fill="currentColor"
                                    d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"
                                />
                            </svg>
                        </div>
                        <span className={styles.logoText}>DeliveryApp</span>
                    </div>
                    <p className={styles.authSubtitle}>Система управления доставкой</p>
                </div>

                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h2 className={styles.authTitle}>Вход в систему</h2>
                        <p className={styles.authDescription}>
                            Введите ваши данные для входа в аккаунт
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email или телефон</label>
                            <input
                                type="text"
                                name="email"
                                className={styles.formInput}
                                placeholder="example@mail.com или +37127424725"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Пароль</label>
                            <div className={styles.inputWithIcon}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className={styles.formInput}
                                    placeholder="Введите пароль"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={togglePassword}
                                >
                                    {showPassword ? "Скрыть" : "Показать"}
                                </button>
                            </div>
                        </div>

                        {/* Капча */}
                        <div className={styles.captchaContainer}>
                            <span className={styles.captchaCode}>{captchaCode}</span>
                            <button
                                type="button"
                                className={styles.captchaRefresh}
                                onClick={handleCaptchaRefresh}
                            >
                                Обновить
                            </button>
                            <input
                                type="text"
                                name="captcha"
                                className={styles.formInput}
                                placeholder="Введите код"
                                value={formData.captcha}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={styles.formCheckbox}>
                            <input
                                type="checkbox"
                                id="remember"
                                name="remember"
                                checked={formData.remember}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="remember">Запомнить меня</label>
                        </div>

                        {/* Кнопка */}
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={loading}
                        >
                            {loading ? "Входим..." : "Войти"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        Нет аккаунта?{" "}
                        <a href="#" onClick={() => navigate("/registration")}>
                            Зарегистрироваться
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
