import React from "react";
import styles from "./ModalSettings.module.css";
import { X, MonitorCog, PaintbrushVertical, BellRing } from "lucide-react";
import { useTheme } from "../../provider/ThemeContext.jsx";
import useNotification from "../../hooks/useNotification.jsx";
import { useSound } from "../../provider/SoundContext.jsx";
import { useTranslation } from "react-i18next";

export default function ModalSettings({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { changeTheme, themeKey } = useTheme();
  const notify = useNotification();
  const { soundEnabled, setSoundEnabled, unlock, notifier } = useSound();

  if (!isOpen) return null;

  const handleSave = () => {
    notify({
      type: "success",
      title: t("modalSettings.notifications.savedTitle"),
      message: t("modalSettings.notifications.savedMessage"),
      duration: 3500,
    });
    onClose();
  };

  const handleCancel = () => {
    notify({
      type: "error",
      title: t("modalSettings.notifications.cancelledTitle"),
      message: t("modalSettings.notifications.cancelledMessage"),
      duration: 3500,
    });
    onClose();
  };

  const handleSoundToggle = async (e) => {
    const next = e.target.checked;
    setSoundEnabled(next);

    if (next) {
      const ok = await unlock();
      if (!ok) {
        notify({
          type: "error",
          title: t("modalSettings.notifications.soundBlockedTitle"),
          message: t("modalSettings.notifications.soundBlockedMessage"),
          duration: 5000,
        });
        return;
      }
      notifier.playOnce(`test:${Date.now()}`);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div
        className={styles.container}
        onClick={(e) => e.stopPropagation()} // чтобы клик внутри не закрывал окно
      >
        <div className={styles.modalHeader}>
          <button className={styles.closeIcon} onClick={handleCancel} aria-label={t("modalSettings.actions.close")}>
            <X />
          </button>
          <MonitorCog className={styles.monitorIcon} />
          <h2 className={styles.title}>{t("modalSettings.title")}</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.settingsCard}>
            <div className={styles.cardTitle}>
              <PaintbrushVertical className={styles.paintbrushIcon} />
              <h3>{t("modalSettings.appearance.title")}</h3>
            </div>
            <div className={styles.cardAction}>
              <select
                name="Theme"
                id="themeList"
                value={themeKey}
                className={styles.select}
                onChange={(e) => changeTheme(e.target.value)}
                aria-label={t("modalSettings.appearance.selectAria")}
              >
                <option value="purpleTheme">{t("modalSettings.appearance.themes.light")}</option>
                <option value="darkGreenTheme">{t("modalSettings.appearance.themes.dark")}</option>
              </select>
            </div>
          </div>

          <div className={styles.settingsCard}>
            <div className={styles.cardTitle}>
              <BellRing className={styles.bellIcon} />
              <h3>{t("modalSettings.sound.title")}</h3>
            </div>

            <div className={styles.cardAction}>
              <div className={styles.switchRow}>
                <label className={styles.switch} aria-label={t("modalSettings.sound.aria")}>
                  <input
                    className={styles.switchInput}
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={handleSoundToggle}
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
          <button className={styles.closeButton} onClick={handleSave}>
            {t("modalSettings.actions.save")}
          </button>
          <button className={styles.closeButton} onClick={handleCancel}>
            {t("modalSettings.actions.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
