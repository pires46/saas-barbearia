import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ClientSession {
  slug: string;
  tenantName: string;
  phone: string;
  name: string;
  clientId?: string;
  loyaltyPoints?: number;
  visitCount?: number;
  vip?: boolean;
}

interface AppContextType {
  session: ClientSession | null;
  setSession: (s: ClientSession | null) => void;
  apiUrl: string;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("barbersaas_session").then((data) => {
      if (data) setSessionState(JSON.parse(data));
      setLoading(false);
    });
  }, []);

  const setSession = async (s: ClientSession | null) => {
    setSessionState(s);
    if (s) {
      await AsyncStorage.setItem("barbersaas_session", JSON.stringify(s));
    } else {
      await AsyncStorage.removeItem("barbersaas_session");
    }
  };

  return (
    <AppContext.Provider value={{ session, setSession, apiUrl: API_URL, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
