import { configureStore } from '@reduxjs/toolkit';
import authReducer  from './authSlice';
import langReducer  from './langSlice';
import funnelReducer from './funnelSlice';

const store = configureStore({
  reducer: {
    auth:    authReducer,
    lang:    langReducer,
    funnels: funnelReducer,
  },
});

export default store;
