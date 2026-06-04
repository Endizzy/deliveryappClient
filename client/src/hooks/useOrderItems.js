import { useState } from "react";
import { lineTotalCents } from "../utils/money.js";

// Позиции заказа: добавление, удаление, изменение количества и сумма в центах.
// Поведение идентично соответствующим обработчикам в CreateOrder.jsx.
export default function useOrderItems() {
  const [selectedItems, setSelectedItems] = useState([]);

  const addItem = (menuItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.id === menuItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...menuItem, quantity: 1 }];
    });
  };

  const removeItem = (id) =>
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));

  const updateItemQuantity = (id, qty) => {
    if (qty <= 0) return removeItem(id);
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  };

  const itemsTotalCents = () =>
    selectedItems.reduce(
      (sumCents, it) =>
        sumCents + lineTotalCents(it.price, it.discount, it.quantity),
      0
    );

  return { selectedItems, addItem, removeItem, updateItemQuantity, itemsTotalCents };
}
