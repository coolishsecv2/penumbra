import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Flasher } from "./pages/Flasher";
import { Tools } from "./pages/Tools";
import { DeviceInfoPage } from "./pages/DeviceInfoPage";
import { Advanced } from "./pages/Advanced";
import { Security } from "./pages/Security";
import { Settings } from "./pages/Settings";

function App() {
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

export default App;
