import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const TTL = 5 * 60 * 1000;

export const fetchContacts = createAsyncThunk('contacts/fetch', async (params) => {
  const res = await axios.get(`${API}/contacts`, { params });
  return { ...res.data, _paramKey: JSON.stringify(params || {}) };
});

const slice = createSlice({
  name: 'contacts',
  initialState: {
    items: [], total: 0, pages: 1,
    loading: false, error: null,
    lastFetch: 0, paramKey: '',
  },
  reducers: {
    invalidateContacts: state => { state.lastFetch = 0; },
    removeContact: (state, { payload: id }) => {
      state.items = state.items.filter(c => c._id !== id);
      state.total = Math.max(0, state.total - 1);
    },
  },
  extraReducers: b => b
    .addCase(fetchContacts.pending,   s => { s.loading = true; s.error = null; })
    .addCase(fetchContacts.fulfilled, (s, { payload }) => {
      s.loading  = false;
      s.items    = payload.contacts || [];
      s.total    = payload.total    || 0;
      s.pages    = payload.pages    || 1;
      s.lastFetch = Date.now();
      s.paramKey  = payload._paramKey;
    })
    .addCase(fetchContacts.rejected, (s, { error }) => { s.loading = false; s.error = error.message; }),
});

export const { invalidateContacts, removeContact } = slice.actions;
export default slice.reducer;
