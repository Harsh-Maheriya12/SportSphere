import axios from 'axios';

// While local, uncomment first line, and during production, uncomment second line
//let API_PREFIX = "/api";
let API_PREFIX = "https://sportsphere-f6f0.onrender.com/api";

const ensureLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);
const buildAdminUrl = (path: string) => `${API_PREFIX}${ensureLeadingSlash(path)}`;

const getAuthHeader = (token?: string | null) => {
  // Prefer explicit token (passed from context). If missing, fall back to adminToken stored separately.
  const adminToken = token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null);
  return { headers: { Authorization: adminToken ? `Bearer ${adminToken}` : '' } };
};

export const fetchUsers = async (token?: string | null, params?: any) => {
  const res = await axios.get(buildAdminUrl('/admin/users'), { params, ...getAuthHeader(token) });
  return res.data;
};

export const getUser = async (token: string | null, id: string) => {
  const res = await axios.get(buildAdminUrl(`/admin/users/${id}`), getAuthHeader(token));
  return res.data;
};

export const deleteUserApi = async (token: string | null, id: string) => {
  const res = await axios.delete(buildAdminUrl(`/admin/users/${id}`), getAuthHeader(token));
  return res.data;
};

export const fetchCoaches = async (token?: string | null, params?: any) => {
  const res = await axios.get(buildAdminUrl('/admin/coaches'), { params, ...getAuthHeader(token) });
  return res.data;
};

export const deleteCoachApi = async (token: string | null, id: string) => {
  const res = await axios.delete(buildAdminUrl(`/admin/coaches/${id}`), getAuthHeader(token));
  return res.data;
};

export const fetchVenueOwners = async (token?: string | null, params?: any) => {
  const res = await axios.get(buildAdminUrl('/admin/venue-owners'), { params, ...getAuthHeader(token) });
  return res.data;
};

export const deleteVenueOwnerApi = async (token: string | null, id: string) => {
  const res = await axios.delete(buildAdminUrl(`/admin/venue-owners/${id}`), getAuthHeader(token));
  return res.data;
};

export const getOverviewStats = async (token?: string | null) => {
  const res = await axios.get(buildAdminUrl('/admin/overview/stats'), getAuthHeader(token));
  return res.data;
};

// Admin Tickets
export const fetchTickets = async (token?: string | null) => {
  const res = await axios.get(buildAdminUrl('/admin/tickets'), getAuthHeader(token));
  return res.data;
};

export const replyToTicket = async (token: string | null, ticketId: string, message: string) => {
  const res = await axios.post(
    buildAdminUrl(`/admin/tickets/${ticketId}/reply`),
    { message },
    getAuthHeader(token)
  );
  return res.data;
};

export const closeTicket = async (token: string | null, ticketId: string) => {
  const res = await axios.patch(
    buildAdminUrl(`/admin/tickets/${ticketId}/close`),
    {},
    getAuthHeader(token)
  );
  return res.data;
};

// Admin Authentication
export const adminLogin = async (email: string, password: string) => {
  const url = buildAdminUrl('/admin/auth/loginAdmin');
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