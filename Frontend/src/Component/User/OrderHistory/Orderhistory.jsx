import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import Sidebar from "../Sidebar";
import axios from 'axios'
import { OrderContext } from "../SubmitOrder/OrderContext";
import { useContext } from "react";
import LoaderM from "../../../assets/loader/loader";

export default function Orderhistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const { bagNumber, roomNumber } = useContext(OrderContext);

  useEffect(() => {
    setLoading(true);
    const fetchUserHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/order-history", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setOrders(data.order);
      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserHistory();
  }, []);

  return (
    <div>
      <div>
        <Sidebar />
      </div>
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
          <LoaderM />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order History</h1>
          <p className="text-gray-500">View your past laundry orders</p>
          <div className="bg-white shadow-md rounded-lg p-4 mt-4">
            <div className="p-4 rounded-lg border-b">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <p className="text-gray-500 text-sm">View your past laundry orders</p>
            </div>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center mt-4">No orders found.</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.orderId}
                  className="border-b last:border-none py-4 flex justify-between items-center"
                >
                  <div className="flex gap-4">
                    <div>
                      <Package className="text-blue-500 mt-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Order No. {bagNumber}</h3>
                      <p className="text-gray-600">
                        {order.name} - Room {roomNumber}
                      </p>
                      <p className="text-gray-500">
                        {order.numberOfClothes} items • {order.weight} Kg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        order.status === 'Pending'
                          ? 'text-yellow-600'
                          : order.status === 'Completed'
                          ? 'text-green-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {order.status}
                    </p>
                    <p className="text-gray-400 text-sm">{order.createdAt}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
