import React from 'react';
import styles from './ModalSettings.module.css';
import { X, MonitorCog } from 'lucide-react';

export default function ModalSettings({ isOpen, onClose }) {

  if (!isOpen) return null; // Не рендерим модалку если она не открыта

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.container}
        onClick={(e) => e.stopPropagation()} // чтобы клик внутри не закрывал окно
      >
        <div className={styles.modalHeader}>
          <button className={styles.closeIcon} onClick={onClose}><X /></button>
          <MonitorCog className={styles.monitorIcon}/>
          <h2 className={styles.title}>Настройки</h2>
        </div>

        <div className={styles.content}>
          {/* Контент настроек */}
        </div>

        <button className={styles.closeButton} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}