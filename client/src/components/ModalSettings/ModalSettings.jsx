import React from 'react';
import styles from './ModalSettings.module.css';
import { X, MonitorCog, PaintbrushVertical, BellRing } from 'lucide-react';
import { ThemeProvider, useTheme } from "../../provider/ThemeContext.jsx";
import useNotification from "../../hooks/useNotification.jsx";
import { useSound } from "../../provider/SoundContext.jsx";


export default function ModalSettings({ isOpen, onClose }) {

  if (!isOpen) return null;
  const { changeTheme, themeKey } = useTheme();

  const notify = useNotification();

  const { soundEnabled, setSoundEnabled, unlock, notifier } = useSound();

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
              <div className={styles.switchRow}>

                <label className={styles.switch} aria-label="Звук оповещения">
                  <input
                    className={styles.switchInput}
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={async (e) => {
                      const next = e.target.checked;

                      setSoundEnabled(next);

                      if (next) {
                        const ok = await unlock();
                        if (!ok) {
                          alert("Браузер блокирует звук. Кликни ещё раз по переключателю, чтобы разрешить воспроизведение.");
                        }
                        notifier.playOnce(`test:${Date.now()}`);
                      }
                    }}
                  />
                  <span className={styles.switchTrack}>
                    <span className={styles.switchThumb} />
                  </span>
                </label>
              </div>
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