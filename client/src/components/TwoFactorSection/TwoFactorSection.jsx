import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import styles from './TwoFactorSection.module.css';
import TwoFactorSetup from '../TwoFactorSetup/TwoFactorSetup.jsx';
import TwoFactorDisable from '../TwoFactorDisable/TwoFactorDisable.jsx';

export default function TwoFactorSection() {
    const { t } = useTranslation();
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);

    useEffect(() => {
        fetchTwoFAStatus();
    }, []);

    const fetchTwoFAStatus = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/2fa/status`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                setTwoFAEnabled(data.enabled);
            }
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetupSuccess = () => {
        setTwoFAEnabled(true);
        setShowSetupModal(false);
    };

    const handleDisableSuccess = () => {
        setTwoFAEnabled(false);
        setShowDisableModal(false);
    };

    if (loading) {
        return (
            <div className={styles.card}>
                <div className={styles.loadingContainer}>
                    <Loader2 className={styles.spinner} size={24} />
                    <span>{t('twoFactor.loadingStatus')}</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={`${styles.iconWrapper} ${twoFAEnabled ? styles.iconEnabled : styles.iconDisabled}`}>
                        {twoFAEnabled ? <ShieldCheck size={24} /> : <Shield size={24} />}
                    </div>
                    <div className={styles.headerContent}>
                        <h3 className={styles.title}>{t('twoFactor.title')}</h3>
                        <p className={styles.subtitle}>{t('twoFactor.description')}</p>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.statusSection}>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>{t('twoFactor.status')}</span>
                        <span className={`${styles.statusBadge} ${twoFAEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
                            {twoFAEnabled ? t('twoFactor.statusEnabled') : t('twoFactor.statusDisabled')}
                        </span>
                    </div>

                    <p className={styles.statusDescription}>
                        {twoFAEnabled ? t('twoFactor.enabledDescription') : t('twoFactor.disabledDescription')}
                    </p>

                    {twoFAEnabled ? (
                        <button
                            className={styles.disableBtn}
                            onClick={() => setShowDisableModal(true)}
                        >
                            <ShieldOff size={18} />
                            {t('twoFactor.disableButton')}
                        </button>
                    ) : (
                        <button
                            className={styles.enableBtn}
                            onClick={() => setShowSetupModal(true)}
                        >
                            <Shield size={18} />
                            {t('twoFactor.enableButton')}
                        </button>
                    )}
                </div>
            </div>

            <TwoFactorSetup
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                onSuccess={handleSetupSuccess}
            />

            <TwoFactorDisable
                isOpen={showDisableModal}
                onClose={() => setShowDisableModal(false)}
                onSuccess={handleDisableSuccess}
            />
        </>
    );
}
