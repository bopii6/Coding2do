import React, { useState, useEffect, useCallback } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';
import AuthModal from './components/AuthModal';
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

    setTasks([newTask, ...tasks]);
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-50 overflow-hidden selection:bg-fuchsia-500/20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050617] via-[#040414] to-black" />
      <div className="pointer-events-none absolute -top-32 -right-20 h-[28rem] w-[28rem] bg-fuchsia-600/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-24 h-[24rem] w-[24rem] bg-sky-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Desktop: always visible, Mobile: drawer */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
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

        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          {/* Mobile Header with Hamburger */}
          <div className="lg:hidden sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <h2 className="text-lg font-semibold text-white truncate">
              {activeProjectName}
            </h2>

            {isSupabaseConfigured() && user && (
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-10">
            <div className="w-full max-w-3xl xl:max-w-4xl space-y-10">
              <header className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Active project</p>
                    <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-fuchsia-400 via-purple-400 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_20px_60px_rgba(236,72,153,0.25)]">
                      {activeProjectName}
                    </h1>
                    <p className="text-slate-400 mt-3 max-w-xl">
                      Capture ideas while the AI works. Promote them to production when you're ready.
                    </p>
                  </div>

                  {isSupabaseConfigured() && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {user ? (
                        <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-xl">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-[0.3em]">Synced</span>
                            <span className="text-sm text-white">{user.email}</span>
                          </div>
                          <button
                            onClick={handleSignOut}
                            className="p-2 text-slate-300 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                            title="Sign out"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAuth(true)}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-400 hover:to-purple-400 rounded-2xl transition-colors text-sm font-semibold shadow-lg w-full sm:w-auto justify-center"
                        >
                          <User className="w-4 h-4" />
                          Sign In
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Ideas queued', value: activeTasks.length },
                    { label: 'Projects', value: projects.length },
                    { label: 'Shipped', value: history.length },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3 shadow-[0_10px_40px_rgba(2,6,23,0.5)]"
                    >
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{stat.label}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                  ))}
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
