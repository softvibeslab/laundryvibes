import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiTShirt2Line } from "react-icons/ri";
import axios from "axios";
import { apiMessageEs } from "../../utils/localization";

const Registration = () => {

const [name,setName]=useState('');
const [email,setEmail]=useState('');
const [number,setNumber]=useState('');
const [room,setRoom]=useState('');
const [bag,setBag]=useState('');
const [building,setBuilding]=useState('');
const [password,setPassword]=useState('');
const [confirmpassword,setconfirmPassword]=useState('');
const [error,setError]=useState('');
const [success,setSuccess]=useState('');
const [loading,setLoading]=useState(false);

const navigate=useNavigate();
const handleSubmit = async (e) =>{
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  if (password !== confirmpassword) {
    setError( 'Las contraseñas no coinciden.' );
   return
  }

  try{
    const response = await axios.post('/api/user/signup',
      {name,
      email,
      phoneNumber:number,
      roomNumber:room,
      bagNumber:bag,
      buildingName:building,
      password,
      confirmPassword:password
    }
    );
    if(response.data.message){
      setSuccess("Registro completado correctamente")
    }
    if(response.status===201){
      setTimeout(()=>{
        navigate('/login')
      },3000)
     
    }
  }


  
  catch (error) {
    // Handle specific error messages from the API
    if (error.response && error.response.data.message) {
      setError(apiMessageEs(error.response.data.message));
    } else {
      setError("Ocurrió un error. Inténtalo de nuevo."); // Generic error message
    }
  }finally{
    setLoading(false)
  }
}


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-md">
        {/* Icon and Heading */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <RiTShirt2Line className="w-10 h-10 text-blue-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Crea tu cuenta
          </h2>
          <p className="text-gray-600 text-center">Únete hoy a nuestro servicio de lavandería</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded">
            <span className="font-medium">Éxito:</span> {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre completo */}
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                type="text"
                id="full-name"
                placeholder="Juan Pérez"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                placeholder="juan@ejemplo.com"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setEmail(e.target.value)}

              />
            </div>

            {/* Número de teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Número de teléfono
              </label>
              <input
  type="tel"
  id="phone"
  placeholder="+91 9392040000"
  pattern="\+91\s[0-9]{10}"
  className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
  value={`+91 ${number}`}
  onChange={(e) => setNumber(e.target.value.replace("+91 ", ""))}
/>

            </div>

            {/* Número de habitación */}
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700">
                Número de habitación
              </label>
              <input
                type="text"
                id="room"
                placeholder="Habitación 101"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setRoom(e.target.value)}

              />
            </div>

            {/* Número de bolsa */}
            <div>
              <label htmlFor="bag" className="block text-sm font-medium text-gray-700">
                Número de bolsa
              </label>
              <input
                type="text"
                id="bag"
                placeholder="#123"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setBag(e.target.value)}

              />
            </div>

            {/* Building */}
            <div >
              <label htmlFor="building" className="block text-sm font-medium text-gray-700">
                Edificio
              </label>
              <input
                type="text"
                id="building"
                placeholder="Residencia masculina"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setBuilding(e.target.value)}

              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                placeholder="Crea una contraseña"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setPassword(e.target.value)}

              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                type="password"
                id="confirm-password"
                placeholder="Confirma la contraseña"
                className="block w-full px-4 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) =>setconfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
      type="submit"
      className={`w-full py-2 text-white rounded-lg transition-all ${
        loading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-300'
      }`}
      disabled={loading}
    >
      {loading ? 'Creando cuenta...' : 'Crear cuenta'}
    </button>
        </form>

        {/* Back to Login */}
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-blue-500 hover:underline flex items-center justify-center">
            <span className="mr-1">&larr;</span> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Registration;
