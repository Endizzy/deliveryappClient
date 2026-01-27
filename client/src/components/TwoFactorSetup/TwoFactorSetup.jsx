import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import styles from './TwoFactorSetup.module.css';
import useNotification from '../../hooks/useNotification.jsx';

export default function TwoFactorSetup({ isOpen, onClose, onSuccess }) {
    const { t } = useTranslation();
    const notify = useNotification();
    const [step, setStep] = useState('loading'); // 'loading' | 'setup' | 'verify' | 'success'
    const [secret, setSecret] = useState('');
    const [otpauthUri, setOtpauthUri] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (isOpen) {
            fetchSetupData();
        } else {
            // Reset state when modal closes
            setStep('loading');
            setSecret('');
            setOtpauthUri('');
            setQrCodeDataUrl('');
            setCode('');
            setError('');
            setCopied(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (otpauthUri) {
            generateQRCode(otpauthUri);
        }
    }, [otpauthUri]);

    const fetchSetupData = async () => {
        setStep('loading');
        setError('');
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/2fa/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('twoFactor.setupError'));
            }

            setSecret(data.secret);
            setOtpauthUri(data.otpauthUri);
            setStep('setup');
        } catch (err) {
            setError(err.message);
            setStep('setup');
        }
    };

    const generateQRCode = async (uri) => {
        try {
            const dataUrl = await QRCode.toDataURL(uri, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1e293b',
                    light: '#ffffff',
                },
            });
            setQrCodeDataUrl(dataUrl);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    const handleCodeChange = (index, value) => {
        // Allow only digits
        const digit = value.replace(/\D/g, '').slice(-1);

        const newCode = code.split('');
        newCode[index] = digit;
        const updatedCode = newCode.join('').slice(0, 6);
        setCode(updatedCode.padEnd(6, ''));

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        setCode(pastedData.padEnd(6, ''));
        if (pastedData.length > 0) {
            inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            notify({ type: 'success', title: t('twoFactor.copied'), message: t('twoFactor.copiedMessage'), duration: 2000 });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            notify({ type: 'error', title: t('twoFactor.copyError'), message: t('twoFactor.copyErrorMessage'), duration: 3000 });
        }
    };

    const handleVerify = async () => {
        const cleanCode = code.replace(/\s/g, '');
        if (cleanCode.length !== 6) {
            setError(t('twoFactor.invalidCode'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/2fa/verify-setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: cleanCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('twoFactor.verifyError'));
            }

            setStep('success');
            notify({ type: 'success', title: t('twoFactor.enabled'), message: t('twoFactor.enabledMessage'), duration: 3500 });

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label={t('twoFactor.close')}>
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        <Shield size={28} />
                    </div>
                    <h2 className={styles.title}>{t('twoFactor.setupTitle')}</h2>
                    <p className={styles.subtitle}>{t('twoFactor.setupSubtitle')}</p>
                </div>

                {step === 'loading' && (
                    <div className={styles.loadingContainer}>
                        <Loader2 className={styles.spinner} size={40} />
                        <p>{t('twoFactor.loading')}</p>
                    </div>
                )}

                {step === 'setup' && (
                    <div className={styles.content}>
                        {error && (
                            <div className={styles.errorBanner}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className={styles.instructions}>
                            <div className={styles.stepNumber}>1</div>
                            <p>{t('twoFactor.step1')}</p>
                        </div>

                        {qrCodeDataUrl && (
                            <div className={styles.qrContainer}>
                                <img src={qrCodeDataUrl} alt="QR Code" className={styles.qrCode} />
                            </div>
                        )}

                        <div className={styles.instructions}>
                            <div className={styles.stepNumber}>2</div>
                            <p>{t('twoFactor.step2')}</p>
                        </div>

                        <div className={styles.secretContainer}>
                            <code className={styles.secretCode}>{secret}</code>
                            <button
                                className={styles.copyBtn}
                                onClick={copyToClipboard}
                                aria-label={t('twoFactor.copySecret')}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <div className={styles.instructions}>
                            <div className={styles.stepNumber}>3</div>
                            <p>{t('twoFactor.step3')}</p>
                        </div>

                        <div className={styles.codeInputContainer}>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    className={styles.codeInput}
                                    value={code[index] || ''}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button
                            className={styles.verifyBtn}
                            onClick={handleVerify}
                            disabled={loading || code.replace(/\s/g, '').length !== 6}
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
                    </div>
                )}

                {step === 'success' && (
                    <div className={styles.successContainer}>
                        <div className={styles.successIcon}>
                            <Check size={40} />
                        </div>
                        <h3>{t('twoFactor.successTitle')}</h3>
                        <p>{t('twoFactor.successMessage')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
