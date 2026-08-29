import { useState } from 'react'
import {useParams,useNavigate} from 'react-router-dom'
import axios from 'axios';
import { apiMessageEs } from '../../utils/localization';
import BrandLogo from '../Brand/BrandLogo';

const ResetPassword = () => {
const {token} = useParams();
const navigate = useNavigate();

  const[error,setError] = useState("");
  const[success,setSuccess] = useState("");
  const[newPassword,setNewPassword] = useState("");
  const[confirmPassword,setConfirmPassword] = useState("");

const handleResetPassword = async (e) =>{
e.preventDefault();
setError("");
setSuccess("");

if(newPassword!== confirmPassword){
  setError("¡Las contraseñas no coinciden!");
  return
}
try{

  const response = await axios.post(`/api/user/reset-password/${token}`,
    {newPassword,confirmPassword},
    { headers: { "Content-Type": "application/json" } }
  );
  setSuccess(apiMessageEs(response.data.message, 'Contraseña actualizada correctamente'));
  setTimeout(()=>{
    navigate('/login')
  },3000);

}catch(error){
  setError(apiMessageEs(error.response?.data?.message, "¡Algo salió mal!"))
}
};



  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
    <div className="w-full max-w-sm sm:max-w-md bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-center mb-4">
        <BrandLogo size={48} />
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-center">Restablecer contraseña</h2>
      <p className="text-gray-600 text-sm sm:text-base text-center mb-6">
        Ingresa tu nueva contraseña a continuación.
      </p>

      {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}   
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded">
            <span className="font-medium">Éxito:</span> {success}
          </div>
        )}
      {/* Form */}
      <form onSubmit={handleResetPassword}>
        <div className="mb-4">
          <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              className="block w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa la nueva contraseña"
              onChange={(e)=>setNewPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              className="block w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirma la nueva contraseña"
              onChange={(e)=>setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

       

        {/* Button */}
        <button
          type="submit"
          className="w-full py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
        >
          Restablecer contraseña
        </button>
      </form>
    </div>
  </div>
  )
}

export default ResetPassword
