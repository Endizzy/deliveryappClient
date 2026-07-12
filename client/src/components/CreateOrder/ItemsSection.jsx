import React, { useEffect, useRef, useState } from "react";
import { Package, Search, Plus, Minus, X } from "lucide-react";
import { discountedUnitCents, formatCents, toCents } from "../../utils/money.js";
import AddressMapField from "./AddressMapField.jsx";

// Секция «Позиции заказа»: поиск по меню, выбранные позиции, оплата/самовывоз, карта.
const ItemsSection = ({
  t,
  errors,
  searchTerm,
  setSearchTerm,
  showSearchResults,
  setShowSearchResults,
  searchResults,
  addItemToOrder,
  selectedItems,
  updateItemQuantity,
  removeItem,
  calculateItemsTotalCents,
  calculateGrandTotalCents,
  safeDeliveryFee,
  formData,
  handleInputChange,
  pickupPoints,
  // ── проверка адреса доставки на карте ──
  geo,
  geoConfirmed,
  geoLoading,
  geoError,
  addressError,
  onVerifyAddress,
  onConfirmAddress,
  onMarkerMove,
  onExpandMap,
  zones,
  currentZone,
}) => {
  // ── навигация по списку с клавиатуры ──
  const [activeIndex, setActiveIndex] = useState(0);
  const resultsRef = useRef(null);

  const listOpen = showSearchResults && searchResults.length > 0;

  // сброс активного элемента при изменении запроса/результатов
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm, searchResults.length]);

  // подскролл активного элемента в зону видимости
  useEffect(() => {
    if (!listOpen || !resultsRef.current) return;
    const el = resultsRef.current.querySelector(".search-result-item.active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listOpen]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSearchResults(false);
      return;
    }
    if (!listOpen) return;
    const len = searchResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % len);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + len) % len);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = searchResults[Math.min(activeIndex, len - 1)];
      if (item) addItemToOrder(item);
    }
  };

  return (
    <div className="form-section">
      <div className="section-header">
        <Package size={20} />
        <h3>{t("createOrder.sections.items")}</h3>
      </div>

      <div className="form-group">
        <label htmlFor="search">{t("createOrder.fields.searchItems")} *</label>
        <div className="search-container">
          <div className="input-with-icon">
            <Search size={16} />
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => setShowSearchResults(searchTerm.length > 0)}
              onKeyDown={handleSearchKeyDown}
              className={errors.items ? "error" : ""}
              placeholder={t("createOrder.placeholders.search")}
              role="combobox"
              aria-expanded={listOpen}
              aria-controls="search-results-list"
              aria-activedescendant={listOpen ? `search-result-${activeIndex}` : undefined}
              autoComplete="off"
            />
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results" id="search-results-list" role="listbox" ref={resultsRef}>
              {searchResults.map((item, idx) => (
                <div
                  key={item.id}
                  id={`search-result-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`search-result-item ${idx === activeIndex ? "active" : ""}`}
                  onClick={() => addItemToOrder(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">
                      {item.discount > 0 ? (
                        <>
                          <span className="original-price">
                            €{formatCents(toCents(item.price))}
                          </span>
                          <span className="discounted-price">
                            €{formatCents(
                              discountedUnitCents(item.price, item.discount)
                            )}
                          </span>
                          <span className="discount-badge">
                            -{item.discount}%
                          </span>
                        </>
                      ) : (
                        <span>€{formatCents(toCents(item.price))}</span>
                      )}
                    </span>
                  </div>
                  <Plus size={16} className="add-icon" />
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.items && <span className="error-text">{errors.items}</span>}
      </div>

      {selectedItems.length > 0 && (
        <div className="selected-items">
          <h4>{t("createOrder.selectedItemsTitle")}</h4>

          {selectedItems.map((item) => {
            const unitCents = discountedUnitCents(item.price, item.discount);
            const totalCents = unitCents * item.quantity;

            return (
              <div key={item.id} className="selected-item">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <div className="item-price-info">
                    {item.discount > 0 && (
                      <span className="discount-info">-{item.discount}%</span>
                    )}
                    <span className="unit-price">€{formatCents(unitCents)}</span>
                  </div>
                </div>

                <div className="quantity-controls">
                  <button
                    type="button"
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="quantity">{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="item-total">
                  <span>€{formatCents(totalCents)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="remove-btn"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}

        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="payment">{t("createOrder.fields.payment")} *</label>
          <select
            id="payment"
            value={formData.payment}
            onChange={(e) => handleInputChange("payment", e.target.value)}
            className={errors.payment ? "error" : ""}
          >
            <option value="">{t("createOrder.placeholders.payment")}</option>
            <option value="cash">{t("createOrder.payment.cash")}</option>
            <option value="card">{t("createOrder.payment.card")}</option>
            <option value="wire">{t("createOrder.payment.wire")}</option>
          </select>
          {errors.payment && (
            <span className="error-text">{errors.payment}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="pickup">{t("createOrder.fields.pickup")} *</label>
          <select
            id="pickup"
            value={formData.pickupId}
            onChange={(e) => handleInputChange("pickupId", e.target.value)}
            className={errors.restaurant ? "error" : ""}
          >
            <option value="">{t("createOrder.placeholders.pickup")}</option>
            {pickupPoints.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname}
              </option>
            ))}
          </select>
          {errors.restaurant && (
            <span className="error-text">{errors.restaurant}</span>
          )}
        </div>
      </div>

      <AddressMapField
        t={t}
        formData={formData}
        geo={geo}
        geoConfirmed={geoConfirmed}
        geoLoading={geoLoading}
        geoError={geoError}
        addressError={addressError}
        onVerifyAddress={onVerifyAddress}
        onConfirmAddress={onConfirmAddress}
        onMarkerMove={onMarkerMove}
        onExpandMap={onExpandMap}
        zones={zones}
        currentZone={currentZone}
      />
    </div>
  );
};

export default ItemsSection;
