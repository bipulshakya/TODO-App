import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import AuthForm from './components/AuthForm';

// Column identifiers for drag-and-drop
const COLUMN = { TODO: 'todo', IN_PROGRESS: 'inProgress', COMPLETED: 'completed' };

function getTaskColumn(task) {
  if (task.completed) return COLUMN.COMPLETED;
  if (task.inProgress || task.in_progress) return COLUMN.IN_PROGRESS;
  return COLUMN.TODO;
}

function App() {
  // ── Auth state ─────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('auth_username') || '');

  const handleAuthSuccess = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    setToken(null);
    setUsername('');
    setTasks([]);
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // ── Clock state ────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Search state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Task state ─────────────────────────────────────────────
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (token) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:5001/tasks', { headers: authHeaders() });
      if (response.status === 401) { handleLogout(); return; }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') { alert('Task cannot be empty'); return; }
    if (tasks.some(task => task.text === newTask)) { alert('Task already exists'); return; }
    try {
      const response = await fetch('http://localhost:5001/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: newTask, description: newDescription }),
      });
      const newTaskData = await response.json();
      setTasks(prev => [...prev, newTaskData]);
      setNewTask('');
      setNewDescription('');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
  };

  const toggleTask = (index) => {
    setTasks(prev => prev.map((task, i) => {
      if (i !== index) return task;
      if (!task.inProgress && !task.completed) return { ...task, inProgress: true };
      if (task.inProgress && !task.completed) return { ...task, inProgress: false, completed: true };
      return { ...task, completed: false };
    }));
  };

  const deleteTask = (index) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompletedTasks = () => {
    setTasks(prev => prev.filter(task => !task.completed));
  };

  const startEditing = (index, text, description) => {
    setEditIndex(index);
    setEditText(text);
    setEditDescription(description);
  };

  const saveEdit = () => {
    if (editText.trim() === '') { alert('Task cannot be empty'); return; }
    setTasks(prev => prev.map((task, i) =>
      i === editIndex ? { ...task, text: editText, description: editDescription } : task
    ));
    setEditIndex(null);
    setEditText('');
    setEditDescription('');
  };

  // ── Drag-and-Drop ──────────────────────────────────────────
  const dragIndex = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragIndex.current === null) return;

    const idx = dragIndex.current;
    dragIndex.current = null;

    setTasks(prev => prev.map((task, i) => {
      if (i !== idx) return task;
      switch (targetCol) {
        case COLUMN.TODO:       return { ...task, inProgress: false, completed: false };
        case COLUMN.IN_PROGRESS: return { ...task, inProgress: true,  completed: false };
        case COLUMN.COMPLETED:  return { ...task, inProgress: false, completed: true  };
        default: return task;
      }
    }));
  };

  const handleDragLeave = () => setDragOverCol(null);

  // ── Filtered tasks ─────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filtered = tasks.filter(t =>
    t.text?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
  );

  const todoTasks       = filtered.filter(t => !t.inProgress && !t.in_progress && !t.completed);
  const inProgressTasks = filtered.filter(t => (t.inProgress || t.in_progress) && !t.completed);
  const completedTasks  = filtered.filter(t => t.completed);

  // Helper: get the real global index of a filtered task
  const globalIndex = (task) => tasks.indexOf(task);

  // ── Render helpers ─────────────────────────────────────────
  const renderTask = (task, col) => {
    const idx = globalIndex(task);
    return (
      <li
        key={idx}
        draggable
        onDragStart={() => handleDragStart(idx)}
        className={`draggable-task ${task.completed ? 'completed' : ''}`}
      >
        {editIndex === idx ? (
          <div className="edit-section">
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <button onClick={saveEdit}>Save</button>
          </div>
        ) : (
          <div className="task-item">
            <div className="drag-handle" title="Drag to move">⠿</div>
            <label>
              <input type="checkbox" checked={task.completed} onChange={() => toggleTask(idx)} />
              <span className={task.completed ? 'task-done' : ''}>{task.text}</span>
            </label>
            <p>{task.description}</p>
            <div className="task-actions">
              <button onClick={() => startEditing(idx, task.text, task.description)}>Edit</button>
              <button onClick={() => deleteTask(idx)}>Delete</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  const renderColumn = (title, colTasks, col, icon) => (
    <div
      className={`task-box ${dragOverCol === col ? 'drop-target' : ''}`}
      onDragOver={(e) => handleDragOver(e, col)}
      onDrop={(e) => handleDrop(e, col)}
      onDragLeave={handleDragLeave}
    >
      <h2>{icon} {title} <span className="task-count">{colTasks.length}</span></h2>
      <ul className="task-list">
        {colTasks.length === 0 && (
          <li className="empty-drop-hint">Drop tasks here</li>
        )}
        {colTasks.map(task => renderTask(task, col))}
      </ul>
    </div>
  );

  // ── Auth gate ──────────────────────────────────────────────
  if (!token) return <AuthForm onAuthSuccess={handleAuthSuccess} />;

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="App">
      {/* Navbar */}
      <div className="app-navbar">
        <span className="app-navbar-logo">✅ TODO-LIST</span>
        <div className="app-navbar-user">
          <span className="app-navbar-greeting">👤 {username}</span>
          <button className="app-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="todo-container">
        {/* Calendar & Clock Widget */}
        <div className="clock-widget">
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
        </div>

        <h1>TODO-LIST</h1>

        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-bar"
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* Add Task */}
        <div className="input-section">
          <input
            type="text"
            placeholder="Task title..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <textarea
            placeholder="Task description..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <button onClick={addTask}>Add Task</button>
        </div>

        {/* Task columns */}
        <div className="task-box-container">
          {renderColumn('TODO',        todoTasks,        COLUMN.TODO,        '📋')}
          {renderColumn('In-Progress', inProgressTasks,  COLUMN.IN_PROGRESS, '⚙️')}
          {renderColumn('Completed',   completedTasks,   COLUMN.COMPLETED,   '✅')}
        </div>

        <button onClick={clearCompletedTasks} className="clear-completed-button">
          Clear Completed
        </button>
      </div>
    </div>
  );
}

export default App;
