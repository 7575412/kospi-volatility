import { Platform } from "react-native";

// Android emulator: 10.0.2.2 → PC localhost
// Real device: use PC's LAN IP (same Wi-Fi network required)
const HOST =
  Platform.OS === "android" && !__DEV__
    ? "172.30.1.89"
    : Platform.OS === "android"
    ? "10.0.2.2"
    : "localhost";

export const API_BASE = `http://${HOST}:8000/api`;
