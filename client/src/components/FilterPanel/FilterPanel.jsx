import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFilterStore } from "../../store/filterStore";
import "./FilterPanel.css";

const FilterPanel = ({ orders = [], columnName, onClose }) => {
  const { t } = useTranslation();

  const {
    filters,
    setStatusFilter,
    setTimeSort,
    setAmountSort,
    setRestaurantFilter,
    setCourierFilter,
    resetFilters,
  } = useFilterStore();

  const [localFilters, setLocalFilters] = useState(filters);
  const [timeSort, setLocalTimeSort] = useState(filters.timeSort || null);
  const [amountSort, setLocalAmountSort] = useState(filters.amountSort || null);

  useEffect(() => {
    setLocalFilters(filters);
    setLocalTimeSort(filters.timeSort || null);
    setLocalAmountSort(filters.amountSort || null);
  }, [filters]);

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

  const handleStatusChange = (status, checked) => {
    const newStatuses = checked
      ? [...localFilters.status, status]
      : localFilters.status.filter((s) => s !== status);
    setLocalFilters({ ...localFilters, status: newStatuses });
    setStatusFilter(newStatuses);
  };

  const handleTimeSort = (sort) => {
    setLocalTimeSort(sort);
    setTimeSort(sort);
  };

  const handleAmountSort = (sort) => {
    setLocalAmountSort(sort);
    setAmountSort(sort);
  };

  const handleRestaurantChange = (restaurant, checked) => {
    const newRestaurants = checked
      ? [...localFilters.restaurant, restaurant]
      : localFilters.restaurant.filter((r) => r !== restaurant);
    setLocalFilters({ ...localFilters, restaurant: newRestaurants });
    setRestaurantFilter(newRestaurants);
  };

  const handleCourierChange = (courier, checked) => {
    const newCouriers = checked
      ? [...localFilters.courier, courier]
      : localFilters.courier.filter((c) => c !== courier);
    setLocalFilters({ ...localFilters, courier: newCouriers });
    setCourierFilter(newCouriers);
  };

  const handleReset = () => {
    setLocalFilters({
      status: [],
      timeRange: { from: null, to: null },
      amountRange: { from: null, to: null },
      restaurant: [],
      courier: [],
    });
    setLocalTimeSort(null);
    setLocalAmountSort(null);
    resetFilters();
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filter-panel-header">
          <h3>{t(`orderPanel.filter.${columnName}`)}</h3>
          <button className="filter-panel-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="filter-panel-content">
          {columnName === "status" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectStatus")}</h4>
              {getUniqueValues("status").map((status) => (
                <label key={status} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={localFilters.status.includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                  />
                  {t(`orderPanel.status.${String(status).toLowerCase()}`, {
                    defaultValue: status,
                  })}
                </label>
              ))}
            </div>
          )}

          {columnName === "time" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectTimeSort")}</h4>
              <div className="sort-buttons">
                <button
                  className={timeSort === "asc" ? "sort-btn active" : "sort-btn"}
                  onClick={() => handleTimeSort("asc")}
                >
                  {t("orderPanel.filter.sortAsc")}
                </button>
                <button
                  className={timeSort === "desc" ? "sort-btn active" : "sort-btn"}
                  onClick={() => handleTimeSort("desc")}
                >
                  {t("orderPanel.filter.sortDesc")}
                </button>
              </div>
            </div>
          )}

          {columnName === "amount" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectAmountSort")}</h4>
              <div className="sort-buttons">
                <button
                  className={amountSort === "asc" ? "sort-btn active" : "sort-btn"}
                  onClick={() => handleAmountSort("asc")}
                >
                  {t("orderPanel.filter.sortAsc")}
                </button>
                <button
                  className={amountSort === "desc" ? "sort-btn active" : "sort-btn"}
                  onClick={() => handleAmountSort("desc")}
                >
                  {t("orderPanel.filter.sortDesc")}
                </button>
              </div>
            </div>
          )}

          {columnName === "restaurant" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectRestaurant")}</h4>
              {getUniqueValues("restaurant").map((restaurant) => (
                <label key={restaurant} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={localFilters.restaurant.includes(restaurant)}
                    onChange={(e) =>
                      handleRestaurantChange(restaurant, e.target.checked)
                    }
                  />
                  {restaurant}
                </label>
              ))}
            </div>
          )}

          {columnName === "courier" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectCourier")}</h4>
              {getUniqueValues("courier").map((courier) => (
                <label key={courier} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={localFilters.courier.includes(courier)}
                    onChange={(e) => handleCourierChange(courier, e.target.checked)}
                  />
                  {courier}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="filter-panel-footer">
          <button className="btn-reset" onClick={handleReset}>
            {t("orderPanel.filter.reset")}
          </button>
          <button className="btn-apply" onClick={onClose}>
            {t("orderPanel.filter.apply")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
