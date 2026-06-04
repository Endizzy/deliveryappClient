import { useCallback, useEffect, useRef, useState } from "react";
import { isValidPhone, normalizePhoneForLookup } from "../utils/phone.js";

// Поиск клиента по номеру телефона с debounce.
// Состояния phoneLookupState: idle | loading | found | not_found | error.
// Поведение идентично исходному useEffect-у lookup в CreateOrder.jsx.
export default function useCustomerLookup({
  phone,
  API,
  authHeaders,
  handleUnauthorized,
  t,
}) {
  const [customerLookupData, setCustomerLookupData] = useState(null);
  const [phoneLookupState, setPhoneLookupState] = useState("idle");

  const lastRequestedPhoneRef = useRef("");
  const lastAppliedPhoneRef = useRef("");

  useEffect(() => {
    const normalized = normalizePhoneForLookup(phone);

    if (!normalized) {
      setCustomerLookupData(null);
      setPhoneLookupState("idle");
      lastRequestedPhoneRef.current = "";
      return;
    }

    if (!isValidPhone(normalized)) {
      setCustomerLookupData(null);
      setPhoneLookupState("idle");
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (lastRequestedPhoneRef.current === normalized) return;

      try {
        setPhoneLookupState("loading");

        const res = await fetch(
          `${API}/order-support/customer-address-by-phone?phone=${encodeURIComponent(normalized)}`,
          {
            method: "GET",
            headers: authHeaders,
            signal: controller.signal,
          }
        );

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(
            data.error ||
            t(
              "createOrder.errors.customerLookupFailed",
              "Не удалось найти адрес клиента"
            )
          );
        }

        lastRequestedPhoneRef.current = normalized;

        if (!data.found || !data.address) {
          setCustomerLookupData(null);
          setPhoneLookupState("not_found");
          return;
        }

        setCustomerLookupData({
          customerName: data.meta?.customerName || "",
          notes: data.meta?.notes || "",
          phone: data.meta?.phone || normalized,
          lastOrderAt: data.meta?.lastOrderAt || null,
          street: data.address.street || "",
          house: data.address.house || "",
          apart: data.address.apart || "",
          building: data.address.building || "",
          floor: data.address.floor || "",
          code: data.address.code || "",
        });

        setPhoneLookupState("found");
      } catch (e) {
        if (e.name === "AbortError") return;
        setPhoneLookupState("error");
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [phone, API, authHeaders, handleUnauthorized, t]);

  // Помечает текущий номер как уже подставленный в форму.
  const markApplied = useCallback((phoneValue) => {
    lastAppliedPhoneRef.current = normalizePhoneForLookup(phoneValue);
  }, []);

  // При изменении поля телефона сбрасываем отметку применённого номера, если он разошёлся.
  const handlePhoneChanged = useCallback((value) => {
    const normalized = normalizePhoneForLookup(value);
    if (normalized !== lastAppliedPhoneRef.current) {
      lastAppliedPhoneRef.current = "";
    }
  }, []);

  // Полный сброс состояния поиска (для очистки полей клиента).
  const reset = useCallback(() => {
    setCustomerLookupData(null);
    setPhoneLookupState("idle");
    lastRequestedPhoneRef.current = "";
    lastAppliedPhoneRef.current = "";
  }, []);

  return {
    customerLookupData,
    phoneLookupState,
    markApplied,
    handlePhoneChanged,
    reset,
  };
}
