import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './authSlice';
import langReducer     from './langSlice';
import funnelReducer   from './funnelSlice';
import contactsReducer from './contactsSlice';
import tasksReducer    from './tasksSlice';
import callsReducer    from './callsSlice';
import inboxReducer    from './inboxSlice';

const store = configureStore({
  reducer: {
    auth:     authReducer,
    lang:     langReducer,
    funnels:  funnelReducer,
    contacts: contactsReducer,
    tasks:    tasksReducer,
    calls:    callsReducer,
    inbox:    inboxReducer,
  },
});

export default store;
