import React, { useState } from 'react';
import styles from './styles/registration.module.css';
import {useNavigate} from "react-router-dom";
import { RefreshCcw } from 'lucide-react';

const Registration = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [captchaCode, setCaptchaCode] = useState('9K3M7');
    const navigate = useNavigate()
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: '',
        captcha: '',
        terms: false
    });

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let captcha = '';
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

    const toggleConfirmPassword = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const calculatePasswordStrength = (password) => {
        let strength = 0;

        if (password.length > 0) {
            strength = 1; // Weak
        }

        if (password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)) {
            strength = 2; // Medium
        }

        if (password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
            strength = 3; // Strong
        }

        return strength;
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Update password strength
        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    role: "client"
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Ошибка регистрации");
                return;
            }

            // Успех → сразу на логин
            navigate("/login");
        } catch (err) {
            console.error("Ошибка регистрации:", err);
            alert("Не удалось подключиться к серверу");
        }
    };


    const renderPasswordStrengthBars = () => {
        const strengthClasses = ['', 'activeWeak', 'activeMedium', 'activeStrong'];
        return (
            <div className={styles.passwordStrength}>
                {[1, 2, 3].map(level => (
                    <div
                        key={level}
                        className={`${styles.strengthBar} ${passwordStrength >= level ? styles[strengthClasses[passwordStrength]] : ''}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className={styles.authContainer}>
            <div className="authBlock">
                <div className={styles.logoSection}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <svg viewBox="0 0 24 24" width="32" height="32">
                                <path fill="currentColor" d="M12 2L2 7L12 12L22 7L12 2M2 17L12 22L22 17M2 12L12 17L22 12"/>
                            </svg>
                        </div>
                        <span className={styles.logoText}>DeliveryApp</span>
                    </div>
                    <p className={styles.authSubtitle}>Система управления доставкой</p>
                </div>

                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h2 className={styles.authTitle}>Регистрация</h2>
                        <p className={styles.authDescription}>Создайте новый аккаунт в системе</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Имя</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    className={styles.formInput}
                                    placeholder="Введите имя"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Фамилия</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    className={styles.formInput}
                                    placeholder="Введите фамилию"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <div className={styles.inputWithIcon}>
                                <svg className={styles.inputIcon} viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                                </svg>
                                <input
                                    type="email"
                                    name="email"
                                    className={styles.formInput}
                                    placeholder="example@mail.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Телефон</label>
                            <div className={styles.inputWithIcon}>
                                <svg className={styles.inputIcon} viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                                </svg>
                                <input
                                    type="tel"
                                    name="phone"
                                    className={styles.formInput}
                                    placeholder="+37127424725"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Пароль</label>
                            <div className={styles.inputWithIcon}>
                                <svg className={styles.inputIcon} viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                                </svg>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className={styles.formInput}
                                    placeholder="Минимум 8 символов"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button type="button" className={styles.passwordToggle} onClick={togglePassword}>
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d={showPassword
                                            ? "M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"
                                            : "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
                                        }/>
                                    </svg>
                                </button>
                            </div>
                            {renderPasswordStrengthBars()}
                            <p className={styles.passwordHint}>Используйте буквы, цифры и специальные символы</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Подтвердите пароль</label>
                            <div className={styles.inputWithIcon}>
                                <svg className={styles.inputIcon} viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                                </svg>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className={styles.formInput}
                                    placeholder="Повторите пароль"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                                <button type="button" className={styles.passwordToggle} onClick={toggleConfirmPassword}>
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d={showConfirmPassword
                                            ? "M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z"
                                            : "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
                                        }/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className={styles.captchaContainer}>
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                    <span className={styles.captchaCode}>{captchaCode}</span>
                                    <button type="button" className={styles.captchaRefresh} onClick={handleCaptchaRefresh}>
                                        <RefreshCcw size={24}/>
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                name="captcha"
                                className={styles.formInput}
                                placeholder="Введите код"
                                style={{width: '120px'}}
                                value={formData.captcha}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={`${styles.formCheckbox} ${styles.termsCheckbox}`}>
                            <input
                                type="checkbox"
                                id="terms"
                                name="terms"
                                checked={formData.terms}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="terms">
                                Я согласен с <a href="#">условиями использования</a> и <a href="#">политикой конфиденциальности</a>
                            </label>
                        </div>

                        <button type="submit" className={styles.btnPrimary}>
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                            </svg>
                            Зарегистрироваться
                        </button>

                        <div className={styles.divider}>
                            <div className={styles.dividerLine}></div>
                            <span className={styles.dividerText}>или</span>
                            <div className={styles.dividerLine}></div>
                        </div>

                        <div className={styles.socialButtons}>
                            <button type="button" className={styles.socialBtn}>
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"/>
                                </svg>
                                Google
                            </button>
                            <button type="button" className={styles.socialBtn}>
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path fill="#1877F2" d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
                                </svg>
                                Facebook
                            </button>
                        </div>
                    </form>

                    <div className={styles.authFooter}>
                        Уже есть аккаунт? <a href="#" onClick={() => navigate("/login")}>Войти</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Registration;