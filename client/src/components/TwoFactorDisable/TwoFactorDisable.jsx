import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';
import styles from './TwoFactorDisable.module.css';
import useNotification from '../../hooks/useNotification.jsx';

export default function TwoFactorDisable({ isOpen, onClose, onSuccess }) {
    const { t } = useTranslation();
    const notify = useNotification();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);

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

    const handleDisable = async () => {
        const cleanCode = code.replace(/\s/g, '');
        if (cleanCode.length !== 6) {
            setError(t('twoFactor.invalidCode'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: cleanCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('twoFactor.disableError'));
            }

            notify({ type: 'success', title: t('twoFactor.disabled'), message: t('twoFactor.disabledMessage'), duration: 3500 });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCode('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={handleClose} aria-label={t('twoFactor.close')}>
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        <ShieldOff size={28} />
                    </div>
                    <h2 className={styles.title}>{t('twoFactor.disableTitle')}</h2>
                    <p className={styles.subtitle}>{t('twoFactor.disableSubtitle')}</p>
                </div>

                <div className={styles.warning}>
                    <AlertTriangle size={18} />
                    <span>{t('twoFactor.disableWarning')}</span>
                </div>

                {error && (
                    <div className={styles.errorBanner}>
                        <span>{error}</span>
                    </div>
                )}

                <p className={styles.instruction}>{t('twoFactor.enterCodeToDisable')}</p>

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

                <div className={styles.buttonGroup}>
                    <button className={styles.cancelBtn} onClick={handleClose}>
                        {t('twoFactor.cancel')}
                    </button>
                    <button
                        className={styles.disableBtn}
                        onClick={handleDisable}
                        disabled={loading || code.replace(/\s/g, '').length !== 6}
                    >
                        {loading ? (
                            <>
                                <Loader2 className={styles.spinner} size={18} />
                                {t('twoFactor.disabling')}
                            </>
                        ) : (
                            t('twoFactor.disable')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
