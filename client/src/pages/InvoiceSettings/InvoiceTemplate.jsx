import React from "react";
import styles from "./InvoiceTemplate.module.css";

export default function InvoiceTemplate({ settings }) {
  // Примерные данные для превью (позже заменятся реальными данными заказа)
  const sampleOrder = {
    number: "1",
    createdAt: "2026-02-28 13:09:39",
    deliveryDate: "28.02.16:00",
    customerPhone: "+37126005990",
    customerName: "diana, kreslina",
    address: "Dzelzavas iela 76-149",
    floor: "2",
    doorCode: "240 #7469",
    peopleCount: "5",
    extraTime: "+20min",
    notes: "",
    paymentMethod: "Karte",
    items: [
      { name: "Iepakojums no 40-50 eiro", price: 1.20, quantity: 1 },
      { name: "King Set (64gb) Akcija", price: 46.80, quantity: 1 }
    ],
    deliveryFee: 0.0,
    discount: 0.00
  };

  const subtotal = sampleOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + sampleOrder.deliveryFee - sampleOrder.discount;

  return (
    <div className={styles.page}>
      <div className={`${styles.center} ${styles.small}`}>
        {settings.companyName || "BENTO SUSHI"}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.center} ${styles.title}`}>
        Pasūtījums N {sampleOrder.number}
      </div>

      <div className={`${styles.block} ${styles.small}`}>
        Izveidots {sampleOrder.createdAt}<br />
        Piegādes datums un laiks {sampleOrder.deliveryDate}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.block} ${styles.small}`}>
        {sampleOrder.customerPhone} {sampleOrder.customerName}
      </div>
      <div className={styles.line}></div>

      <div className={`${styles.block} ${styles.small}`}>
        {sampleOrder.address}<br />
        Stāvs {sampleOrder.floor}, Durvju kods {sampleOrder.doorCode}<br />
        Personu skaits {sampleOrder.peopleCount}<br />
        {sampleOrder.extraTime}
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
          {sampleOrder.items.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td className={styles.right}>{item.price.toFixed(2)}</td>
              <td className={styles.right}>{item.quantity}</td>
              <td className={styles.right}>{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.line}></div>

      <div className={styles.small}>
        Piezīmes: {sampleOrder.notes || "-"}
      </div>
      <div className={styles.line}></div>

      <div className={styles.small}>
        Apmaksas veids: {sampleOrder.paymentMethod}
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
              <td className={styles.right}>{sampleOrder.deliveryFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Kopējā summa</td>
              <td className={styles.right}>{subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Atlaide</td>
              <td className={styles.right}>{sampleOrder.discount.toFixed(2)}</td>
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
}