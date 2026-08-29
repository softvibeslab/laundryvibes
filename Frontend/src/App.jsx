import { Routes, Route, BrowserRouter } from 'react-router-dom';
import './App.css'
import RoleSelector from './Component/Roleselector/Roleselector.jsx'
import Dashboard from './Component/User/Dashboard.jsx';
import Orderhistory from './Component/User/OrderHistory/Orderhistory.jsx';
import Login from './Component/User/Login.jsx';
import Registration from './Component/User/Registration.jsx';
import ForgotPassword from './Component/User/ForgotPassword.jsx';
import ResetPassword from './Component/User/ResetPassword.jsx';
import WorkerDashbaord from './Component/Worker/Dashboard/workerDashbaord.jsx';
import Submitorder from './Component/User/SubmitOrder/Submitorder.jsx';
import Profile from './Component/User/Profile/Profile.jsx';
import OrderConfirmation from './Component/User/SubmitOrder/OrderConfirmation.jsx';
import Dailyrush from './Component/User/Daily-Rush/Dailyrush.jsx';
import Complaint from './Component/User/Complaint-Form/ComplaintForm.jsx';
import ComplaintFormSuccess from './Component/User/Complaint-Form/ComplaintFormSuccess.jsx';
import OrderManagement from './Component/Worker/OrdersManagement/OrderManagement.jsx';
import Stock from './Component/Worker/Stock/Stock.jsx';
import ProtectedRoute from './Component/ProtectedRoute.jsx';
import LandingPage from './Component/Landing/LandingPage.jsx';
import PageMetadata from './Component/SEO/PageMetadata.jsx';
import OperationsSettings from './Component/Worker/Settings/OperationsSettings.jsx';
import NotFound from './Component/SEO/NotFound.jsx';


function App() {
  const user = (content) => <ProtectedRoute roles={['user']}>{content}</ProtectedRoute>;
  const worker = (content) => <ProtectedRoute roles={['worker', 'admin']}>{content}</ProtectedRoute>;
  const admin = (content) => <ProtectedRoute roles={['admin']}>{content}</ProtectedRoute>;
  const workerOnly = (content) => <ProtectedRoute roles={['worker']}>{content}</ProtectedRoute>;

  return (
    <>
    <BrowserRouter>
    <PageMetadata />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registration" element={<Registration />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route index element={<LandingPage />} />
    <Route path="/access" element={<div className='bg-softBlue min-h-screen'><RoleSelector /></div>} />
    <Route path="/user/userdashboard" element={user(<div className="bg-softBlue min-h-screen"><Dashboard /></div>)} />
    <Route path="/user/order-history" element={user(<div className="bg-historybg min-h-screen"><Orderhistory /></div>)} />
    <Route path="/user/submit-order" element={user(<div className="bg-historybg min-h-screen"><Submitorder /></div>)} />
    <Route path="/user/submit-order/success" element={user(<div className="bg-gray-50 min-h-screen"><OrderConfirmation /></div>)} />
    <Route path="/user/daily-rush" element={user(<div className="bg-gray-50 min-h-screen"><Dailyrush /></div>)} />
    <Route path="/user/profile" element={user(<div className="bg-softBlue min-h-screen"><Profile /></div>)} />
    <Route path="/user/complaint" element={user(<div className="bg-softBlue min-h-screen"><Complaint /></div>)} />
    <Route path="/user/complaint/success" element={user(<div className="bg-softBlue min-h-screen"><ComplaintFormSuccess /></div>)} />


    {/* worker starts  */}
    <Route path="/workerdashboard" element={worker(<WorkerDashbaord />)} />
    <Route path="/admin/dashboard" element={admin(<WorkerDashbaord />)} />
    <Route path="/worker/orders" element={worker(<OrderManagement />)} />
    <Route path="/stock" element={worker(<Stock />)} />
    <Route path="/worker/settings" element={workerOnly(<OperationsSettings />)} />
    <Route path="/admin/settings" element={admin(<OperationsSettings />)} />
    <Route path="*" element={<NotFound />} />
    </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
