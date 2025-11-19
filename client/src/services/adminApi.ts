import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

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

export default {};
