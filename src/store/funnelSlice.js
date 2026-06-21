import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

export const fetchFunnels = createAsyncThunk('funnels/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await axios.get(`${API}/funnels`);
    return res.data.funnels;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Xato');
  }
});

const funnelSlice = createSlice({
  name: 'funnels',
  initialState: {
    list:    [],
    loading: false,
    loaded:  false,
  },
  reducers: {
    addFunnel(state, { payload }) {
      state.list.push(payload);
    },
    updateFunnel(state, { payload }) {
      const i = state.list.findIndex(f => f._id === payload._id);
      if (i !== -1) state.list[i] = payload;
    },
    removeFunnel(state, { payload }) {
      state.list = state.list.filter(f => f._id !== payload);
    },
    resetFunnels(state) {
      state.list = []; state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFunnels.pending,  (state) => { state.loading = true; })
      .addCase(fetchFunnels.fulfilled, (state, { payload }) => {
        state.list = payload; state.loading = false; state.loaded = true;
      })
      .addCase(fetchFunnels.rejected, (state) => { state.loading = false; state.loaded = true; });
  },
});

export const { addFunnel, updateFunnel, removeFunnel, resetFunnels } = funnelSlice.actions;
export default funnelSlice.reducer;
