import Sidebar from "../Sidebar";
import { Building2, Phone, Package } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import LoaderM from '../../../assets/loader/loader'
import { apiMessageEs } from '../../../utils/localization';

export default function Profile() {
  const [user, setUser] = useState({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [bagNumber, setBagNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [ loader,setLoader] = useState(false);


  // Fetch the user details
  useEffect(() => {
    const fetchUser = async () => {
      setLoader(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;
        setUser(data);

        setPhoneNumber(data.phoneNumber || "");
        setRoomNumber(data.roomNumber || "");
        setBagNumber(data.bagNumber || "");
        setBuildingName(data.buildingName || "");
        setAddress(data.address || "");



      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      }finally{
        setLoader(false);
      }
    };
    fetchUser();
  }, []);

const[error,setError] = useState('');

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        "/api/user/profile",
        {
          phoneNumber,
          roomNumber,
          buildingName,
          address,
          bagNumber,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Handle success response
      console.log("Profile updated successfully:", response.data);

      toast.success("¡Perfil actualizado correctamente!",{
        autoClose : 3000
      })

      // Fetch updated user details
      setUser(response.data.user);
      setPhoneNumber(response.data.user.phoneNumber || "");
      setRoomNumber(response.data.user.roomNumber || "");
      setBagNumber(response.data.user.bagNumber || "");
      setBuildingName(response.data.user.buildingName || "");
      setAddress(response.data.user.address || "");

    }   catch (error) {
      // Handle specific error messages from the API
      if (error.response && error.response.data.message) {
        setError(apiMessageEs(error.response.data.message));
      } else {
        setError("Ocurrió un error. Inténtalo de nuevo."); // Generic error message
      }
    }
  };



  // update password

  const[currentPassword,setCurrentPassword]=useState('');
  const[newPassword,setNewPassword]=useState('');
  const[passerror,setPassError] = useState('');

  const handleUpdatePassword = async(e)=>{
    e.preventDefault();
    setPassError('');

    try{
      const token = localStorage.getItem("token")
      const response = await axios.put("/api/user/update-password",
        {currentPassword:currentPassword,
          newPassword},
        {headers:{ Authorization : `Bearer ${token}` }}
      );

    toast.success("Contraseña actualizada correctamente",{
      autoClose:3000
    });
    setNewPassword('');
    setCurrentPassword('');
    }catch(error){
      setPassError(apiMessageEs(error.response?.data?.message, "Algo salió mal"));
    }
  };

  return (
    <div className="md:flex min-h-screen">
     
      {/* Sidebar */}
      <div className="md:block w-80">
        <Sidebar />
      </div>

      {/* Main Content */}
      {loader ? (
         <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
         <LoaderM />
       </div>
      ):(
        <div className="flex-1 bg-gray-100 p-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Configuración del perfil
        </h1>

        {/* Información personal */}
        <div className="bg-white p-6 rounded-lg mt-3 shadow mb-6 w-full">
          <h2 className="text-lg font-semibold">Información personal</h2>
          <p className="text-sm text-gray-500 mb-4">Administra los datos de tu perfil</p>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold text-gray-600">
              JD {/* Static initials instead of upload */}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="phoneNumber">Número de teléfono</label>
                <div className="flex items-center focus-within:border-black focus-within:border-2 border rounded-lg p-3">
                  <Phone className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Número de teléfono"
                    pattern="^\+91[0-9]{10}$"
                    value={phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`}
                    onChange={(e) => setPhoneNumber(e.target.value.replace("+91", ""))}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="roomNumber">Número de habitación</label>
                <div className="flex items-center focus-within:border-black focus-within:border-2 border rounded-lg p-3">
                  <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    id="roomNumber"
                    type="text"
                    placeholder="Número de habitación"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="bagNumber">Número de bolsa</label>
                <div className="flex items-center border focus-within:border-black focus-within:border-2 rounded-lg p-3">
                  <Package className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    id="bagNumber"
                    type="number"
                    placeholder="Número de bolsa"
                    value={bagNumber}
                    onChange={(e) => setBagNumber(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1" htmlFor="buildingName">Nombre del edificio</label>
                <div className="flex items-center border focus-within:border-black focus-within:border-2 rounded-lg p-3">
                  <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    id="buildingName"
                    type="text"
                    placeholder="Edificio"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium" htmlFor="address">Dirección</label>
              <textarea
                id="address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border rounded-lg p-3"
                rows="3"
                placeholder="Ingresa tu dirección"
              ></textarea>
            </div>

            <div className="flex justify-end mt-4">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Guardar cambios
              </button>
            </div>
          </form>

        </div>

        {/* Security Settings */}
        <div className="bg-white p-6 rounded-lg shadow w-full">
          <h2 className="text-lg font-semibold">Seguridad</h2>
          <p className="text-sm text-gray-500 mb-4">Administra tu contraseña y la configuración de seguridad</p>

          {passerror && (<div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <span className="font-medium">Error:</span> {passerror}
          </div>)}

          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium">Contraseña actual</label>
            <input id="current-password" type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="w-full border rounded-lg p-2" />
          </div>

          <div className="space-y-2 mt-4">
            <label htmlFor="new-profile-password" className="text-sm font-medium">Nueva contraseña</label>
            <input id="new-profile-password" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)}  className="w-full border rounded-lg p-2" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleUpdatePassword} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Actualizar contraseña</button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              <Link to='/forgot-password'>Olvidé mi contraseña</Link></button>
          </div>
        </div>
      </div>
      )}
      
    </div>
  );
}
