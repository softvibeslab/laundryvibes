import {useEffect, useState,useContext } from "react";
import axios from 'axios'
import { OrderContext } from "./OrderContext";
import {
  Package,
  User,
  Home,
  Shirt,
  Scale,

  QrCode,

  DollarSign,
  Building,
  AlertCircle,
} from "lucide-react";
import Sidebar from "../Sidebar";
import LoaderM from "../../../assets/loader/loader";
import { useNavigate } from "react-router-dom";
import { apiMessageEs } from "../../../utils/localization";

export default function SubmitOrder() {
  const [step, setStep] = useState(1);
  const [showpayment, setShowPayment] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setScreenshot(imageURL);
    }
  };


  // to send data for orderconfirmation component
    const {weight,setWeight,numberofitems,setNumberOfItems}= useContext(OrderContext)
    const price = 60*weight
      const [user, setUser] = useState({});

  useEffect(() => {
    const fetchUserDeatils = async () => {
      setLoading(true);
      setError(false);
      try {

        const token = localStorage.getItem("token");
        // console.log("token",token);

        const response = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await response.data;
        // console.log("api response ",data);

        setUser(data)

        
      } catch (error) {
        setError(apiMessageEs(error.response?.data?.message, 'No se pudieron cargar tus datos'))
      }
      finally {
        setLoading(false);
      }
    };
    fetchUserDeatils()
  }, []);

  // to post the form of order
  // const [weight, setWeight] = useState('');
  // const [numberofitems, setNumberOfItems] = useState('');
  const naviagte =useNavigate();

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {

      const token = localStorage.getItem("token");
      // console.log("token:",token)

      if (!token) {
        setError("No se encontró una sesión activa. Inicia sesión de nuevo.")
        return;
      }

      const orderData = {
        numberOfClothes: parseInt(numberofitems),
        weight: parseInt(weight),
      };

      await axios.post("/api/user/submit-order", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      naviagte("/user/submit-order/success");

    } catch (error) {
      setError(apiMessageEs(error.response?.data?.message, "No se pudo enviar el pedido"))
    }
    finally {
      setLoading(false);
    }

  };

  // to check the inputs
  const [weightError, setWeightError] = useState(null);
  const [itemsError, setItemsError] = useState(null);

  const checkInputs = () => {
    if (!numberofitems || numberofitems <= 0) {
      setItemsError("El número de prendas debe ser mayor que 0");
      return

    }
    if (!weight || weight <= 0) {
      setWeightError("El peso debe ser mayor que 0");
      return
    }
    setItemsError(null);
    setWeightError(null);
    setStep(step + 1);
  }




  return (

    <>
      {/* Sidebar */}
      <Sidebar />

      
    

        {/* Main Content */}
        <div className="min-h-screen bg-gray-100 p-6 ml-0 md:ml-96 w-full">
          {loading ? (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-100 ">     
                    <LoaderM />
           </div>
          ) : (
            <>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Realizar pedido
          </h2>

          {/* ✅ Display Loading & Error Messages */}
          {error && <p className="text-red-600">{error}</p>}


          {/* Stepper */}
          <div className="flex justify-between sm:justify-start mt-6 space-x-6 sm:space-x-72">
            <div
              className={`flex flex-col items-center ${step === 1 ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
            >
              <Package
                className={`w-10 h-10 p-2 rounded-full ${step === 1 ? "bg-blue-600  text-white" : "text-gray-400"
                  }`}
              />
              <p className="text-sm sm:text-base ">Detalles del pedido</p>
            </div>
            <div
              className={`flex flex-col items-center ${step === 2 ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
            >
              <Scale
                className={`w-10 h-10  p-2 rounded-full ${step === 2 ? "bg-blue-600 text-white" : "text-gray-400"
                  }`}
              />
              <p className="text-sm sm:text-base ">Peso y prendas</p>
            </div>
            <div
              className={`flex flex-col items-center ${step === 3 ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
            >
              <DollarSign
                className={`w-10 h-10  p-2 rounded-full ${step === 3 ? "bg-blue-600 text-white" : "text-gray-400"
                  }`}
              />
              <p className="text-sm sm:text-base">Revisar y pagar</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white p-6 rounded-lg shadow-lg mt-8 w-full max-w-4xl">
            {step === 1 && (
              <>
                <h3 className="text-lg font-semibold">Detalles del pedido</h3>
<p className="text-sm text-gray-500">
  Completa los datos de tu pedido de lavandería
</p>

{/* Error Handling */}

{weightError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto mt-4">
                    <div className="flex items-start space-x-3">
                      <div>
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Corrige los siguientes errores:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>El peso debe ser mayor que 0</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {itemsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto mt-4">
                    <div className="flex items-start space-x-3">
                      <div>
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="text-sm text-red-800">
                        <p className="font-medium">Corrige los siguientes errores:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>El número de prendas debe ser mayor que 0</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
  <div className="flex flex-col">
    <label htmlFor="order-bag-number" className="text-base text-black">Número de bolsa</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <Package className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-bag-number"
        type="number"
        placeholder="Número de bolsa"
        value={user.bagNumber}
        readOnly
        className="w-full bg-transparent outline-none"
      />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="order-customer-name" className="text-base text-black">Nombre</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <User className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-customer-name"
        type="text"
        placeholder="Nombre"
        value={user.name}
        readOnly
        className="w-full bg-transparent outline-none"
      />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="order-room-number" className="text-base text-black">Número de habitación</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <Building className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-room-number"
        type="text"
        placeholder="Número de habitación"
        value={user.roomNumber}
        className="w-full bg-transparent outline-none"
        readOnly
      />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="order-building" className="text-base text-black">Edificio</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <Home className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-building"
        type="text"
        placeholder="Edificio"
        value={user.buildingName}
        readOnly
        className="w-full bg-transparent outline-none"
      />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="order-item-count" className="text-base text-black">Número de prendas</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <Shirt className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-item-count"
        type="number"
        placeholder="Número de prendas"
        value={numberofitems}
        className="w-full bg-transparent outline-none"
        onChange={(e) => setNumberOfItems(e.target.value)}
      />
    </div>
  </div>
  <div className="flex flex-col">
    <label htmlFor="order-weight" className="text-base text-black">Peso en kilogramos</label>
    <div className="flex items-center border rounded-lg p-3 bg-gray-50">
      <Scale className="w-5 h-5 text-gray-400 mr-2" />
      <input
        id="order-weight"
        type="number"
        placeholder="Peso en kg"
        value={weight}
        className="w-full bg-transparent outline-none"
        onChange={(e) => setWeight(e.target.value)}
      />
    </div>
  </div>
</div>

              </>
            )}
            {step === 2 && (
              <>
                {" "}
                <div className="bg-white rounded-lg border p-6 max-w-4xl mx-auto">
                  <h2 className="text-xl font-semibold mb-2">
                    Confirmación del pedido
                  </h2>
                  <p className="text-gray-600 mb-6">Revisa tu pedido cuidadosamente</p>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Resumen del pedido</h3>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Shirt className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-600">Prendas</span>
                        </div>
                        <span className="font-medium">{numberofitems} prendas</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Scale className="w-5 h-5 text-gray-600" />
                          <span className="text-gray-600">Peso (kg)</span>
                        </div>
                        <span className="font-medium">{weight} kg</span>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{price}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span>Total</span>
                        <span>₹{price}</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2 text-sm text-gray-600">
                      <p>• Los precios incluyen la limpieza estándar y la manipulación</p>
                      <p>• Pueden aplicarse cargos adicionales por el tratamiento de manchas</p>
                      <p>• Peso mínimo del pedido: 2 kg</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Step 3: Revisar y pagarment */}
            {step === 3 && (
              <div className="bg-white rounded-lg border p-6 max-w-4xl mx-auto">
                <h3 className="text-xl font-semibold mb-2">Revisión y pago</h3>
                <p className="text-gray-600 mb-6">
                  Revisa tu pedido y completa el pago
                </p>

                {/* Detalles del pedido */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-4 bg-blue-50 rounded-lg p-3">
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">Nombre</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">
                      Número de bolsa
                    </p>
                    <p className="font-medium"> {user.bagNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">
                      Número de habitación
                    </p>
                    <p className="font-medium">{user.roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">
                      Nombre del edificio
                    </p>
                    <p className="font-medium">{user.buildingName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">
                      Número de prendas
                    </p>
                    <p className="font-medium">{numberofitems} prendas</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-gray-600 ">
                      Peso (kg)
                    </p>
                    <p className="font-medium">{weight}</p>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="flex justify-center mt-6">
                  <button className="border p-4 rounded-lg flex flex-col items-center ">
                    <QrCode
                      className="h-6 w-6"
                      onClick={() => setShowPayment(!showpayment)}
                    />
                    <span className="text-sm font-medium">Pago por UPI</span>
                  </button>
                </div>

                {/* Código QR Payment */}
                {showpayment && (
                  <>
                    <div className="flex flex-col items-center gap-2 py-6">
                      <img
                        src="#"
                        alt="Código QR"
                        className="h-40 w-40 border p-2 rounded-lg"
                      />
                      <p className="font-medium">Escanea el código QR para pagar</p>
                      <p className="text-sm text-gray-500">
                        O usa el ID de UPI: laundry@upi
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col items-center">
                      {/* Hidden File Input */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="uploadScreenshot"
                      />

                      {/* Upload Button */}
                      <label
                        htmlFor="uploadScreenshot"
                        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg text-center w-full max-w-xs"
                      >
                        Subir captura del pago
                      </label>

                      {/* Show Uploaded Screenshot */}
                      {screenshot && (
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            Captura subida:
                          </p>
                          <img
                            src={screenshot}
                            alt="Captura del pago"
                            className="h-32 w-32 sm:h-40 sm:w-40 border p-2 rounded-lg mx-auto"
                          />
                        </div>
                      )}
                    </div>

                    {/* Total Payment */}
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center mt-4">
                      <div>
                        <p className="text-sm text-blue-600">Total a pagar</p>
                        <p className="text-xs text-blue-500">
                          Incluye todas las tarifas del servicio
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">₹{price}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              {step > 1 && (
                <button
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg"
                  onClick={() => setStep(step - 1)}
                >
                  Atrás
                </button>
              )}

              {step === 1 && (
                <>
                  <div></div>
                  <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    onClick={checkInputs} // ✅ Validate before moving to Step 2
                  >
                    Continuar
                  </button>
                </>
              )}
              {step === 2 && (
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  onClick={() => setStep(step + 1)}
                >
                  Continuar
                </button>
              )}
              {step === 3 && (
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  onClick={handleSubmitOrder}>
                  Realizar pedido
                </button>
              )}
            </div>
          </div>
          </>
          )}
                 </div>
      </>


   
  );
}
