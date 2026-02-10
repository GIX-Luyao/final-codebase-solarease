import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ROISimulatorPage from "./pages/ROISimulatorPage";
import ROICalculatorPage from "./pages/ROICalculatorPage";
import NegotiationToolPage from "./pages/NegotiationToolPage";
import AdminPage from "./pages/AdminPage";
import ContractTransparencyPage from "./pages/ContractTransparencyPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SavedContractsPage from "./pages/SavedContractsPage";
import AIChatbot from "./components/AIChatbot";
import "./index.css";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/roi-simulator" element={<ROISimulatorPage />} />
            <Route path="/roi-calculator" element={<ROICalculatorPage />} />
            <Route path="/negotiation-tool" element={<NegotiationToolPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="/contract-transparency"
              element={<ContractTransparencyPage />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/saved-contracts"
              element={
                <ProtectedRoute>
                  <SavedContractsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <AIChatbot />
        </div>
      </AuthProvider>
    </Router>
  );
}
