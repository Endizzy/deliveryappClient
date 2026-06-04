import { useCallback, useEffect, useState } from "react";

// Загружает справочники для формы создания заказа: курьеры, точки самовывоза, меню.
// Поведение идентично исходному useEffect в CreateOrder.jsx.
export default function useOrderResources({
  API,
  authHeaders,
  token,
  navigate,
  notify,
  t,
  handleUnauthorized,
}) {
  const [couriers, setCouriers] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [allMenu, setAllMenu] = useState([]);

  const fetchCouriers = useCallback(async () => {
    const res = await fetch(`${API}/order-support/couriers`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || t("createOrder.errors.couriersLoadFailed"));
    }

    setCouriers(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  const fetchPickupPoints = useCallback(async () => {
    const res = await fetch(`${API}/order-support/pickup-points`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(
        data.error || t("createOrder.errors.pickupPointsLoadFailed")
      );
    }

    setPickupPoints(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  const fetchAllMenu = useCallback(async () => {
    const res = await fetch(`${API}/order-support/menu?all=1`, {
      headers: authHeaders,
    });
    if (res.status === 401) return handleUnauthorized();

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || t("createOrder.errors.menuLoadFailed"));
    }

    setAllMenu(data.items || []);
  }, [API, authHeaders, handleUnauthorized, t]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        await Promise.all([fetchCouriers(), fetchPickupPoints(), fetchAllMenu()]);
      } catch (e) {
        notify({
          type: "error",
          title: t("createOrder.notifications.loadErrorTitle"),
          message: e.message || t("createOrder.notifications.loadErrorMessage"),
          duration: 5000,
        });
      }
    })();
  }, [
    token,
    navigate,
    fetchCouriers,
    fetchPickupPoints,
    fetchAllMenu,
    notify,
    t,
  ]);

  return { couriers, pickupPoints, allMenu };
}
