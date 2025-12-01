import React, { useState, useEffect, useCallback } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LogOut, User, Menu, X } from 'lucide-react';

const DEFAULT_PROJECT_ID = 'default';

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

  // Load data from localStorage (fallback)
  const loadFromLocalStorage = useCallback(() => {
    const savedProjects = localStorage.getItem('coding-todo-projects');
    const savedTasks = localStorage.getItem('coding-todo-tasks');
    const savedHistory = localStorage.getItem('coding-todo-history');
    const savedActiveProject = localStorage.getItem('coding-todo-active-project');

    setProjects(savedProjects ? JSON.parse(savedProjects) : [
      { id: DEFAULT_PROJECT_ID, name: 'Default Project', createdAt: new Date().toISOString() }
    ]);
    setTasks(savedTasks ? JSON.parse(savedTasks) : []);
    setHistory(savedHistory ? JSON.parse(savedHistory) : []);
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
      setActiveProjectId(normalizedProjects[0]?.id || DEFAULT_PROJECT_ID);

      setTasks(tasksRes.data?.map(t => ({
        id: t.id,
        text: t.text,
        projectId: t.project_id,
        createdAt: t.created_at
      })) || []);

      setHistory(historyRes.data?.map(h => ({
        id: h.id,
        text: h.text,
        projectId: h.project_id,
        createdAt: h.created_at,
        completedAt: h.completed_at
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
      localStorage.setItem('coding-todo-active-project', activeProjectId);
    }
  }, [projects, tasks, history, activeProjectId, user]);

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
  };

  const renameProject = async (id, newName) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('projects').update({ name: newName }).eq('id', id);
    }
    setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // Task actions
  const addTask = async (text) => {
    const newTask = {
      id: crypto.randomUUID(),
      text,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
    };

    if (user && isSupabaseConfigured()) {
      await supabase.from('tasks').insert({
        id: newTask.id,
        text: newTask.text,
        project_id: newTask.projectId,
        user_id: user.id
      });
    }

    setTasks([...tasks, newTask]);
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
          user_id: user.id
        })
      ]);
    }

    setTasks(tasks.filter(t => t.id !== id));
    setHistory([historyItem, ...history]);
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
  };

  const deleteHistoryItem = async (id) => {
    if (user && isSupabaseConfigured()) {
      await supabase.from('history').delete().eq('id', id);
    }
    setHistory(history.filter(t => t.id !== id));
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
          user_id: user.id
        })
      ]);
    }

    setHistory(history.filter(t => t.id !== id));
    setTasks([rest, ...tasks]);
  };

  const copyTask = (text) => {
    navigator.clipboard.writeText(text);
  };

  const activeTasks = tasks.filter(t => t.projectId === activeProjectId);
  const activeHistory = history.filter(t => t.projectId === activeProjectId);
  const activeProjectName = projects.find(p => p.id === activeProjectId)?.name || 'Project';

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
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
                title="Sign out"
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
                        title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        {activeProjectName}
                      </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
                      Focus on what matters.
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
                          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-xs text-slate-400">{user.email}</span>
                            <button
                              onClick={handleSignOut}
                              className="ml-2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                              title="Sign out"
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
                            Sign In
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
                setTasks={(newOrder) => {
                  const otherTasks = tasks.filter(t => t.projectId !== activeProjectId);
                  setTasks([...newOrder, ...otherTasks]);
                }}
                onComplete={completeTask}
                onEdit={editTask}
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
