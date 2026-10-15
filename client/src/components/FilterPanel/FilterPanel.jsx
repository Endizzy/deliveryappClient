import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import { useFilterStore } from "../../store/filterStore";
import "./FilterPanel.css";

// Цвет точки рядом со статусом — тот же, что у бейджа статуса в таблице
const STATUS_DOT = {
  new: "#d97706",
  preparing: "#7c3aed",
  enroute: "#2563eb",
  ready: "#059669",
  cancelled: "#dc2626",
};

const SHEET_MAX_WIDTH = 600; // на телефоне — нижняя шторка

// Выпадающее окно фильтра: открывается под заголовком колонки (data-filter-col)
const FilterPanel = ({ orders = [], columnName, onClose }) => {
  const { t } = useTranslation();

  const {
    filters,
    setStatusFilter,
    setTimeSort,
    setAmountSort,
    setRestaurantFilter,
    setCourierFilter,
  } = useFilterStore();

  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);
  const isSort = columnName === "time" || columnName === "amount";
  const isSheet = () => window.innerWidth <= SHEET_MAX_WIDTH;

  const getAnchor = () =>
    document.querySelector(`[data-filter-col="${columnName}"]`);

  // Позиция под заголовком колонки (не выходит за края экрана)
  useLayoutEffect(() => {
    const anchor = getAnchor();
    if (!anchor || isSheet()) {
      setPos(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = isSort ? 204 : 236;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = rect.bottom + 6;
    setPos({
      left,
      top,
      width,
      maxHeight: Math.max(160, window.innerHeight - top - 12),
    });
  }, [columnName]); // eslint-disable-line

  // Закрытие: клик вне окна, Escape, прокрутка страницы, изменение размера
  useEffect(() => {
    const onDown = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const anchor = getAnchor();
      // клик по самому заголовку переключает окно в orderPanel
      if (anchor && anchor.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    // шторка на телефоне не привязана к заголовку — прокрутка/resize её не закрывают
    const onScroll = (e) => {
      if (isSheet()) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    const onResize = () => !isSheet() && onClose();
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [columnName]); // eslint-disable-line

  // Получить уникальные значения для чекбоксов
  const getUniqueValues = (key) => {
    const values = orders.map((order) => {
      if (key === "status") return order.status;
      if (key === "restaurant") return order.pickupName;
      if (key === "courier") return order.courierName;
      return null;
    });
    return [...new Set(values)].filter((v) => v && v !== "");
  };

  const toggle = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleStatusChange = (status) => setStatusFilter(toggle(filters.status, status));
  const handleRestaurantChange = (restaurant) =>
    setRestaurantFilter(toggle(filters.restaurant, restaurant));
  const handleCourierChange = (courier) =>
    setCourierFilter(toggle(filters.courier, courier));

  // повторный клик по выбранной сортировке снимает её
  const handleTimeSort = (sort) => {
    setTimeSort(filters.timeSort === sort ? null : sort);
    onClose();
  };
  const handleAmountSort = (sort) => {
    setAmountSort(filters.amountSort === sort ? null : sort);
    onClose();
  };

  // Сброс только фильтра этой колонки
  const handleReset = () => {
    if (columnName === "status") setStatusFilter([]);
    if (columnName === "time") setTimeSort(null);
    if (columnName === "amount") setAmountSort(null);
    if (columnName === "restaurant") setRestaurantFilter([]);
    if (columnName === "courier") setCourierFilter([]);
  };

  const hasValue =
    (columnName === "status" && filters.status.length > 0) ||
    (columnName === "time" && !!filters.timeSort) ||
    (columnName === "amount" && !!filters.amountSort) ||
    (columnName === "restaurant" && filters.restaurant.length > 0) ||
    (columnName === "courier" && filters.courier.length > 0);

  const renderCheckList = (values, selected, onChange, label, dotOf) =>
    values.map((value) => {
      const checked = selected.includes(value);
      return (
        <label key={value} className={`fp-item ${checked ? "checked" : ""}`}>
          <input
            type="checkbox"
            className="fp-input"
            checked={checked}
            onChange={() => onChange(value)}
          />
          <span className="fp-box" aria-hidden="true">
            <Check size={12} strokeWidth={3.2} />
          </span>
          {dotOf && (
            <span className="fp-dot" style={{ background: dotOf(value) }} />
          )}
          <span className="fp-text">{label(value)}</span>
        </label>
      );
    });

  const renderSortItem = (value, current, onPick, Icon, text) => (
    <button
      key={value}
      type="button"
      className={`fp-sort ${current === value ? "selected" : ""}`}
      onClick={() => onPick(value)}
    >
      <Icon size={16} />
      <span className="fp-text">{text}</span>
      {current === value && <Check size={16} strokeWidth={3} className="fp-sort-check" />}
    </button>
  );

  const style = pos
    ? { left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight }
    : undefined;

  return createPortal(
    <>
      {isSheet() && <div className="fp-backdrop" onClick={onClose} />}
      <div
        ref={panelRef}
        className={`filter-panel ${isSort ? "filter-panel-sort" : ""}`}
        style={style}
        role="dialog"
        aria-label={t(`orderPanel.filter.${columnName}`)}
      >
        <div className="fp-title">{t(`orderPanel.table.${columnName}`)}</div>

        <div className="fp-list">
          {columnName === "status" &&
            renderCheckList(
              getUniqueValues("status"),
              filters.status,
              handleStatusChange,
              (status) =>
                t(`orderPanel.status.${String(status).toLowerCase()}`, {
                  defaultValue: status,
                }),
              (status) => STATUS_DOT[status] || "#64748b"
            )}

          {columnName === "time" && (
            <>
              {renderSortItem("desc", filters.timeSort, handleTimeSort, ArrowDown, t("orderPanel.filter.sortDesc"))}
              {renderSortItem("asc", filters.timeSort, handleTimeSort, ArrowUp, t("orderPanel.filter.sortAsc"))}
            </>
          )}

          {columnName === "amount" && (
            <>
              {renderSortItem("asc", filters.amountSort, handleAmountSort, ArrowUp, t("orderPanel.filter.sortAmountAsc"))}
              {renderSortItem("desc", filters.amountSort, handleAmountSort, ArrowDown, t("orderPanel.filter.sortAmountDesc"))}
            </>
          )}

          {columnName === "restaurant" &&
            renderCheckList(
              getUniqueValues("restaurant"),
              filters.restaurant,
              handleRestaurantChange,
              (restaurant) => restaurant
            )}

          {columnName === "courier" &&
            renderCheckList(
              getUniqueValues("courier"),
              filters.courier,
              handleCourierChange,
              (courier) => courier
            )}
        </div>

        <div className="fp-footer">
          <button
            type="button"
            className="fp-reset"
            onClick={handleReset}
            disabled={!hasValue}
          >
            {t("orderPanel.filter.resetColumn")}
          </button>
          {!isSort && (
            <button type="button" className="fp-done" onClick={onClose}>
              {t("orderPanel.filter.done")}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default FilterPanel;
