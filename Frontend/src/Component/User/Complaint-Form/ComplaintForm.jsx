import React, {  useState,useEffect } from "react";
import { Package2, ThumbsDown, Clock, Package, MessageSquare } from "lucide-react";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import axios from 'axios'

function Complaint() {


  // fetch bagNumber from db
  const[bagNumber,setBagNumber]=useState(null);

  useEffect(() => {
    const fetchUserDeatils = async () => {

    
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        
        setBagNumber(data.bagNumber);
      } catch (error) {
        console.log(error.response?.data?.message || error.message);
      } 
    }
    fetchUserDeatils()
  }, []);


  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    BagNumber: "",
    date: "2025-02-20",
    complaintType: "",
    description: "",
    CollegeName: "",
  });

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle complaint type selection
  const handleComplaintType = (type) => {
    setFormData({ ...formData, complaintType: type });
  };

  // Submit through our authenticated backend; no third-party key is shipped to browsers.
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); // Start loading
  
    try {
      const res = await axios.post('/api/user/submit-complaint', {
        bagNumber,
        typeOfComplaint: formData.complaintType,
        description: formData.description,
      });
      if (res.status === 201) {
        navigate("/user/complaint/success");
      } else {
        alert("Error submitting complaint. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  };;
  

  return (
    <div className="md:flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="md:block w-80 bg-gray-50">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 p-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Submit Complaint</h1>
        <form onSubmit={onSubmit} className="bg-white p-5 rounded-lg mt-3 shadow mb-6 w-full">

          
          {/* Order Number and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bag Number</label>
              <input
                type="text"
                name="orderNumber"
                value={bagNumber}
                onChange={handleChange}
                placeholder="Enter Bag number"
                className="w-full p-2.5 border border-gray-300 rounded-lg"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Incident</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">College Name</label>
            <input
              type="text"
              name="CollegeName"
              value={formData.CollegeName}
              onChange={handleChange}
              placeholder="Enter your College Name"
              className="w-full p-2.5 border border-gray-300 rounded-lg"
              required
            />
          </div>

          {/* Complaint Type */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Type of Complaint</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: "Service Quality", icon: <ThumbsDown className="h-6 w-6 text-gray-600 mb-2" />, label: "Service Quality" },
                { type: "Delay", icon: <Clock className="h-6 w-6 text-gray-600 mb-2" />, label: "Delay" },
                { type: "Damaged Items", icon: <Package className="h-6 w-6 text-gray-600 mb-2" />, label: "Damaged Items" },
                { type: "Communication", icon: <MessageSquare className="h-6 w-6 text-gray-600 mb-2" />, label: "Communication" }
              ].map(({ type, icon, label }) => (
                <button
                  key={type}
                  type="button"
                  className={`flex flex-col items-center p-4 border rounded-lg ${
                    formData.complaintType === type
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                  }`}
                  onClick={() => handleComplaintType(type)}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="complaintType" value={formData.complaintType} required />
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Please describe your complaint in detail..."
              className="w-full p-2.5 border border-gray-300 rounded-lg"
              required
            />
          </div>

          {/* Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800">
              Your complaint will be reviewed within 24 hours. We will contact you via email.
            </p>
          </div>

          {/* Submit Button */}
         <button 
  type="submit" 
  className={`w-full font-medium py-2.5 px-4 rounded-lg mt-4 
    ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
  disabled={loading}
>
  {loading ? "Submitting..." : "Submit Complaint"}
</button>

        </form>
      </div>
    </div>
  );
}

export default Complaint;
