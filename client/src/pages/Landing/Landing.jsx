import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Truck, MapPin, Clock, LayoutDashboard,
    LogIn, ArrowRight, Github, Linkedin, Globe,
} from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelect/LanguageSelect.jsx';
import styles from './Landing.module.css';

// TODO: подставить реальные ссылки проекта
const LINKS = {
    landing: '#',
    github: '#',
    linkedin: '#',
};

export default function Landing() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const features = [
        { icon: <MapPin size={22} />, title: t('app.features.tracking.title'), desc: t('app.features.tracking.desc') },
        { icon: <Clock size={22} />, title: t('app.features.eta.title'), desc: t('app.features.eta.desc') },
        { icon: <LayoutDashboard size={22} />, title: t('app.features.control.title'), desc: t('app.features.control.desc') },
    ];

    return (
        <div className={styles.page}>
            <div className={`${styles.blob} ${styles.blobA}`} />
            <div className={`${styles.blob} ${styles.blobB}`} />

            <header className={styles.topbar}>
                <div className={styles.brand}>
                    <span className={styles.brandIcon}><Truck size={22} /></span>
                    {t('app.brand')}
                </div>
                <LanguageSelector />
            </header>

            <main className={styles.hero}>
                <svg
                    className={styles.heroArt}
                    viewBox="0 0 260 170"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label={t('app.heroBadge')}
                >
                    {/* пунктирный маршрут */}
                    <path d="M32 132 C 70 132, 78 92, 120 92 S 196 60, 224 40"
                          stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"
                          strokeDasharray="2 9" strokeLinecap="round" />

                    {/* точка назначения (пин) */}
                    <path d="M224 20 c 11 0 20 9 20 20 c 0 14 -20 30 -20 30 s -20 -16 -20 -30 c 0 -11 9 -20 20 -20 z"
                          fill="rgba(255,255,255,0.16)" stroke="#fff" strokeWidth="2.5" />
                    <circle cx="224" cy="40" r="7" fill="#fff" />

                    {/* земля */}
                    <line x1="6" y1="150" x2="150" y2="150" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />

                    {/* короб на багажнике */}
                    <rect x="34" y="70" width="42" height="38" rx="5"
                          fill="rgba(255,255,255,0.18)" stroke="#fff" strokeWidth="2.5" />
                    <line x1="55" y1="70" x2="55" y2="108" stroke="#fff" strokeWidth="2" opacity="0.7" />
                    <line x1="34" y1="86" x2="76" y2="86" stroke="#fff" strokeWidth="2" opacity="0.7" />

                    {/* корпус скутера */}
                    <path d="M40 132 h 44 l 14 -22 h 22"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M84 132 c 14 0 22 -10 30 -22"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M120 110 h 20 l -4 14"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                    {/* курьер */}
                    <circle cx="96" cy="60" r="10" fill="rgba(255,255,255,0.9)" />
                    <path d="M92 70 l -6 26 M100 70 l 8 20"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" />

                    {/* колёса */}
                    <circle cx="46" cy="140" r="15" fill="rgba(255,255,255,0.1)" stroke="#fff" strokeWidth="3" />
                    <circle cx="132" cy="140" r="15" fill="rgba(255,255,255,0.1)" stroke="#fff" strokeWidth="3" />

                    {/* линии скорости */}
                    <line x1="6" y1="96" x2="24" y2="96" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="2" y1="112" x2="26" y2="112" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>

                <h1 className={styles.title}>
                    {t('app.heroTitle')}{' '}
                    <span className={styles.titleAccent}>{t('app.heroTitleAccent')}</span>
                </h1>

                <p className={styles.subtitle}>{t('app.heroSubtitle')}</p>

                <div className={styles.ctaRow}>
                    <button className={styles.ctaPrimary} onClick={() => navigate('/login')}>
                        <LogIn size={20} />
                        {t('app.loginCta')}
                        <ArrowRight size={20} className={styles.arrow} />
                    </button>
                    <button className={styles.ctaGhost} onClick={() => navigate('/registration')}>
                        {t('app.registerCta')}
                    </button>
                </div>

                <div className={styles.features}>
                    {features.map((f, i) => (
                        <div key={i} className={styles.card}>
                            <span className={styles.cardIcon}>{f.icon}</span>
                            <span className={styles.cardTitle}>{f.title}</span>
                            <span className={styles.cardDesc}>{f.desc}</span>
                        </div>
                    ))}
                </div>
            </main>

            <footer className={styles.footer}>
                <span>{t('app.footerRights', { year: new Date().getFullYear() })}</span>
                <div className={styles.social}>
                    <a className={styles.socialLink} href={LINKS.landing} target="_blank" rel="noreferrer"
                       aria-label={t('app.links.landing')} title={t('app.links.landing')}>
                        <Globe size={18} />
                    </a>
                    <a className={styles.socialLink} href={LINKS.github} target="_blank" rel="noreferrer"
                       aria-label="GitHub" title="GitHub">
                        <Github size={18} />
                    </a>
                    <a className={styles.socialLink} href={LINKS.linkedin} target="_blank" rel="noreferrer"
                       aria-label="LinkedIn" title="LinkedIn">
                        <Linkedin size={18} />
                    </a>
                </div>
            </footer>
        </div>
    );
}
