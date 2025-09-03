import React, { useEffect, useState } from 'react';

const API_URL = 'https://a5548baccf7a.ngrok-free.app/api/orders'; // замени на свой

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [title, setTitle] = useState("");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        const res = await fetch(API_URL);
        const data = await res.json();
        setOrders(data);
    };

    const createOrder = async () => {
        if (!title.trim()) return;
        await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        setTitle("");
        fetchOrders();
    };

    const updateOrder = async (id, fields) => {
        await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
        });
        fetchOrders();
    };

    const deleteOrder = async (id) => {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        fetchOrders();
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Панель заказов</h2>

            <div style={{ marginBottom: 20 }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название заказа"
                />
                <button onClick={createOrder}>Создать заказ</button>
            </div>

            <table border="1" cellPadding="8">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Курьер</th>
                    <th>Действия</th>
                </tr>
                </thead>
                <tbody>
                {orders.map((o) => (
                    <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.title}</td>
                        <td>
                            <select
                                value={o.status}
                                onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                            >
                                <option value="new">new</option>
                                <option value="assigned">assigned</option>
                                <option value="in_progress">in_progress</option>
                                <option value="done">done</option>
                            </select>
                        </td>
                        <td>
                            <input
                                type="number"
                                value={o.courierId ?? ""}
                                onChange={(e) =>
                                    updateOrder(o.id, { courierId: e.target.value || null })
                                }
                                placeholder="Courier ID"
                                style={{ width: 80 }}
                            />
                        </td>
                        <td>
                            <button onClick={() => deleteOrder(o.id)}>Удалить</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
