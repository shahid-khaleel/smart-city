import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Session check & JWT Decoder on load
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    let storedUser = localStorage.getItem("user_data");

    if (storedToken) {
      try {
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // 2FA flow sets the token but not user_data, so we decode the JWT here!
          const payloadBase64 = storedToken.split('.')[1];
          const decodedJson = atob(payloadBase64);
          const tokenData = JSON.parse(decodedJson);

          const reconstructedUser = {
            id: tokenData.sub,
            role: tokenData.role.toLowerCase(),
            // BUG FIX: Pulling the actual name from the token instead of hardcoding it!
            name: tokenData.full_name || "AUTHORIZED_USER",
            full_name: tokenData.full_name 
          };
          
          localStorage.setItem("user_data", JSON.stringify(reconstructedUser));
          setUser(reconstructedUser);
        }
      } catch (err) {
        console.error("Failed to parse token/profile", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
      }
    }
    setIsLoading(false);
  }, []);

  // 2. THE REGISTRATION FUNCTION
  const register = async (userData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Failed to create account." };
      }
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "Network error connecting to the server." };
    } finally {
      setIsLoading(false);
    }
  };

  // 3. THE 2FA-AWARE LOGIN FUNCTION
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", credentials.email);
      formData.append("password", credentials.password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Invalid email or password." };
      }

      const data = await response.json();

      // --- THE 2FA INTERCEPTOR ---
      if (data.require_2fa) {
        return { success: true, require_2fa: true, email: data.email };
      }

      // Fallback: If 2FA is ever bypassed (Admins/Workers), proceed normally
      const token = data.access_token;
      localStorage.setItem("token", token);

      const payloadBase64 = token.split('.')[1];
      const decodedJson = atob(payloadBase64);
      const tokenData = JSON.parse(decodedJson);

      const finalUserData = {
        id: tokenData.sub,
        role: tokenData.role.toLowerCase(),
        email: credentials.email,
        // BUG FIX: Pulling the actual name from the token!
        name: tokenData.full_name || credentials.email.split("@")[0].toUpperCase(),
        full_name: tokenData.full_name
      };

      localStorage.setItem("user_data", JSON.stringify(finalUserData));
      setUser(finalUserData);

      return { success: true, role: finalUserData.role };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error connecting to the server." };
    } finally {
      setIsLoading(false);
    }
  };

  // 4. SECURE LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_data");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};