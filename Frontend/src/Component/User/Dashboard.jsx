import React, { useEffect, useState,useContext } from "react";
import Card from "./Card";
import Sidebar from "./Sidebar";
import axios from "axios";
import { OrderContext } from "./SubmitOrder/OrderContext";
import LoaderM from "../../assets/loader/loader";
import {
  Shirt,
  History,
  BarChart3,
  User,
  Loader2,
  TrendingUp,
  Package,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const Dashboard = () => {
  const cards = [
    {
      title: "Submit Order",
      icon: Shirt,
      route: "/user/submit-order",
      color: "bg-blue-500",
      description: "Submit new laundry items for processing",
    },
    {
      title: "Order History",
      icon: History,
      route: "/user/order-history",
      color: "bg-purple-500",
      description: "View and track your past orders",
    },
    {
      title: "Daily Rush",
      icon: BarChart3,
      route: "/user/daily-rush",
      color: "bg-green-500",
      description: "Check peak hours and plan accordingly",
    },
    {
      title: "Profile",
      icon: User,
      route: "/user/profile",
      color: "bg-orange-500",
      description: "Manage your account settings",
    },
  ];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState({});
  const [orders, setOrders] = useState([]); 
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

    const {bagNumber,setBagNumber,setRoomNumber}= useContext(OrderContext)
  
    // console.log("bag number:",bagNumber);

  // fetch the user deatils
  useEffect(() => {
    const fetchUserDetails = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setUser(data);
        setBagNumber(data.bagNumber);
        setRoomNumber(data.roomNumber);
      } catch (error) {
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, []);


  // fetch the order details
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/order-history", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setOrders([data.order[0]]);
        setPendingOrders(data.lengthOfPending);
        setTotalOrders(data.totalOrders);
      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      }
    };
    fetchUserData();
  }, []);

  return (
    <>
      <Sidebar />
      {loading? (
         <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
         <LoaderM />
       </div>
      ):(
        <div className="min-h-screen bg-gray-100 p-6 ml-0 md:ml-64">
        <header className="flex justify-between items-center mb-4 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </header>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card
            title="Pending Orders"
            value={pendingOrders}
            icon={
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            }
            bgColor="bg-blue-100"
            textColor="text-blue-800"
          />
          <Card
            title="Total Orders"
            value={totalOrders}
            icon={
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            }
            bgColor="bg-purple-100"
            textColor="text-purple-800"
          />
          <Card
            title="Current Status"
            value="Active"
            icon={
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            }
            bgColor="bg-green-100"
            textColor="text-green-800"
          />
        </div>

            {orders.length>0 && (
               <section>
               <div className="bg-white p-4 rounded-lg shadow-md">
                 <h2 className="text-xl font-semibold mb-2">Recent Order</h2>
                 {orders.length > 0 && (
                   <div className="flex justify-between items-center">
                     <div>
                       <h3 className="font-bold">Order No. {bagNumber}</h3>
                       <p>{orders[0]?.createdAt}</p>
                     </div>
                     <span className="text-yellow-500 font-bold">{orders[0]?.status}</span>
                   </div>
                 )}
               </div>
             </section>
            )}

            
       

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-9">
          {cards.map((card) => (
            <NavLink
              key={card.title}
              to={card.route}
              className="cursor-pointer group hover:scale-105 transition-all duration-200 bg-white shadow-md rounded-xl p-6"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-12 h-12 ${card.color} rounded-full flex items-center justify-center group-hover:ring-4 ring-opacity-50 transition-all duration-200`}
                >
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>

      )}
         </>
  );
};

export default Dashboard;
