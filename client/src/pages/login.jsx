import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import styles from './styles/login.module.css';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [captchaCode, setCaptchaCode] = useState('7B4K9');
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        captcha: '',
        remember: false
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

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login form submitted:', formData);
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authBlock}>
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
                    <h2 className={styles.authTitle}>Вход в систему</h2>
                    <p className={styles.authDescription}>Введите ваши данные для входа в аккаунт</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email или телефон</label>
                        <div className={styles.inputWithIcon}>
                            <svg className={styles.inputIcon} viewBox="0 0 24 24">
                                <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                            </svg>
                            <input
                                type="text"
                                name="email"
                                className={styles.formInput}
                                placeholder="example@mail.com или +37127424725"
                                value={formData.email}
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
                                placeholder="Введите пароль"
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
                    </div>

                    <div className={styles.captchaContainer}>
                        <div style={{flex: 1}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                <span className={styles.captchaCode}>{captchaCode}</span>
                                <button type="button" className={styles.captchaRefresh} onClick={handleCaptchaRefresh}>
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
                                    </svg>
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

                    <div className={styles.formRow}>
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
                        <a href="#" className={styles.forgotLink}>Забыли пароль?</a>
                    </div>

                    <button type="submit" className={styles.btnPrimary}>
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z"/>
                        </svg>
                        Войти в систему
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
                    Нет аккаунта? <a href="#" onClick={()=> navigate("/registration")}>Зарегистрироваться</a>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Login;