import React, { useState, useEffect, useCallback } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import useAudioCue from './lib/useAudioCue';
import { LogOut, User, Menu, X } from 'lucide-react';

const DEFAULT_PROJECT_ID = 'default';
const PRIORITY_LEVELS = ['later', 'now'];
const DEFAULT_PRIORITY = 'now';

const normalizePriority = (value) => (PRIORITY_LEVELS.includes(value) ? value : DEFAULT_PRIORITY);
const priorityToWeight = (priority) => {
  const normalized = normalizePriority(priority);
  if (normalized === 'now') return 1;
  return 0;
};
const weightToPriority = (weight) => {
  if (weight > 0) return 'now';
  return 'later';
};
const shiftPriority = (current, direction) => {
  const index = PRIORITY_LEVELS.indexOf(normalizePriority(current));
  if (direction === 'up' && index < PRIORITY_LEVELS.length - 1) return PRIORITY_LEVELS[index + 1];
  if (direction === 'down' && index > 0) return PRIORITY_LEVELS[index - 1];
  return PRIORITY_LEVELS[index];
};
const sortByPriority = (items) => {
  return [...items].sort((a, b) => {
    const diff = priorityToWeight(b.priority) - priorityToWeight(a.priority);
    if (diff !== 0) return diff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};
const hydrateTask = (task) => ({
  ...task,
  priority: normalizePriority(task.priority ?? weightToPriority(task.priority_weight ?? 0)),
});
const hydrateHistoryItem = (item) => ({
  ...item,
  priority: normalizePriority(item.priority ?? weightToPriority(item.priority_weight ?? 0)),
});

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(DEFAULT_PROJECT_ID);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const playAudioCue = useAudioCue();

  // Load data from localStorage (fallback)
  const loadFromLocalStorage = useCallback(() => {
    const savedProjects = localStorage.getItem('coding-todo-projects');
    const savedTasks = localStorage.getItem('coding-todo-tasks');
    const savedHistory = localStorage.getItem('coding-todo-history');
    const savedActiveProject = localStorage.getItem('coding-todo-active-project');

    setProjects(savedProjects ? JSON.parse(savedProjects) : [
      { id: DEFAULT_PROJECT_ID, name: 'Default Project', createdAt: new Date().toISOString() }
    ]);
    setTasks(savedTasks ? JSON.parse(savedTasks).map(hydrateTask) : []);
    setHistory(savedHistory ? JSON.parse(savedHistory).map(hydrateHistoryItem) : []);
    setActiveProjectId(savedActiveProject || DEFAULT_PROJECT_ID);
  }, []);

  // Load data from Supabase
  const loadFromSupabase = useCallback(async (userId) => {
    if (!supabase || !userId) {
      loadFromLocalStorage();
      return;
    }

    try {
      const [projectsRes, tasksRes, historyRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('history').select('*').eq('user_id', userId).order('completed_at', { ascending: false })
      ]);

      const firstError = [projectsRes, tasksRes, historyRes].find(res => res.error);
      if (firstError?.error) {
        throw firstError.error;
      }

      let normalizedProjects = [];
      if (projectsRes.data && projectsRes.data.length > 0) {
        normalizedProjects = projectsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at
        }));
      } else {
        // Create default project for new Supabase users with a proper UUID
        const defaultProject = {
          id: crypto.randomUUID(),
          name: 'Default Project',
          user_id: userId
        };

        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert(defaultProject)
          .select()
          .single();

        if (insertError || !newProject) {
          throw insertError || new Error('Failed to create default project');
        }

        normalizedProjects = [{
          id: newProject.id,
          name: newProject.name,
          createdAt: newProject.created_at
        }];
      }

      setProjects(normalizedProjects);

      const savedActiveProject = localStorage.getItem('coding-todo-active-project');
      const projectExists = normalizedProjects.find(p => p.id === savedActiveProject);

      setActiveProjectId(projectExists ? savedActiveProject : (normalizedProjects[0]?.id || DEFAULT_PROJECT_ID));

      setTasks(tasksRes.data?.map(t => hydrateTask({
        id: t.id,
        text: t.text,
        projectId: t.project_id,
        createdAt: t.created_at,
        priority_weight: t.priority_weight
      })) || []);

      setHistory(historyRes.data?.map(h => hydrateHistoryItem({
        id: h.id,
        text: h.text,
        projectId: h.project_id,
        createdAt: h.created_at,
        completedAt: h.completed_at,
        priority_weight: h.priority_weight
      })) || []);
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      loadFromLocalStorage();
    }
  }, [loadFromLocalStorage]);

  // Check if user is logged in
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      loadFromLocalStorage();
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadFromSupabase(session.user.id);
      } else {
        loadFromLocalStorage();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadFromSupabase(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadFromLocalStorage, loadFromSupabase]);

  // Sync to localStorage (fallback)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('coding-todo-projects', JSON.stringify(projects));
      localStorage.setItem('coding-todo-tasks', JSON.stringify(tasks));
      localStorage.setItem('coding-todo-history', JSON.stringify(history));
    }
  }, [projects, tasks, history, user]);

  // Always sync active project to localStorage
  useEffect(() => {
    localStorage.setItem('coding-todo-active-project', activeProjectId);
  }, [activeProjectId]);

  // Auth handlers
  const handleAuth = async (email, password, isLogin) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) throw error;

    setShowAuth(false);
    if (data.user) {
      await loadFromSupabase(data.user.id);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    loadFromLocalStorage();
  };

  // Project actions
  const addProject = async (name) => {
    const newProject = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };

    if (user && isSupabaseConfigured()) {
      await supabase.from('projects').insert({
        id: newProject.id,
        name: newProject.name,
        user_id: user.id
      });
    }

    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    playAudioCue('add');
  };

  const deleteProject = async (id) => {
    if (projects.length <= 1) return;

    if (user && isSupabaseConfigured()) {
      await supabase.from('projects').delete().eq('id', id);
    }

    setProjects(projects.filter(p => p.id !== id));
    setTasks(tasks.filter(t => t.projectId !== id));
    setHistory(history.filter(t => t.projectId !== id));

    if (activeProjectId === id) {
      setActiveProjectId(projects[0].id);
    }
    playAudioCue('delete');
  };

  const renameProject = async (id, newName) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('projects').update({ name: newName }).eq('id', id);
    }
    setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // Task actions
  const addTask = async (text, priority = DEFAULT_PRIORITY) => {
    const newTask = {
      id: crypto.randomUUID(),
      text,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      priority: normalizePriority(priority),
    };

    if (user && isSupabaseConfigured()) {
      await supabase.from('tasks').insert({
        id: newTask.id,
        text: newTask.text,
        project_id: newTask.projectId,
        user_id: user.id,
        priority_weight: priorityToWeight(newTask.priority)
      });
    }

    setTasks([...tasks, newTask]);
    playAudioCue('add');
  };

  const completeTask = async (id) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (!taskToComplete) return;

    const historyItem = { ...taskToComplete, completedAt: new Date().toISOString() };

    if (user && isSupabaseConfigured()) {
      await Promise.all([
        supabase.from('tasks').delete().eq('id', id),
        supabase.from('history').insert({
          id: historyItem.id,
          text: historyItem.text,
          project_id: historyItem.projectId,
          completed_at: historyItem.completedAt,
          user_id: user.id,
          priority_weight: priorityToWeight(historyItem.priority)
        })
      ]);
    }

    setTasks(tasks.filter(t => t.id !== id));
    setHistory([historyItem, ...history]);
    playAudioCue('complete');
  };

  const editTask = async (id, newText) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('tasks').update({ text: newText }).eq('id', id);
    }
    setTasks(tasks.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const deleteTask = async (id) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('tasks').delete().eq('id', id);
    }
    setTasks(tasks.filter(t => t.id !== id));
    playAudioCue('delete');
  };

  const deleteHistoryItem = async (id) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('history').delete().eq('id', id);
    }
    setHistory(history.filter(t => t.id !== id));
    playAudioCue('delete');
  };

  const restoreTask = async (id) => {
    const taskToRestore = history.find(t => t.id === id);
    if (!taskToRestore) return;

    const { completedAt: _completedAt, ...rest } = taskToRestore;

    if (user && isSupabaseConfigured()) {
      await Promise.all([
        supabase.from('history').delete().eq('id', id),
        supabase.from('tasks').insert({
          id: rest.id,
          text: rest.text,
          project_id: rest.projectId,
          user_id: user.id,
          priority_weight: priorityToWeight(rest.priority)
        })
      ]);
    }

    setHistory(history.filter(t => t.id !== id));
    setTasks([rest, ...tasks]);
    playAudioCue('restore');
  };

  const changeTaskPriority = async (id, direction) => {
    let updatedPriority = null;
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const nextPriority = shiftPriority(task.priority, direction);
      updatedPriority = nextPriority;
      return { ...task, priority: nextPriority };
    }));

    playAudioCue(direction === 'up' ? 'add' : 'delete');

    if (updatedPriority !== null && user && isSupabaseConfigured()) {
      await supabase.from('tasks').update({ priority_weight: priorityToWeight(updatedPriority) }).eq('id', id);
    }
  };

  const setTaskPriority = async (id, newPriority) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      return { ...task, priority: newPriority };
    }));

    playAudioCue('add');

    if (user && isSupabaseConfigured()) {
      await supabase.from('tasks').update({ priority_weight: priorityToWeight(newPriority) }).eq('id', id);
    }
  };

  const copyTask = (text) => {
    navigator.clipboard.writeText(text);
    playAudioCue('copy');
  };

  const activeTasks = sortByPriority(tasks.filter(t => t.projectId === activeProjectId));
  const activeHistory = sortByPriority(history.filter(t => t.projectId === activeProjectId));
  const activeProjectName = projects.find(p => p.id === activeProjectId)?.name || 'Project';

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  // ... (existing code)

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-indigo-200 dark:selection:bg-indigo-500/30 transition-colors duration-300">
      {/* Subtle Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#020617] dark:to-[#020617]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

      <div className="relative z-10 flex min-h-screen">
        {/* Mobile Menu Overlay */}
        {(mobileMenuOpen || (sidebarOpen && window.innerWidth < 1024)) && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => {
              setMobileMenuOpen(false);
              setSidebarOpen(false);
            }}
          />
        )}

        {/* Sidebar - Desktop: collapsible, Mobile: drawer */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarOpen ? 'lg:w-72 lg:translate-x-0' : 'lg:w-0 lg:overflow-hidden'}
          bg-slate-50 dark:bg-[#020617] border-r border-slate-200 dark:border-white/5
        `}>
          <div className="w-64 lg:w-72 h-full">
            <ProjectSidebar
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                setMobileMenuOpen(false);
              }}
              onAddProject={addProject}
              onDeleteProject={deleteProject}
              onRenameProject={renameProject}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300">
          {/* Mobile Header with Hamburger */}
          <div className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {activeProjectName}
            </h2>

            {isSupabaseConfigured() && user && (
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center p-4 sm:p-8 lg:p-12">
            <div className="w-full max-w-3xl space-y-8">
              <header className="space-y-2 mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden lg:flex p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title={sidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        {activeProjectName}
                      </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                      专注重要之事。
                    </p>
                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500 transition-all duration-500 ease-out"
                          style={{
                            width: `${(activeTasks.length + activeHistory.length) > 0
                              ? (activeHistory.length / (activeTasks.length + activeHistory.length)) * 100
                              : 0
                              }%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[3rem] text-right">
                        {activeHistory.length} / {activeTasks.length + activeHistory.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {isSupabaseConfigured() && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {user ? (
                          <div
                            className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.05] transition-colors"
                            onClick={async () => {
                              const newName = prompt('请输入您的昵称:', user.user_metadata?.full_name || '');
                              if (newName) {
                                const { data, error } = await supabase.auth.updateUser({
                                  data: { full_name: newName }
                                });
                                if (!error) {
                                  setUser(data.user);
                                }
                              }
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                              {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {user.user_metadata?.full_name || user.email.split('@')[0]}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSignOut();
                              }}
                              className="ml-2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                              title="退出登录"
                            >
                              <LogOut className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAuth(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-white/5 w-full sm:w-auto justify-center"
                          >
                            <User className="w-4 h-4" />
                            登录
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <TaskInput onAdd={addTask} />

              <TaskList
                tasks={activeTasks}
                onComplete={completeTask}
                onEdit={editTask}
                onDelete={deleteTask}
                onCopy={copyTask}
                onPromotePriority={(id) => changeTaskPriority(id, 'up')}
                onCalmPriority={(id) => changeTaskPriority(id, 'down')}
                onSetPriority={setTaskPriority}
              />

              <HistoryView
                history={activeHistory}
                onRestore={restoreTask}
                onDelete={deleteHistoryItem}
              />
            </div>
          </div>
        </div>

        {showAuth && (
          <AuthModal
            onAuth={handleAuth}
            onClose={() => setShowAuth(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
