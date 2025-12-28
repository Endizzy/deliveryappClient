import React from 'react';
import styles from './ModalSettings.module.css';
import { X, MonitorCog, PaintbrushVertical, BellRing } from 'lucide-react';
import { ThemeProvider, useTheme } from "../../provider/ThemeContext.jsx";
import useNotification from "../../hooks/useNotification.jsx";

export default function ModalSettings({ isOpen, onClose }) {

  if (!isOpen) return null;
  const { changeTheme, themeKey } = useTheme();

  const notify = useNotification();

  const handleSave = () => {
    notify({ type: 'success', title: 'Настройки сохранены', message: 'Вы успешно сохранили настройки', duration: 3500 });
    onClose();
  }

  const handleCancel = () => {
    notify({ type: 'error', title: 'Настройки отменены', message: 'Настройки не были сохранены', duration: 3500 });
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div
        className={styles.container}
        onClick={(e) => e.stopPropagation()} // чтобы клик внутри не закрывал окно
      >
        <div className={styles.modalHeader}>
          <button className={styles.closeIcon} onClick={handleCancel}><X /></button>
          <MonitorCog className={styles.monitorIcon}/>
          <h2 className={styles.title}>Настройки</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.settingsCard}>
            <div className={styles.cardTitle}>
              <PaintbrushVertical className={styles.paintbrushIcon} />
              <h3>Внешний вид</h3>
            </div>
            <div className={styles.cardAction}>
              <select name="Theme" id="themeList" value={themeKey} className={styles.select} onChange={(e) => changeTheme(e.target.value)}>
                <option value="purpleTheme">Светлая тема</option>
                <option value="darkGreenTheme">Темная тема</option>
              </select>
            </div>
          </div>
          <div className={styles.settingsCard}>
            <div className={styles.cardTitle}>
              <BellRing className={styles.bellIcon} />
              <h3>Звук оповещения</h3>
            </div>
            <div className={styles.cardAction}>
              <select name="notificationSound" id="notificationSound" className={styles.select}>
                <option value="Sound1">Bell</option>
                <option value="Sound2">Sea</option>
                <option value="Sound3">Forest</option>
                <option value="Sound4">Magic</option>
                <option value="Sound5">Alarm</option>
              </select>
            </div>
          </div>
        </div>
        <div className={styles.buttonsBlock}>
          <button className={styles.closeButton} onClick={handleSave}>Сохранить</button>
          <button className={styles.closeButton} onClick={handleCancel}>Отменить</button>
        </div>
      </div>
    </div>
  );
}