import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Flasher } from "./pages/Flasher";
import { Tools } from "./pages/Tools";
import { DeviceInfoPage } from "./pages/DeviceInfoPage";
import { Advanced } from "./pages/Advanced";
import { Security } from "./pages/Security";
import { Settings } from "./pages/Settings";
import { cancelOperation } from "./services/api";

function AppContent() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      cancelOperation().catch(() => undefined);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="flasher" element={<Flasher />} />
          <Route path="tools" element={<Tools />} />
          <Route path="device-info" element={<DeviceInfoPage />} />
          <Route path="advanced" element={<Advanced />} />
          <Route path="security" element={<Security />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return <AppContent />;
}

export default App;
