import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import useVersionCheck from "../../hooks/useVersionCheck.js";
import { useUpdateBlocked } from "../../hooks/useBlockUpdate.js";
import "./UpdatePrompt.css";

// На этих страницах окно не показываем (там нечего терять, но и не нужно мешать)
const QUIET_PATHS = new Set(["/", "/login", "/registration", "/unauthorized"]);
const SNOOZE_KEY = "app-update-snooze";

const readSnooze = () => {
  try {
    const raw = sessionStorage.getItem(SNOOZE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.version === "string" && Number(s.until) > Date.now()) return s;
  } catch {
    /* ignore */
  }
  return null;
};

const writeSnooze = (s) => {
  try {
    sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

/**
 * Окно «Доступна новая версия».
 *  • «Позже» — молчим snoozeMs (10 мин), затем показываем снова;
 *    пока пауза — в углу маленький значок «Обновить».
 *  • Не показывается, пока открыта форма с риском потери данных
 *    (useBlockUpdate) и на служебных страницах; после снятия блокировки
 *    появляется через settleMs.
 */
export default function UpdatePrompt({
  snoozeMs = 10 * 60_000,
  settleMs = 4_000,
  ...checkOptions
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const blocked = useUpdateBlocked();
  const { latest } = useVersionCheck(checkOptions);

  const [snooze, setSnooze] = useState(readSnooze);
  const [show, setShow] = useState(false);
  const nowBtnRef = useRef(null);

  const quiet = QUIET_PATHS.has(pathname);
  const snoozed = !!latest && !!snooze && snooze.version === latest.version;
  const canShow = !!latest && !blocked && !quiet;
  const eligible = canShow && !snoozed;

  // Пауза закончилась → снова можно показывать
  useEffect(() => {
    if (!snooze) return undefined;
    const left = snooze.until - Date.now();
    if (left <= 0) {
      setSnooze(null);
      return undefined;
    }
    const id = setTimeout(() => setSnooze(null), left);
    return () => clearTimeout(id);
  }, [snooze]);

  // Показываем не мгновенно, а когда условия продержались settleMs
  useEffect(() => {
    if (!eligible) {
      setShow(false);
      return undefined;
    }
    const id = setTimeout(() => setShow(true), settleMs);
    return () => clearTimeout(id);
  }, [eligible, settleMs]);

  useEffect(() => {
    if (show) nowBtnRef.current?.focus();
  }, [show]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const later = useCallback(() => {
    if (!latest) return;
    const s = { version: latest.version, until: Date.now() + snoozeMs };
    writeSnooze(s);
    setSnooze(s);
    setShow(false);
  }, [latest, snoozeMs]);

  if (!latest) return null;

  if (show) {
    return (
      <div className="up-overlay" role="presentation">
        <div className="up-card" role="dialog" aria-modal="true" aria-labelledby="up-title">
          <div className="up-ico"><RefreshCw size={22} /></div>
          <h3 id="up-title">{t("appUpdate.title", { defaultValue: "Доступна новая версия" })}</h3>
          <p>
            {latest.force
              ? t("appUpdate.textForce", {
                  defaultValue: "Вышло важное обновление приложения. Необходимо обновить страницу.",
                })
              : t("appUpdate.text", {
                  defaultValue: "Вышло обновление приложения. Обновите страницу, чтобы работать с актуальной версией.",
                })}
          </p>
          <p className="up-hint">
            {t("appUpdate.hint", { defaultValue: "Перед обновлением сохраните начатую работу." })}
          </p>
          <div className="up-actions">
            {!latest.force && (
              <button type="button" className="up-later" onClick={later}>
                {t("appUpdate.later", { defaultValue: "Позже" })}
              </button>
            )}
            <button type="button" className="up-now" ref={nowBtnRef} onClick={reload}>
              <RefreshCw size={15} />
              {t("appUpdate.now", { defaultValue: "Обновить сейчас" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (canShow && snoozed) {
    return (
      <button type="button" className="up-chip" onClick={reload}>
        <RefreshCw size={14} />
        {t("appUpdate.chip", { defaultValue: "Доступна новая версия — обновить" })}
      </button>
    );
  }

  return null;
}
