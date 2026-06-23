import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const TTL = 60 * 1000;

export const fetchCalls = createAsyncThunk('calls/fetch', async (params) => {
  const res = await axios.get(`${API}/atc/calls`, { params });
  return { ...res.data, _paramKey: JSON.stringify(params || {}) };
});

const slice = createSlice({
  name: 'calls',
  initialState: {
    items: [], total: 0,
    loading: false, error: null,
    lastFetch: 0, paramKey: '',
  },
  reducers: {
    invalidateCalls: s => { s.lastFetch = 0; },
    updateCallItem: (s, { payload }) => {
      const i = s.items.findIndex(c => c._id === payload._id);
      if (i !== -1) s.items[i] = { ...s.items[i], ...payload };
    },
    removeCallItems: (s, { payload: ids }) => {
      const set = new Set(ids);
      s.items = s.items.filter(c => !set.has(c._id));
      s.total = Math.max(0, s.total - ids.length);
    },
  },
  extraReducers: b => b
    .addCase(fetchCalls.pending,   s => { s.loading = true; s.error = null; })
    .addCase(fetchCalls.fulfilled, (s, { payload }) => {
      s.loading   = false;
      s.items     = payload.calls || [];
      s.total     = payload.total || 0;
      s.lastFetch = Date.now();
      s.paramKey  = payload._paramKey;
    })
    .addCase(fetchCalls.rejected, (s, { error }) => { s.loading = false; s.error = error.message; }),
});

export const { invalidateCalls, updateCallItem, removeCallItems } = slice.actions;
export default slice.reducer;
