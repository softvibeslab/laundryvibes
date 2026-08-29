import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import axios from "axios";
import { apiMessageEs } from "../../utils/localization";
import BrandLogo from "../Brand/BrandLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // State to store error messages
  const [success, setSuccess] = useState(""); // State to store success messages
  const [loading, setLoading] = useState(false); // State to store success messages

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setSuccess(""); // Clear previous success messages
    setLoading(true)

    try {
      const response = await axios.post("/api/user/login", {
        email,
        password,
      });

      // Handle successful login
      setSuccess(`¡Bienvenido de nuevo, ${response.data.name}!`); // Set success message
      if(response.status===200){
      

          localStorage.setItem("token",response.data.token);
          localStorage.setItem("role",response.data.role);
          localStorage.setItem("userId",response.data.userId);
        
      }
     

      if (response.status === 200 && response.data.role === "user") {
        //navigate the user to dashbaord page

        setTimeout(() => {
          navigate("/user/userdashboard");
        }, 2000);
      } else if (response.status === 200 && response.data.role === "worker") {
        setTimeout(() => {
          navigate("/workerdashboard");
        }, 2000);
      } else if (response.status === 200 && response.data.role === "admin") {
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 2000);
      }
    } catch (error) {
      setSuccess("")
      // Handle specific error messages from the API
      if (error.response && error.response.data.message) {
        setError(apiMessageEs(error.response.data.message));
      } else {
        setError("Ocurrió un error. Inténtalo de nuevo."); // Generic error message
      }
    }finally{
      setLoading(false)
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-gray-100">
        <Link to="/" className="flex justify-center mb-6" aria-label="LaundryVibes, volver al inicio">
          <BrandLogo size={48} />
        </Link>

        {/* Header */}
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
          Bienvenido de nuevo
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Inicia sesión en tu cuenta de lavandería
        </p>

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
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              placeholder="Ingresa tu correo electrónico"
              className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              placeholder="Ingresa tu contraseña"
              className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Sign In Button */}
          <button
      type="submit"
      className={`w-full py-2 text-white rounded-lg transition-all ${
        loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      }`}
      disabled={loading}
    >
      {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
    </button>
        </form>

        {/* Olvidé mi contraseña Link */}
        <div className="mt-4 text-center">
          <Link
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            to="/forgot-password"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes una cuenta?{" "}
            <Link
              to="/registration"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Regístrate ahora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
