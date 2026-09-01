export const ROUTES = {
  HOME: "/",
  EXPLORER: "/explorer",
  HUB: "/hub",
  PEOPLE: "/people",
  MESSAGES: "/messages",
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
} as const;

export const getProfileRoute = (userId: string) => `/profile/${userId}`;
