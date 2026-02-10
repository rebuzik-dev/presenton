const getAuthToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

const getApiKey = () => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("api_key");
};

export const getHeader = () => {
  const token = getAuthToken();
  const apiKey = getApiKey();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  };
};

export const getHeaderForFormData = () => {
  const token = getAuthToken();
  const apiKey = getApiKey();
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  };
};
