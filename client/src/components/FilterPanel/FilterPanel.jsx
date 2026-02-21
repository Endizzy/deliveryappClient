import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFilterStore } from "../../store/filterStore";
import "./FilterPanel.css";

const FilterPanel = ({ orders = [], columnName, onClose }) => {
  const { t } = useTranslation();
  const {
    filters,
    setStatusFilter,
    setTimeRangeFilter,
    setAmountRangeFilter,
    setRestaurantFilter,
    setCourierFilter,
    resetFilters,
  } = useFilterStore();

  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
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

  const handleTimeChange = (type, value) => {
    const newRange = {
      ...localFilters.timeRange,
      [type]: value ? new Date(value).getTime() : null,
    };
    setLocalFilters({ ...localFilters, timeRange: newRange });
    setTimeRangeFilter(newRange.from, newRange.to);
  };

  const handleAmountChange = (type, value) => {
    const numValue = value ? parseFloat(value) : null;
    const newRange = {
      ...localFilters.amountRange,
      [type]: numValue,
    };
    setLocalFilters({ ...localFilters, amountRange: newRange });
    setAmountRangeFilter(newRange.from, newRange.to);
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
              <h4>{t("orderPanel.filter.selectTime")}</h4>
              <div className="date-inputs">
                <label>
                  {t("orderPanel.filter.from")}:
                  <input
                    type="datetime-local"
                    value={
                      localFilters.timeRange.from
                        ? new Date(localFilters.timeRange.from)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => handleTimeChange("from", e.target.value)}
                  />
                </label>
                <label>
                  {t("orderPanel.filter.to")}:
                  <input
                    type="datetime-local"
                    value={
                      localFilters.timeRange.to
                        ? new Date(localFilters.timeRange.to)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => handleTimeChange("to", e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          {columnName === "amount" && (
            <div className="filter-group">
              <h4>{t("orderPanel.filter.selectAmount")}</h4>
              <div className="range-inputs">
                <label>
                  {t("orderPanel.filter.from")}:
                  <input
                    type="number"
                    step="0.01"
                    value={localFilters.amountRange.from ?? ""}
                    onChange={(e) => handleAmountChange("from", e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  {t("orderPanel.filter.to")}:
                  <input
                    type="number"
                    step="0.01"
                    value={localFilters.amountRange.to ?? ""}
                    onChange={(e) => handleAmountChange("to", e.target.value)}
                    placeholder="999.99"
                  />
                </label>
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
