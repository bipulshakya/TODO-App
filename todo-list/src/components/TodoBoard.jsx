import React, { useState, useEffect, useRef } from 'react';
import API_URL from '../config';
import './TodoBoard.css';
import { showToast } from './ToastManager';
import { requestNotificationPermission, sendBrowserNotification, checkAndMarkNotified } from '../utils/NotificationUtils';

const COLUMN = { TODO: 'todo', IN_PROGRESS: 'inProgress', COMPLETED: 'completed' };

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return 'overdue';
  if (diffHours <= 24) return 'soon';
  return 'future';
}

function formatDeadline(deadline) {
  if (!deadline) return '';
  const date = new Date(deadline);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function renderDeadlineBadge(deadline, completed) {
  if (!deadline || completed) return null;
  const status = getDeadlineStatus(deadline);
  const labels = { overdue: '🔴 Overdue', soon: '🟠 Due Soon', future: '📅 Due' };
  return (
    <span className={`deadline-badge deadline-${status}`}>
      {labels[status]}: {formatDeadline(deadline)}
    </span>
  );
}

function TodoBoard({ token, handleLogout }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [tasks, setTasks] = useState([]);

  // Use ref to access latest tasks without stale closures in interval
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Request browser push notification permissions on load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Deadline Polling Check (Every 60s)
  useEffect(() => {
    const checkDeadlines = () => {
      // Loop through the most up-to-date tasks
      tasksRef.current.forEach(task => {
        if (!task.deadline || task.completed) return;
        
        const dl = new Date(task.deadline).getTime();
        const current = new Date().getTime();
        const diffMs = dl - current;
        if (diffMs <= 0) return; // Overdue already

        const diffHours = diffMs / (1000 * 60 * 60);
        console.log(`[DeadlineCheck] Task ${task.id} ("${task.text}") - DiffHours: ${diffHours.toFixed(3)}`);
        
        // 1 Hour Alert (if within the last hour before deadline)
        if (diffHours <= 1.0 && diffHours > 0) {
          if (!checkAndMarkNotified(task.id, '1h')) {
            console.log(`[Alert] Triggering 1h for ${task.id}`);
            showToast(`Task Due Soon: ${task.text}`, "Deadline is in less than 1 hour!", "error");
            sendBrowserNotification("Task Due in 1 Hour", { body: task.text });
          }
        } 
        // 24 Hour Alert (within the 24th hour block)
        else if (diffHours <= 24.0 && diffHours > 23.0) {
          if (!checkAndMarkNotified(task.id, '24h')) {
            console.log(`[Alert] Triggering 24h for ${task.id}`);
            showToast(`Task Deadline: ${task.text}`, "Due in 24 hours.", "warning");
            sendBrowserNotification("Task Due in 24 Hours", { body: task.text });
          }
        }
      });
    };

    // Run once after 2 seconds to allow tasks to load, then every 60s
    const initialTimer = setTimeout(checkDeadlines, 2000);
    const intervalTimer = setInterval(checkDeadlines, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const [newTask, setNewTask] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newDeadline, setNewDeadline] = useState('');

  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editDeadline, setEditDeadline] = useState('');
  // View & Filter states
  const [viewMode, setViewMode] = useState('board');
  const [listFilter, setListFilter] = useState('all');
  const [sortByDeadline, setSortByDeadline] = useState(false);

  // editTaskId tracks which task is being edited (by id, not array index)
  const [editTaskId, setEditTaskId] = useState(null);

  // Google Calendar state
  const [gcalStatus, setGcalStatus] = useState({ configured: false, connected: false });
  const [syncMsg, setSyncMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchGcalStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/tasks`, { headers: authHeaders() });
      if (response.status === 401) { handleLogout(); return; }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchGcalStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/calendar/status`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGcalStatus(data);
      }
    } catch { /* Calendar status is optional */ }
  };

  const connectGoogleCalendar = () => {
    // Open OAuth in popup
    const popup = window.open(
      `${API_URL}/calendar/auth?token=${token}`,
      'google-oauth',
      'width=500,height=600,scrollbars=yes'
    );
    const listener = (event) => {
      if (event.data === 'google-calendar-connected') {
        window.removeEventListener('message', listener);
        popup?.close();
        setGcalStatus(prev => ({ ...prev, connected: true }));
        setSyncMsg('✅ Google Calendar connected!');
        setTimeout(() => setSyncMsg(''), 4000);
      }
    };
    window.addEventListener('message', listener);
  };

  const syncToGoogleCalendar = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch(`${API_URL}/calendar/sync`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      setSyncMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
    } catch {
      setSyncMsg('❌ Failed to connect to server.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 6000);
    }
  };

  const addTask = async () => {
    if (newTask.trim() === '') return;
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          text: newTask,
          description: newDescription,
          priority: newPriority,
          deadline: newDeadline || null,
        }),
      });
      const newTaskData = await response.json();
      if (!newTaskData.created_at) newTaskData.created_at = new Date().toISOString();
      setTasks(prev => [newTaskData, ...prev]);
      setNewTask('');
      setNewDescription('');
      setNewPriority('Medium');
      setNewDeadline('');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
  };

  const applyTaskStatusLocal = (taskId, inProgress, completed) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, inProgress, in_progress: inProgress, completed }
        : t
    ));
  };

  const persistTaskStatus = async (task, nextInProgress, nextCompleted, previous) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          text: task.text,
          description: task.description || null,
          priority: task.priority || 'Medium',
          deadline: task.deadline || null,
          in_progress: nextInProgress,
          completed: nextCompleted
        })
      });

      if (!response.ok) {
        if (response.status === 401) handleLogout();
        throw new Error(`Failed to update task ${task.id}`);
      }
    } catch (error) {
      // Roll back so UI remains consistent with server state.
      applyTaskStatusLocal(task.id, previous.inProgress, previous.completed);
      showToast('Update failed', 'Could not move task. Please try again.', 'error');
      console.error('Task status update error', error);
    }
  };

  // ── Toggle task state: TODO → InProgress → Completed → TODO (3-state cycle)
  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isInProgress = Boolean(task.in_progress) || Boolean(task.inProgress);
    const isCompleted = Boolean(task.completed);
    const previous = { inProgress: isInProgress, completed: isCompleted };

    // Cycle: todo → in_progress → completed → todo
    let newInProgress, newCompleted;
    if (!isInProgress && !isCompleted) {
      // todo → in_progress
      newInProgress = true; newCompleted = false;
    } else if (isInProgress && !isCompleted) {
      // in_progress → completed
      newInProgress = false; newCompleted = true;
    } else {
      // completed → todo (reset)
      newInProgress = false; newCompleted = false;
    }

    // Optimistic update for instant UX.
    applyTaskStatusLocal(taskId, newInProgress, newCompleted);
    await persistTaskStatus(task, newInProgress, newCompleted, previous);
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (response.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        // Clear edit mode if the deleted task was being edited
        if (editTaskId === taskId) { setEditTaskId(null); }
      }
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  const startEditing = (task) => {
    setEditTaskId(task.id);
    setEditText(task.text);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'Medium');
    if (task.deadline) {
      const d = new Date(task.deadline);
      if (!isNaN(d.getTime())) {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        setEditDeadline(local.toISOString().slice(0, 16));
      } else {
        setEditDeadline('');
      }
    } else {
      setEditDeadline('');
    }
  };

  const saveEdit = async (taskId) => {
    if (editText.trim() === '') return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          text: editText.trim(),
          description: editDescription || null,
          priority: editPriority,
          deadline: editDeadline || null,
          in_progress: Boolean(task.in_progress) || Boolean(task.inProgress),
          completed: Boolean(task.completed)
        })
      });
      if (response.ok) {
        setTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, text: editText.trim(), description: editDescription || null, priority: editPriority, deadline: editDeadline || null }
            : t
        ));
        setEditTaskId(null);
      }
    } catch (error) {
      console.error('Edit error', error);
    }
  };

  // ── Drag-and-Drop ──────────────────────────────────────────
  const dragTaskId = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (taskId) => { dragTaskId.current = taskId; };
  const handleDragOver = (e, col) => { e.preventDefault(); setDragOverCol(col); };
  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e, targetCol) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!dragTaskId.current) return;
    const taskId = dragTaskId.current;
    dragTaskId.current = null;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    let newInProgress = false; let newCompleted = false;
    const prevInProgress = Boolean(task.in_progress) || Boolean(task.inProgress);
    const prevCompleted = Boolean(task.completed);

    switch (targetCol) {
      case COLUMN.TODO: break;
      case COLUMN.IN_PROGRESS: newInProgress = true; break;
      case COLUMN.COMPLETED: newCompleted = true; break;
      default: return;
    }

    // No-op move, avoid unnecessary network call.
    if (prevInProgress === newInProgress && prevCompleted === newCompleted) return;

    // Optimistic update for instant drag/drop feedback.
    applyTaskStatusLocal(taskId, newInProgress, newCompleted);

    await persistTaskStatus(task, newInProgress, newCompleted, {
      inProgress: prevInProgress,
      completed: prevCompleted
    });
  };

  // ── Filtering & Rendering ──────────────────────────────────
  let filtered = [...tasks];

  if (viewMode === 'list') {
    if (listFilter === 'active') filtered = filtered.filter(t => !t.completed);
    if (listFilter === 'completed') filtered = filtered.filter(t => t.completed);
  }

  if (sortByDeadline) {
    filtered.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }

  const todoTasks       = filtered.filter(t => !t.inProgress && !t.in_progress && !t.completed);
  const inProgressTasks = filtered.filter(t => (t.inProgress || t.in_progress) && !t.completed);
  const completedTasks  = filtered.filter(t => t.completed);

  const renderPriorityTag = (priority) => {
    let colorClass = 'prio-medium';
    let emoji = '🟡';
    if (priority === 'High') { colorClass = 'prio-high'; emoji = '🔴'; }
    if (priority === 'Low') { colorClass = 'prio-low'; emoji = '🟢'; }
    return <span className={`priority-tag ${colorClass}`}>{emoji} {priority || 'Medium'}</span>;
  };

  const renderTask = (task) => {
    const isEditing = editTaskId === task.id;
    const dlStatus = getDeadlineStatus(task.deadline);
    return (
      <li key={task.id} draggable={viewMode === 'board'} onDragStart={() => handleDragStart(task.id)}
        className={`draggable-task ${!task.completed && dlStatus === 'overdue' ? 'task-overdue' : ''} ${!task.completed && dlStatus === 'soon' ? 'task-due-soon' : ''}`}
      >
        {isEditing ? (
          <div className="edit-section">
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Task label" />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows="2" />
            <div className="edit-row">
              <select className="priority-select" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
              <input
                type="datetime-local"
                className="deadline-input"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-primary" onClick={() => saveEdit(task.id)}>Save Changes</button>
              <button className="control-btn" onClick={() => { setEditTaskId(null); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="task-item">
            {viewMode === 'board' && <div className="drag-handle" title="Drag to move">⣿</div>}

            <div className="task-item-header">
              <label className="task-checkbox-container">
                <input type="checkbox" checked={Boolean(task.completed)} onChange={() => toggleTask(task.id)} />
                <div className="custom-checkbox"></div>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={`task-title ${task.completed ? 'task-done' : ''}`}>{task.text}</span>
                {!task.completed && renderPriorityTag(task.priority)}
              </div>
            </div>

            {task.description && <p className={`task-desc ${task.completed ? 'task-done' : ''}`}>{task.description}</p>}

            {renderDeadlineBadge(task.deadline, task.completed)}

            <div className="task-meta">
              <span className="task-timestamp">
                ⏱ {formatTimestamp(task.created_at)}
              </span>
              <div className="task-actions">
                <button className="btn-icon" onClick={() => startEditing(task)} title="Edit">✎</button>
                <button className="btn-icon delete" onClick={() => deleteTask(task.id)} title="Delete">✕</button>
              </div>
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
        {colTasks.length === 0 && <li className="empty-drop-hint">Drop tasks here</li>}
        {colTasks.map(task => renderTask(task))}
      </ul>
    </div>
  );

  return (
    <div className="todo-container">
      {/* ── Top Header & Controls ── */}
      <div className="todo-header-area">
        <div>
          <h1>Your Tasks</h1>
          <div className="task-timestamp" style={{ marginTop: '4px', fontSize: '13px' }}>{dateStr} • {timeStr}</div>
        </div>

        <div className="board-controls">
          <div className="view-group">
            <button className={`control-btn ${viewMode === 'board' ? 'active' : ''}`} onClick={() => setViewMode('board')}>Board View</button>
            <button className={`control-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List View</button>
          </div>

          <button
            className={`control-btn ${sortByDeadline ? 'active' : ''}`}
            onClick={() => setSortByDeadline(prev => !prev)}
            title="Sort tasks by deadline (closest first)"
          >
            📅 Sort by Deadline
          </button>

          {viewMode === 'list' && (
            <div className="filter-group">
              <button className={`control-btn ${listFilter === 'all' ? 'active' : ''}`} onClick={() => setListFilter('all')}>All</button>
              <button className={`control-btn ${listFilter === 'active' ? 'active' : ''}`} onClick={() => setListFilter('active')}>Active</button>
              <button className={`control-btn ${listFilter === 'completed' ? 'active' : ''}`} onClick={() => setListFilter('completed')}>Completed</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Google Calendar Sync Bar ── */}
      {gcalStatus.configured && (
        <div className="gcal-bar">
          <span className="gcal-label">📆 Google Calendar</span>
          {gcalStatus.connected ? (
            <button className="btn-gcal-sync" onClick={syncToGoogleCalendar} disabled={syncing}>
              {syncing ? '⏳ Syncing...' : '☁️ Sync Tasks to Calendar'}
            </button>
          ) : (
            <button className="btn-gcal-connect" onClick={connectGoogleCalendar}>
              🔗 Connect Google Calendar
            </button>
          )}
          {syncMsg && <span className="gcal-msg">{syncMsg}</span>}
        </div>
      )}

      {/* ── Task Input ── */}
      <div className="input-section">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1.5 }}
        />
        <input
          type="text"
          placeholder="Details (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <select
          className="priority-select"
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
        >
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
        <input
          type="datetime-local"
          className="deadline-input"
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
          title="Set deadline (optional)"
        />
        <button className="btn-primary" onClick={addTask}>Create Task</button>
      </div>

      {/* ── View Rendering ── */}
      {viewMode === 'board' ? (
        <div className="task-box-container">
          {renderColumn('TODO', todoTasks, COLUMN.TODO, '📋')}
          {renderColumn('IN PROGRESS', inProgressTasks, COLUMN.IN_PROGRESS, '⚙️')}
          {renderColumn('COMPLETED', completedTasks, COLUMN.COMPLETED, '✅')}
        </div>
      ) : (
        <div className="list-view-container">
          <ul className="task-list">
            {filtered.length === 0 ? (
              <li className="empty-state">No tasks found.</li>
            ) : (
              filtered.map(task => renderTask(task))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TodoBoard;
