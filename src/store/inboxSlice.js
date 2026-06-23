import { createSlice } from '@reduxjs/toolkit';

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: { totalUnread: 0 },
  reducers: {
    setTotalUnread: (state, action) => { state.totalUnread = action.payload; },
  },
});

export const { setTotalUnread } = inboxSlice.actions;
export default inboxSlice.reducer;
