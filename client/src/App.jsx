import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import LinkStats from './pages/LinkStats';
import Landing from './pages/Landing';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import RefundPolicy from './pages/RefundPolicy';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" />;
    return children;
}

function GuestRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (user) return <Navigate to="/dashboard" />;
    return children;
}

export default function App() {
    const { user } = useAuth();

    return (
        <div className="app">
            {user && <Navbar />}
            <Routes>
                <Route path="/" element={
                    <GuestRoute><Landing /></GuestRoute>
                } />
                <Route path="/login" element={
                    <GuestRoute><Login /></GuestRoute>
                } />
                <Route path="/signup" element={
                    <GuestRoute><Signup /></GuestRoute>
                } />
                <Route path="/dashboard" element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/dashboard/link/:id" element={
                    <ProtectedRoute><LinkStats /></ProtectedRoute>
                } />
                <Route path="/payment-success" element={
                    <ProtectedRoute><PaymentSuccess /></ProtectedRoute>
                } />

                {/* Standard Pages */}
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </div>
    );
}
