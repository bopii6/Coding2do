import React, { useState, useEffect } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';
import AuthModal from './components/AuthModal';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LogOut, User, Cloud, Menu, X } from 'lucide-react';

const DEFAULT_PROJECT_ID = 'default';

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(DEFAULT_PROJECT_ID);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  }, []);

  // Load data from localStorage (fallback)
  const loadFromLocalStorage = () => {
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
  };

  // Load data from Supabase
  const loadFromSupabase = async (userId) => {
    setSyncing(true);
    try {
      const [projectsRes, tasksRes, historyRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('history').select('*').eq('user_id', userId).order('completed_at', { ascending: false })
      ]);

      if (projectsRes.data && projectsRes.data.length > 0) {
        setProjects(projectsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at
        })));
        setActiveProjectId(projectsRes.data[0].id);
      } else {
        // Create default project
        const { data: newProject } = await supabase.from('projects').insert({
          id: DEFAULT_PROJECT_ID,
          name: 'Default Project',
          user_id: userId
        }).select().single();

        setProjects([{ id: newProject.id, name: newProject.name, createdAt: newProject.created_at }]);
        setActiveProjectId(newProject.id);
      }

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
    } finally {
      setSyncing(false);
    }
  };

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

    const { completedAt, ...rest } = taskToRestore;

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
    <div className="min-h-screen bg-slate-900 text-slate-50 flex selection:bg-purple-500/30">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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
        <div className="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <h2 className="text-lg font-semibold text-slate-200 truncate">
            {activeProjectName}
          </h2>

          {isSupabaseConfigured() && user && (
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-2xl">
            <header className="mb-8 lg:mb-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  <span className="hidden lg:inline">{activeProjectName}</span>
                  <span className="lg:hidden">Coding Queue</span>
                </h1>

                {isSupabaseConfigured() && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {user ? (
                      <div className="hidden lg:flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Cloud className="w-4 h-4 text-green-400" />
                          <span className="hidden xl:inline">{user.email}</span>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Sign out"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAuth(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-sm w-full sm:w-auto justify-center"
                      >
                        <User className="w-4 h-4" />
                        Sign In
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-center text-sm sm:text-base">Capture ideas while the AI works.</p>
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
  );
}

export default App;
