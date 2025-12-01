import React, { useState, useEffect } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';

const DEFAULT_PROJECT_ID = 'default';

function App() {
  // --- State Initialization ---
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('coding-todo-projects');
    if (saved) return JSON.parse(saved);
    // Migration: If no projects exist, create default
    return [{ id: DEFAULT_PROJECT_ID, name: 'Default Project', createdAt: new Date().toISOString() }];
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    const saved = localStorage.getItem('coding-todo-active-project');
    return saved || DEFAULT_PROJECT_ID;
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('coding-todo-tasks');
    let loadedTasks = saved ? JSON.parse(saved) : [];

    // Migration: Assign orphan tasks to default project
    const hasOrphans = loadedTasks.some(t => !t.projectId);
    if (hasOrphans) {
      loadedTasks = loadedTasks.map(t => t.projectId ? t : { ...t, projectId: DEFAULT_PROJECT_ID });
    }
    return loadedTasks;
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('coding-todo-history');
    let loadedHistory = saved ? JSON.parse(saved) : [];

    // Migration: Assign orphan history to default project
    const hasOrphans = loadedHistory.some(t => !t.projectId);
    if (hasOrphans) {
      loadedHistory = loadedHistory.map(t => t.projectId ? t : { ...t, projectId: DEFAULT_PROJECT_ID });
    }
    return loadedHistory;
  });

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('coding-todo-projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('coding-todo-active-project', activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem('coding-todo-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('coding-todo-history', JSON.stringify(history));
  }, [history]);

  // --- Project Actions ---
  const addProject = (name) => {
    const newProject = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
  };

  const deleteProject = (id) => {
    if (projects.length <= 1) return; // Prevent deleting last project

    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    setHistory(history.filter(t => t.projectId !== id));

    if (activeProjectId === id) {
      setActiveProjectId(projects[0].id);
    }
  };

  const renameProject = (id, newName) => {
    setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // --- Task Actions ---
  const addTask = (text) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
  };

  const completeTask = (id) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (taskToComplete) {
      setTasks(tasks.filter(t => t.id !== id));
      setHistory([{ ...taskToComplete, completedAt: new Date().toISOString() }, ...history]);
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const deleteHistoryItem = (id) => {
    setHistory(history.filter(t => t.id !== id));
  };

  const restoreTask = (id) => {
    const taskToRestore = history.find(t => t.id === id);
    if (taskToRestore) {
      setHistory(history.filter(t => t.id !== id));
      const { completedAt, ...rest } = taskToRestore;
      setTasks([rest, ...tasks]);
    }
  };

  const copyTask = (text) => {
    navigator.clipboard.writeText(text);
  };

  // --- Filtering ---
  const activeTasks = tasks.filter(t => t.projectId === activeProjectId);
  const activeHistory = history.filter(t => t.projectId === activeProjectId);
  const activeProjectName = projects.find(p => p.id === activeProjectId)?.name || 'Project';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex selection:bg-purple-500/30">
      <ProjectSidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={addProject}
        onDeleteProject={deleteProject}
        onRenameProject={renameProject}
      />

      <div className="flex-1 flex flex-col items-center p-8 h-screen overflow-y-auto">
        <div className="w-full max-w-2xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
              {activeProjectName}
            </h1>
            <p className="text-slate-400">Capture ideas while the AI works.</p>
          </header>

          <TaskInput onAdd={addTask} />

          <TaskList
            tasks={activeTasks}
            setTasks={(newOrder) => {
              // Reorder needs to respect the global list
              // This is tricky with filtering. 
              // Simple approach: Remove active tasks from global, then append new order.
              // BUT framer-motion reorder returns the reordered subset.

              // Correct approach for filtered reorder:
              // 1. Get all other tasks
              const otherTasks = tasks.filter(t => t.projectId !== activeProjectId);
              // 2. Combine
              setTasks([...newOrder, ...otherTasks]);
            }}
            onComplete={completeTask}
            onDelete={deleteTask}
            onCopy={copyTask}
          />

          <HistoryView
            history={activeHistory}
            onRestore={restoreTask}
            onDelete={deleteHistoryItem}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
