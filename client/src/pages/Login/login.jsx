import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./login.module.css";
import { RefreshCcw, Shield, Loader2, ArrowLeft } from 'lucide-react';
import useNotification from "../../hooks/useNotification.jsx";

const Login = () => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    // const [captchaCode, setCaptchaCode] = useState("7B4K9"); login
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFAError, setTwoFAError] = useState('');
    const twoFAInputRefs = useRef([]);

    const notify = useNotification();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        captcha: "",
        remember: false,
    });

    // const generateCaptcha = () => {
    //     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    //     let captcha = "";
    //     for (let i = 0; i < 5; i++) {
    //         captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    //     }
    //     return captcha;
    // };

    // const handleCaptchaRefresh = () => {
    //     setCaptchaCode(generateCaptcha());
    // };

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

        // if (formData.captcha !== captchaCode) {
        //     alert("Неверная капча");
        //     return;
        // }

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
                notify({ type: 'error', title: t('login.errorTitle'), message: data.error || t('login.invalidCredentials'), duration: 4500 });
            } else if (data.requires2FA) {
                // User has 2FA enabled, show 2FA verification step
                setTempToken(data.tempToken);
                setRequires2FA(true);
                setTwoFACode('');
                setTwoFAError('');
            } else {
                // Normal login without 2FA
                localStorage.setItem("token", data.token);

                if (!formData.remember) {
                    sessionStorage.setItem("token", data.token);
                }

                notify({ type: 'success', title: t('login.successTitle'), message: t('login.successMessage'), duration: 2500 });
                navigate("/orderPanel"); // редиректим в панель заказов
            }
        } catch (err) {
            console.error("Ошибка сети:", err);
            notify({ type: 'error', title: t('login.networkErrorTitle'), message: t('login.networkErrorMessage'), duration: 4500 });
        } finally {
            setLoading(false);
        }
    };

    // 2FA code input handlers
    const handleTwoFACodeChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const newCode = twoFACode.split('');
        newCode[index] = digit;
        const updatedCode = newCode.join('').slice(0, 6);
        setTwoFACode(updatedCode.padEnd(6, ''));

        if (digit && index < 5) {
            twoFAInputRefs.current[index + 1]?.focus();
        }
    };

    const handleTwoFAKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !twoFACode[index] && index > 0) {
            twoFAInputRefs.current[index - 1]?.focus();
        }
    };

    const handleTwoFAPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        setTwoFACode(pastedData.padEnd(6, ''));
        if (pastedData.length > 0) {
            twoFAInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
        }
    };

    const handleVerify2FA = async () => {
        const cleanCode = twoFACode.replace(/\s/g, '');
        if (cleanCode.length !== 6) {
            setTwoFAError(t('twoFactor.invalidCode'));
            return;
        }

        setLoading(true);
        setTwoFAError('');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/2fa/verify-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tempToken: tempToken,
                    code: cleanCode,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setTwoFAError(data.error || t('twoFactor.verifyError'));
            } else {
                localStorage.setItem("token", data.token);

                if (!formData.remember) {
                    sessionStorage.setItem("token", data.token);
                }

                notify({ type: 'success', title: t('login.successTitle'), message: t('login.successMessage'), duration: 2500 });
                navigate("/orderPanel");
            }
        } catch (err) {
            console.error("Ошибка сети:", err);
            setTwoFAError(t('login.networkErrorMessage'));
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setRequires2FA(false);
        setTempToken('');
        setTwoFACode('');
        setTwoFAError('');
    };

    // If 2FA verification is required, show 2FA screen
    if (requires2FA) {
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
                        <p className={styles.authSubtitle}>{t('login.subtitle')}</p>
                    </div>

                    <div className={styles.authCard}>
                        <div className={styles.authHeader}>
                            <div className={styles.twoFAIconWrapper}>
                                <Shield size={32} />
                            </div>
                            <h2 className={styles.authTitle}>{t('twoFactor.loginTitle')}</h2>
                            <p className={styles.authDescription}>
                                {t('twoFactor.loginSubtitle')}
                            </p>
                        </div>

                        {twoFAError && (
                            <div className={styles.errorBanner}>
                                {twoFAError}
                            </div>
                        )}

                        <div className={styles.twoFACodeContainer}>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <input
                                    key={index}
                                    ref={(el) => (twoFAInputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    className={styles.twoFACodeInput}
                                    value={twoFACode[index] || ''}
                                    onChange={(e) => handleTwoFACodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleTwoFAKeyDown(index, e)}
                                    onPaste={handleTwoFAPaste}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={handleVerify2FA}
                            disabled={loading || twoFACode.replace(/\s/g, '').length !== 6}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className={styles.spinner} size={18} />
                                    {t('twoFactor.verifying')}
                                </>
                            ) : (
                                t('twoFactor.verify')
                            )}
                        </button>

                        <button
                            type="button"
                            className={styles.backButton}
                            onClick={handleBack}
                        >
                            <ArrowLeft size={16} />
                            {t('twoFactor.backToLogin')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                    <p className={styles.authSubtitle}>{t('login.subtitle')}</p>
                    <p className={styles.authDesc}>{t('login.ownerDesc')}</p>
                </div>

                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h2 className={styles.authTitle}>{t('login.title')}</h2>
                        <p className={styles.authDescription}>
                            {t('login.description')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{t('login.emailLabel')}</label>
                            <input
                                type="text"
                                name="email"
                                className={styles.formInput}
                                placeholder={t('login.emailPlaceholder')}
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{t('login.passwordLabel')}</label>
                            <div className={styles.inputWithIcon}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className={styles.formInput}
                                    placeholder={t('login.passwordPlaceholder')}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={togglePassword}
                                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        {/* Капча */}
                        {/*<div className={styles.captchaContainer}>*/}
                        {/*    <span className={styles.captchaCode}>{captchaCode}</span>*/}
                        {/*    <button*/}
                        {/*        type="button"*/}
                        {/*        className={styles.captchaRefresh}*/}
                        {/*        onClick={handleCaptchaRefresh}*/}
                        {/*    >*/}
                        {/*        <RefreshCcw size={24}/>*/}
                        {/*    </button>*/}
                        {/*    <input*/}
                        {/*        type="text"*/}
                        {/*        name="captcha"*/}
                        {/*        className={styles.formInput}*/}
                        {/*        placeholder="Введите код"*/}
                        {/*        value={formData.captcha}*/}
                        {/*        onChange={handleInputChange}*/}
                        {/*    />*/}
                        {/*</div>*/}

                        <div className={styles.formCheckbox}>
                            <input
                                type="checkbox"
                                id="remember"
                                name="remember"
                                checked={formData.remember}
                                onChange={handleInputChange}
                            />
                            <label htmlFor="remember">{t('login.rememberMe')}</label>
                        </div>

                        {/* Кнопка */}
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={loading}
                        >
                            {loading ? t('login.loggingIn') : t('login.loginButton')}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        {t('login.noAccount')}{" "}
                        <a href="#" onClick={() => navigate("/registration")}>
                            {t('login.register')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
