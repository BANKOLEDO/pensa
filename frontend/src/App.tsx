import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import { WalletProvider } from "./lib/wallet";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/onboard" element={<Onboarding />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
