import { useEffect, useState } from "react";

// Прошлые адреса доставки клиента (для чипов под полем телефона).
// Грузим по тому же правилу, что и историю заказов: только когда номер
// выглядит полным, с debounce. Ошибка не показывается — чипы просто не появятся,
// ввод адреса вручную работает как раньше.
export default function useCustomerAddresses({
  phone,
  API,
  authHeaders,
  handleUnauthorized,
}) {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    const raw = (phone || "").replace(/\s/g, "");
    if (!/^\+?\d{8,15}$/.test(raw)) {
      setAddresses([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/customers/${encodeURIComponent(raw)}/addresses?limit=6`,
          { headers: authHeaders }
        );
        if (res.status === 401) return handleUnauthorized();
        const data = await res.json();
        if (cancelled) return;
        setAddresses(
          res.ok && data?.ok && Array.isArray(data.items) ? data.items : []
        );
      } catch {
        if (!cancelled) setAddresses([]);
      }
    }, 350);

    // Быстрая правка номера не должна оставить на экране адреса чужого клиента
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, API, authHeaders, handleUnauthorized]);

  return addresses;
}
