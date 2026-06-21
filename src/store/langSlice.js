import { createSlice } from '@reduxjs/toolkit';

const savedLang = localStorage.getItem('language') || 'uz';

const langSlice = createSlice({
  name: 'lang',
  initialState: {
    current: savedLang,
  },
  reducers: {
    setLanguage: (state, action) => {
      state.current = action.payload;
      localStorage.setItem('language', action.payload);
    },
  },
});

export const { setLanguage } = langSlice.actions;
export default langSlice.reducer;
