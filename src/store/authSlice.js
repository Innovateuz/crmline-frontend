import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Xato yuz berdi');
  }
});

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, data);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const oid = user?.organization?.id || user?.organization?._id;
    if (oid) {
      const { connectSocket } = await import('../utils/socket');
      connectSocket(oid);
    }
    return user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Xato yuz berdi');
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    const user = response.data.user;
    // Socket-ni eng erta — Redux re-render kutmasdan ulaymiz
    const oid = user?.organization?.id || user?.organization?._id;
    if (oid) {
      const { connectSocket } = await import('../utils/socket');
      connectSocket(oid);
    }
    return user;
  } catch (error) {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    return rejectWithValue(error.response?.data?.message || 'Xato yuz berdi');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${API_URL}/auth/update-profile`, data);
    return response.data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Xato yuz berdi');
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (data, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${API_URL}/auth/change-password`, data);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Xato yuz berdi');
  }
});

// Records the logout server-side (audit) while the token is still valid.
// The caller clears local auth state (logout reducer) after this resolves.
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try { await axios.post(`${API_URL}/auth/logout`); } catch { /* ignore */ }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
    // Ekran qulflash holati — localStorage'da saqlanadi (sahifani yangilash
    // qulflashni o'chirib yubormaydi). True bo'lganda LockScreen overlay chiqadi.
    locked: localStorage.getItem('screenLocked') === '1',
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.initialized = true;
      state.locked = false;
      localStorage.removeItem('token');
      localStorage.removeItem('screenLocked');
      delete axios.defaults.headers.common['Authorization'];
    },
    clearError: (state) => {
      state.error = null;
    },
    setOrganization: (state, action) => {
      if (state.user) state.user.organization = { ...state.user.organization, ...action.payload };
    },
    setInitialized: (state) => {
      state.initialized = true;
    },
    // Ekranni qulflaydi — overlay chiqadi, parol so'raydi
    lockScreen: (state) => {
      state.locked = true;
      try { localStorage.setItem('screenLocked', '1'); } catch {}
    },
    // Parol tasdiqlangach overlay yopiladi
    unlockScreen: (state) => {
      state.locked = false;
      try { localStorage.removeItem('screenLocked'); } catch {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(getMe.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        const u = action.payload?.user || action.payload;
        state.user = { ...state.user, ...u };
      });
  },
});

export const { logout, clearError, setInitialized, setOrganization, lockScreen, unlockScreen } = authSlice.actions;
export default authSlice.reducer;
