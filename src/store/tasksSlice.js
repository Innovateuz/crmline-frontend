import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const TTL = 2 * 60 * 1000;

export const fetchTasks = createAsyncThunk('tasks/fetch', async (_, { getState }) => {
  const { lastFetch } = getState().tasks;
  if (Date.now() - lastFetch < TTL) return null;
  const [stagesRes, tasksRes, usersRes] = await Promise.all([
    axios.get(`${API}/organization/task-stages`),
    axios.get(`${API}/tasks`),
    axios.get(`${API}/organization/users`),
  ]);
  return {
    stages: stagesRes.data.stages || [],
    tasks:  tasksRes.data.tasks   || [],
    users:  usersRes.data.users   || [],
    total:  tasksRes.data.total   ?? (tasksRes.data.tasks?.length || 0),
  };
});

const slice = createSlice({
  name: 'tasks',
  initialState: { tasks: [], stages: [], users: [], total: 0, loading: false, lastFetch: 0 },
  reducers: {
    invalidateTasks: s => { s.lastFetch = 0; },
    setTasksList: (s, { payload }) => { s.tasks = payload; },
    upsertTask: (s, { payload }) => {
      const i = s.tasks.findIndex(t => t._id === payload._id);
      if (i !== -1) s.tasks[i] = payload; else s.tasks.push(payload);
    },
    removeTask: (s, { payload: id }) => { s.tasks = s.tasks.filter(t => t._id !== id); },
  },
  extraReducers: b => b
    .addCase(fetchTasks.pending,   s => { s.loading = true; })
    .addCase(fetchTasks.fulfilled, (s, { payload }) => {
      s.loading = false;
      if (!payload) return;
      s.tasks     = payload.tasks;
      s.stages    = payload.stages;
      s.users     = payload.users;
      s.total     = payload.total ?? payload.tasks.length;
      s.lastFetch = Date.now();
    })
    .addCase(fetchTasks.rejected,  s => { s.loading = false; }),
});

export const { invalidateTasks, setTasksList, upsertTask, removeTask } = slice.actions;
export default slice.reducer;
