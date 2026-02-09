const getAuthToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

export const getHeader = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getHeaderForFormData = () => {
  const token = getAuthToken();
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
