import { useState } from 'react';
import axios from "axios"
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { apiMessageEs } from '../../utils/localization';
import ToastCloseButton from '../ToastCloseButton';
import BrandLogo from '../Brand/BrandLogo';

function ResetPassword() {
  const [email, setEmail] = useState('');

const handleForgotPassword = async(e)=>{
  e.preventDefault();

  try{

    const response =await axios.post("/api/user/forgot-password",{email},
        { headers: { "Content-Type": "application/json" } }
    );
    toast.info(apiMessageEs(response.data.message, "Correo enviado correctamente"))

  }catch(error){
   toast.error(apiMessageEs(error.response?.data?.message, "Algo salió mal"));

  }
};

  return (
    <>
    <ToastContainer aria-label="Notificaciones" closeButton={ToastCloseButton} />
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-sm sm:max-w-md bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-center mb-4">
          <BrandLogo size={48} />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-center">¿Olvidaste tu contraseña?</h2>
        <p className="text-gray-600 text-sm sm:text-base text-center mb-6">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
        </p>

        {/* Form */}
        <form onSubmit={handleForgotPassword}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.2 0l7.89-5.26M3 8v8a2 2 0 002 2h14a2 2 0 002-2V8m-2 0H5" />
                </svg>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-2 pl-10 text-gray-700 bg-gray-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="tu@ejemplo.com"
                required
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:ring-4 focus:ring-blue-300"
          >
            Enviar enlace de restablecimiento
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default ResetPassword;
