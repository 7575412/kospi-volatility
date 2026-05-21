import { Platform } from "react-native";

// Android emulator routes localhost through 10.0.2.2
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE = `http://${HOST}:8000/api`;
