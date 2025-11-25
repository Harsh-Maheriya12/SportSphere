import axios from 'axios';

// Get API base URL from environment, normalize it (remove trailing slashes and /api if present)
const getApiBase = () => {
  let base = (import.meta as any).env?.VITE_API_BASE || '';
  // Remove trailing slashes
  base = base.replace(/\/+$/, '');
  // If base already ends with /api, remove it (we add /api in the URL construction)
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  return base;
};

const API_BASE = getApiBase();

const getAuthHeader = (token?: string | null) => {
  // Prefer explicit token (passed from context). If missing, fall back to adminToken stored separately.
  const adminToken = token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null);
  return { headers: { Authorization: adminToken ? `Bearer ${adminToken}` : '' } };
};

export const fetchUsers = async (token?: string | null, params?: any) => {
  const res = await axios.get(`${API_BASE}/api/admin/users`, { params, ...getAuthHeader(token) });
  return res.data;
};

export const getUser = async (token: string | null, id: string) => {
  const res = await axios.get(`${API_BASE}/api/admin/users/${id}`, getAuthHeader(token));
  return res.data;
};

export const deleteUserApi = async (token: string | null, id: string) => {
  const res = await axios.delete(`${API_BASE}/api/admin/users/${id}`, getAuthHeader(token));
  return res.data;
};

export const fetchCoaches = async (token?: string | null, params?: any) => {
  const res = await axios.get(`${API_BASE}/api/admin/coaches`, { params, ...getAuthHeader(token) });
  return res.data;
};

export const deleteCoachApi = async (token: string | null, id: string) => {
  const res = await axios.delete(`${API_BASE}/api/admin/coaches/${id}`, getAuthHeader(token));
  return res.data;
};

export const fetchVenueOwners = async (token?: string | null, params?: any) => {
  const res = await axios.get(`${API_BASE}/api/admin/venue-owners`, { params, ...getAuthHeader(token) });
  return res.data;
};

export const deleteVenueOwnerApi = async (token: string | null, id: string) => {
  const res = await axios.delete(`${API_BASE}/api/admin/venue-owners/${id}`, getAuthHeader(token));
  return res.data;
};

export const getOverviewStats = async (token?: string | null) => {
  const res = await axios.get(`${API_BASE}/api/admin/overview/stats`, getAuthHeader(token));
  return res.data;
};

// Admin Tickets
export const fetchTickets = async (token?: string | null) => {
  const res = await axios.get(`${API_BASE}/api/admin/tickets`, getAuthHeader(token));
  return res.data;
};

export const replyToTicket = async (token: string | null, ticketId: string, message: string) => {
  const res = await axios.post(
    `${API_BASE}/api/admin/tickets/${ticketId}/reply`,
    { message },
    getAuthHeader(token)
  );
  return res.data;
};

export const closeTicket = async (token: string | null, ticketId: string) => {
  const res = await axios.patch(
    `${API_BASE}/api/admin/tickets/${ticketId}/close`,
    {},
    getAuthHeader(token)
  );
  return res.data;
};

// Admin Authentication
export const adminLogin = async (email: string, password: string) => {
  const url = `${API_BASE}/api/admin/auth/loginAdmin`;
  // Log in development to help debug
  if ((import.meta as any).env?.DEV) {
    console.log('Admin login URL:', url);
  }
  const res = await axios.post(url, {
    email,
    password,
  });
  return res.data;
};

export default {};