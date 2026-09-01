"use client";

import { useReducer, useEffect } from "react";

type AuthStatus = "idle" | "loading" | "mfa" | "success" | "error";
type AuthMethod = "email" | "google" | "github" | "passkey" | null;

interface AuthState {
  status: AuthStatus;
  method: AuthMethod;
  error: string | null;
  notice: string | null;
}

type AuthAction =
  | { type: "START_AUTH"; method: AuthMethod }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_ERROR"; error: string }
  | { type: "SET_MFA" }
  | { type: "SET_NOTICE"; message: string }
  | { type: "RESET" };

const initialState: AuthState = {
  status: "idle",
  method: null,
  error: null,
  notice: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "START_AUTH":
      return { ...state, status: "loading", method: action.method, error: null };
    case "AUTH_SUCCESS":
      return { ...state, status: "success", error: null };
    case "AUTH_ERROR":
      return { ...state, status: "error", error: action.error };
    case "SET_MFA":
      return { ...state, status: "mfa" };
    case "SET_NOTICE":
      return { ...state, notice: action.message };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useAuthState() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Basic observability logging for state transitions
    if (state.status !== "idle") {
      console.log(`[Auth] Transition: ${state.status}${state.method ? ` (Method: ${state.method})` : ""}`);
    }
    if (state.status === "error" && state.error) {
      console.error(`[Auth] Error: ${state.error}`);
    }
  }, [state.status, state.method, state.error]);

  return {
    state,
    startAuth: (method: AuthMethod) => dispatch({ type: "START_AUTH", method }),
    setSuccess: () => dispatch({ type: "AUTH_SUCCESS" }),
    setError: (error: string) => dispatch({ type: "AUTH_ERROR", error }),
    setMfa: () => dispatch({ type: "SET_MFA" }),
    setNotice: (message: string) => dispatch({ type: "SET_NOTICE", message }),
    reset: () => dispatch({ type: "RESET" }),
  };
}
