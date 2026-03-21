import React from "react";
import styles from "./InvoiceTemplate.module.css";

const InvoiceTemplate = React.forwardRef(function InvoiceTemplate({ settings = {}, order = {} }, ref) {
  const items = order.items || [];
  const deliveryFee = Number(order.deliveryFee || 0);
  const discount = Number(order.discount || 0);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const total = subtotal + deliveryFee - discount;

  return (
    <div ref={ref} className={styles.page}>

      {/* Top date line */}
      <div className={styles.topDate}>
        Pasūtījums izveidots: {order.createdAt || "—"}
      </div>

      {/* Header: logo box | QR | order number + customer info */}
      <div className={styles.header}>
        {/* Left: company info box */}
        <div className={styles.companyBox}>
          <div className={styles.companyName}>
            {settings.companyName ? (
              settings.companyName
            ) : (
              <>
                <span className={styles.companyNameBig}>BENTO</span>
                <span className={styles.companyNameSub}>restorāns</span>
              </>
            )}
          </div>
          <div className={styles.companyDetails}>
            <div>Tel.: {settings.regNumber || "+371 20405060"}</div>
            <div>E-mail: {settings.email || "info@bentosushi.lv"}</div>
            <div>Website: {settings.website || "www.bentosushi.lv"}</div>
          </div>
        </div>

        {/* Center: QR code placeholder */}
        <div className={styles.qrBox}>
          <svg viewBox="0 0 80 80" className={styles.qrSvg} xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="80" height="80" fill="white"/>
            <rect x="2" y="2" width="24" height="24" fill="none" stroke="#000" strokeWidth="3"/>
            <rect x="8" y="8" width="12" height="12" fill="#000"/>
            <rect x="54" y="2" width="24" height="24" fill="none" stroke="#000" strokeWidth="3"/>
            <rect x="60" y="8" width="12" height="12" fill="#000"/>
            <rect x="2" y="54" width="24" height="24" fill="none" stroke="#000" strokeWidth="3"/>
            <rect x="8" y="60" width="12" height="12" fill="#000"/>
            <rect x="32" y="2" width="4" height="4" fill="#000"/>
            <rect x="38" y="2" width="4" height="4" fill="#000"/>
            <rect x="44" y="2" width="4" height="4" fill="#000"/>
            <rect x="32" y="8" width="4" height="4" fill="#000"/>
            <rect x="44" y="8" width="4" height="4" fill="#000"/>
            <rect x="32" y="14" width="4" height="4" fill="#000"/>
            <rect x="38" y="14" width="4" height="4" fill="#000"/>
            <rect x="2" y="32" width="4" height="4" fill="#000"/>
            <rect x="8" y="32" width="4" height="4" fill="#000"/>
            <rect x="14" y="32" width="4" height="4" fill="#000"/>
            <rect x="2" y="38" width="4" height="4" fill="#000"/>
            <rect x="14" y="38" width="4" height="4" fill="#000"/>
            <rect x="2" y="44" width="4" height="4" fill="#000"/>
            <rect x="8" y="44" width="4" height="4" fill="#000"/>
            <rect x="32" y="32" width="4" height="4" fill="#000"/>
            <rect x="44" y="32" width="4" height="4" fill="#000"/>
            <rect x="38" y="38" width="4" height="4" fill="#000"/>
            <rect x="32" y="44" width="4" height="4" fill="#000"/>
            <rect x="44" y="44" width="4" height="4" fill="#000"/>
            <rect x="56" y="32" width="4" height="4" fill="#000"/>
            <rect x="62" y="32" width="4" height="4" fill="#000"/>
            <rect x="68" y="32" width="4" height="4" fill="#000"/>
            <rect x="74" y="32" width="4" height="4" fill="#000"/>
            <rect x="56" y="38" width="4" height="4" fill="#000"/>
            <rect x="74" y="38" width="4" height="4" fill="#000"/>
            <rect x="56" y="44" width="4" height="4" fill="#000"/>
            <rect x="68" y="44" width="4" height="4" fill="#000"/>
            <rect x="74" y="44" width="4" height="4" fill="#000"/>
            <rect x="56" y="56" width="4" height="4" fill="#000"/>
            <rect x="62" y="56" width="4" height="4" fill="#000"/>
            <rect x="74" y="56" width="4" height="4" fill="#000"/>
            <rect x="56" y="62" width="4" height="4" fill="#000"/>
            <rect x="68" y="62" width="4" height="4" fill="#000"/>
            <rect x="56" y="68" width="4" height="4" fill="#000"/>
            <rect x="62" y="68" width="4" height="4" fill="#000"/>
            <rect x="68" y="68" width="4" height="4" fill="#000"/>
            <rect x="74" y="68" width="4" height="4" fill="#000"/>
            <rect x="32" y="56" width="4" height="4" fill="#000"/>
            <rect x="44" y="56" width="4" height="4" fill="#000"/>
            <rect x="38" y="62" width="4" height="4" fill="#000"/>
            <rect x="44" y="62" width="4" height="4" fill="#000"/>
            <rect x="32" y="68" width="4" height="4" fill="#000"/>
            <rect x="38" y="68" width="4" height="4" fill="#000"/>
            <rect x="44" y="74" width="4" height="4" fill="#000"/>
          </svg>
        </div>

        {/* Right: order number + customer */}
        <div className={styles.orderInfo}>
          <div className={styles.orderNumber}>
            Pasūtījums Nr {order.number || "—"}
          </div>
          <div className={styles.customerInfo}>
            <div className={styles.customerName}>{order.customerName || "—"}</div>
            <div><strong>Tel.:</strong> {order.customerPhone || "—"}</div>
            <div><strong>Adrese:</strong> {order.address || "—"}</div>
            {(order.floor || order.doorCode) && (
              <div>
                {order.floor ? `Stāvs: ${order.floor}` : ""}
                {order.floor && order.doorCode ? "; " : ""}
                {order.doorCode ? `Durvju kods: ${order.doorCode}` : ""}
              </div>
            )}
            {order.peopleCount && (
              <div><strong>Personu skaits:</strong> {order.peopleCount}</div>
            )}
            <div><strong>Piegādes laiks:</strong> {order.deliveryDate || "—"}</div>
            {order.extraTime && <div>{order.extraTime}</div>}
          </div>
        </div>
      </div>

      {/* Notes bar */}
      <div className={styles.notesBar}>
        <strong>Piezīmes:</strong> {order.notes || "-"}
      </div>

      {/* Items table */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th className={styles.thLeft}>Nosaukums:</th>
            <th className={styles.thRight}>Cena:</th>
            <th className={styles.thRight}>Daudzums:</th>
            <th className={styles.thRight}>Summa:</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className={styles.tdLeft}>{item.name}</td>
              <td className={styles.tdRight}>{Number(item.price).toFixed(2)}</td>
              <td className={styles.tdRight}>{item.quantity}</td>
              <td className={styles.tdRight}>
                {(Number(item.price) * Number(item.quantity)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bottom section: wishes box + summary */}
      <div className={styles.bottomSection}>
        {/* Left: wishes box */}
        <div className={styles.wishesBox}>
          <div className={styles.wishesTitle}>Vēlējumi klientam:</div>
          <div className={styles.wishesContent}>{order.wishes || ""}</div>
        </div>

        {/* Right: summary table */}
        <div className={styles.summaryBox}>
          <table className={styles.summaryTable}>
            <tbody>
              <tr>
                <td className={styles.summaryLabel}>Maksa par piegādi</td>
                <td className={styles.summaryValue}>{deliveryFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td className={styles.summaryLabel}>Kopēja summa</td>
                <td className={styles.summaryValue}>{subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td className={styles.summaryLabel}>Atlaide</td>
                <td className={styles.summaryValue}>{discount.toFixed(2)}</td>
              </tr>
              <tr>
                <td className={styles.summaryLabel}>Pavisam apmaksai</td>
                <td className={styles.summaryValue}>{total.toFixed(2)}</td>
              </tr>
              <tr className={styles.paymentRow}>
                <td className={`${styles.summaryLabel} ${styles.bold}`}>Apmakasas veids</td>
                <td className={`${styles.summaryValue} ${styles.bold}`}>
                  {order.paymentMethod || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {settings.footerMessage && (
        <div className={styles.footer}>{settings.footerMessage}</div>
      )}
    </div>
  );
});

export default InvoiceTemplate;