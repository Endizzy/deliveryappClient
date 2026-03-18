import React from "react";
import styles from "./InvoiceTemplate.module.css";

const InvoiceTemplate = React.forwardRef(function InvoiceTemplate({ settings = {}, order = {} }, ref) {
  const items = order.items || [];
  const deliveryFee = Number(order.deliveryFee || 0);
  const discount = Number(order.discount || 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const total = subtotal + deliveryFee - discount;

  return (
    <div ref={ref} className={styles.page}>
      <div className={`${styles.center} ${styles.small}`}>
        {settings.companyName || "BENTO SUSHI"}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.center} ${styles.title}`}>
        Pasūtījums N {order.number || "—"}
      </div>

      <div className={`${styles.block} ${styles.small}`}>
        Izveidots {order.createdAt || "—"}<br />
        Piegādes datums un laiks {order.deliveryDate || "—"}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.block} ${styles.small}`}>
        {order.customerPhone || "—"} {order.customerName || "—"}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.block} ${styles.small}`}>
        {order.address || "—"}<br />
        {order.floor ? `Stāvs ${order.floor}, ` : ""}
        {order.doorCode ? `Durvju kods ${order.doorCode}` : ""}<br />
        {order.peopleCount ? `Personu skaits ${order.peopleCount}` : ""}
        {order.extraTime ? <><br />{order.extraTime}</> : null}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.block} ${styles.small}`}>
        Tel: {settings.regNumber || "20405660"}<br />
        E-mail: {settings.email || "info@bentosushi.lv"}<br />
        Website: {settings.website || "www.bentosushi.lv"}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.center} ${styles.small}`}>Preces nosaukums</div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th align="left"></th>
            <th className={styles.right}>Cena</th>
            <th className={styles.right}>Sk.</th>
            <th className={styles.right}>Summa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td className={styles.right}>{Number(item.price).toFixed(2)}</td>
              <td className={styles.right}>{item.quantity}</td>
              <td className={styles.right}>{(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.line}></div>

      <div className={styles.small}>
        Piezīmes: {order.notes || "-"}
      </div>
      <div className={styles.line}></div>

      <div className={styles.small}>
        Apmaksas veids: {order.paymentMethod || "—"}
      </div>

      <div className={styles.summary}>
        <table>
          <tbody>
            <tr>
              <td colSpan={2}>
                <hr className={styles.summaryLine} />
              </td>
            </tr>
            <tr>
              <td>Maksa par piegādi</td>
              <td className={styles.right}>{deliveryFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Kopējā summa</td>
              <td className={styles.right}>{subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Atlaide</td>
              <td className={styles.right}>{discount.toFixed(2)}</td>
            </tr>
            <tr className={styles.bold}>
              <td>Pavisam apmaksai</td>
              <td className={styles.right}>{total.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2}>
                <hr className={styles.summaryLine} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        {settings.footerMessage || "Paldies par pasūtījumu!"}
      </div>
    </div>
  );
});

export default InvoiceTemplate;