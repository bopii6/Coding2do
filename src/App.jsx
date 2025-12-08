import React, { useState, useEffect, useCallback } from 'react';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import ProjectSidebar from './components/ProjectSidebar';
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';
import PriorityFilter from './components/PriorityFilter';
import { ToastContainer, useToast } from './components/Toast';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import useAudioCue from './lib/useAudioCue';
import { LogOut, User, Menu, X } from 'lucide-react';

// 获取或创建默认项目ID（使用有效的UUID）
const getDefaultProjectId = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return crypto.randomUUID();
  }
  let defaultId = window.localStorage.getItem('coding-todo-default-project-id');
  if (!defaultId) {
    defaultId = crypto.randomUUID();
    window.localStorage.setItem('coding-todo-default-project-id', defaultId);
  }
  return defaultId;
};

const PRIORITY_LEVELS = ['later', 'now'];
const DEFAULT_PRIORITY = 'later';

// 增加移动端和 PWA 的认证超时时间，给 session 恢复更多时间
const SUPABASE_AUTH_TIMEOUT = 30000; // 30秒，给移动端更多时间
const normalizePriority = (value) => (PRIORITY_LEVELS.includes(value) ? value : DEFAULT_PRIORITY);
const priorityToWeight = (priority) => {
  const normalized = normalizePriority(priority);
  if (normalized === 'now') return 1;
  if (normalized === 'later') return -1;
  return -1; // default to 'later'
};
const weightToPriority = (weight) => {
  if (weight > 0) return 'now';
  if (weight < 0) return 'later';
  return 'later'; // default to 'later'
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

const createDefaultProjectList = () => ([
  { id: getDefaultProjectId(), name: 'Default Project', createdAt: new Date().toISOString() }
]);

const safeParseStoredArray = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    console.warn(`Stored value for "${key}" is not an array, ignoring.`);
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
  }
  window.localStorage.removeItem(key);
  return null;
};

const getStoredArrayWithBackup = (primaryKey, backupKey, fallbackFactory) => {
  const primary = safeParseStoredArray(primaryKey);
  if (primary !== null) return primary;
  if (backupKey) {
    const backup = safeParseStoredArray(backupKey);
    if (backup !== null) return backup;
  }
  return fallbackFactory();
};

const getLocalStorageSnapshot = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    const defaultProjects = createDefaultProjectList();
    return {
      projects: defaultProjects,
      tasks: [],
      history: [],
      activeProjectId: defaultProjects[0].id,
    };
  }

  const projects = getStoredArrayWithBackup(
    'coding-todo-projects',
    'coding-todo-backup-projects',
    createDefaultProjectList
  );

  const rawTasks = getStoredArrayWithBackup(
    'coding-todo-tasks',
    'coding-todo-backup-tasks',
    () => []
  );

  const rawHistory = getStoredArrayWithBackup(
    'coding-todo-history',
    'coding-todo-backup-history',
    () => []
  );

  const activeProjectId = window.localStorage.getItem('coding-todo-active-project') || projects[0]?.id || getDefaultProjectId();

  return {
    projects,
    tasks: rawTasks.map(hydrateTask),
    history: rawHistory.map(hydrateHistoryItem),
    activeProjectId,
  };
};

const PENDING_PROJECTS_KEY = 'coding-todo-pending-projects';
const PENDING_TASKS_KEY = 'coding-todo-pending-tasks';

const readArrayFromStorage = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to parse storage array for ${key}:`, error);
    window.localStorage.removeItem(key);
    return [];
  }
};

const appendToStorageArray = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const existing = readArrayFromStorage(key);
  window.localStorage.setItem(key, JSON.stringify([...existing, value]));
};

const clearStorageKey = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(key);
};

const getPendingProjects = () => readArrayFromStorage(PENDING_PROJECTS_KEY);
const getPendingTasks = () => readArrayFromStorage(PENDING_TASKS_KEY);
const queuePendingProject = (project) => appendToStorageArray(PENDING_PROJECTS_KEY, project);
const queuePendingTask = (task) => appendToStorageArray(PENDING_TASKS_KEY, task);

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(getDefaultProjectId());
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'now', 'later'
  const playAudioCue = useAudioCue();
  const { toasts, success, error, warning, removeToast } = useToast();

  // Load data from localStorage (fallback)
  const loadFromLocalStorage = useCallback(() => {
    const snapshot = getLocalStorageSnapshot();
    setProjects(snapshot.projects);
    setTasks(snapshot.tasks);
    setHistory(snapshot.history);
    setActiveProjectId(snapshot.activeProjectId);
  }, []);

  // Load data from Supabase
  const loadFromSupabase = useCallback(async (userId) => {
    console.log('[loadFromSupabase] 开始加载, userId:', userId);

    if (!supabase || !userId) {
      console.log('[loadFromSupabase] supabase 或 userId 无效，使用本地数据');
      loadFromLocalStorage();
      return;
    }

    try {
      console.log('[loadFromSupabase] 查询 Supabase...');
      const startTime = Date.now();

      // 添加超时保护，防止查询卡住
      const queryTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('数据库查询超时 (15秒)')), 15000)
      );

      const queryPromise = Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('history').select('*').eq('user_id', userId).order('completed_at', { ascending: false })
      ]);

      const [projectsRes, tasksRes, historyRes] = await Promise.race([queryPromise, queryTimeout]);

      console.log(`[loadFromSupabase] 查询完成，耗时 ${Date.now() - startTime}ms`, {
        projectsCount: projectsRes.data?.length ?? 0,
        tasksCount: tasksRes.data?.length ?? 0,
        historyCount: historyRes.data?.length ?? 0,
        projectsError: projectsRes.error?.message,
        tasksError: tasksRes.error?.message,
        historyError: historyRes.error?.message
      });

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
        console.log('[loadFromSupabase] 加载了项目:', normalizedProjects.map(p => p.name));
      } else {
        console.log('[loadFromSupabase] 无项目，创建默认项目...');
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
        console.log('[loadFromSupabase] 创建了默认项目');
      }

      setProjects(normalizedProjects);

      const savedActiveProject = localStorage.getItem('coding-todo-active-project');
      const projectExists = normalizedProjects.find(p => p.id === savedActiveProject);

      setActiveProjectId(projectExists ? savedActiveProject : normalizedProjects[0]?.id);

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

      console.log('[loadFromSupabase] 完成！');
    } catch (error) {
      console.error('[loadFromSupabase] 错误:', error);
      // 加载失败时，只有在没有现有数据时才从本地加载
      // 避免覆盖已经加载的数据
      console.log('[loadFromSupabase] 保持现有数据（如果有）');
    }
  }, [loadFromLocalStorage]);

  // Check if user is logged in
  useEffect(() => {
    console.log('=== [Auth] useEffect 启动 ===');

    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase 未配置，使用本地模式');
      loadFromLocalStorage();
      setLoading(false);
      return;
    }

    let isMounted = true;
    let hasInitialized = false; // 标记是否已经初始化完成

    console.log('[Auth] 开始监听 onAuthStateChange...');

    // 简化的初始化：使用 onAuthStateChange 作为主要的认证检测方式
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] 收到事件: ${event}`, {
        hasSession: !!session,
        userEmail: session?.user?.email,
        isMounted,
        hasInitialized
      });

      if (!isMounted) {
        console.log('[Auth] 组件已卸载，忽略事件');
        return;
      }

      if (event === 'INITIAL_SESSION') {
        console.log('[Auth] 处理 INITIAL_SESSION...');
        hasInitialized = true;

        if (session?.user) {
          console.log('[Auth] 发现已登录用户，开始加载数据...');
          setUser(session.user);
          try {
            console.log('[Auth] 调用 loadFromSupabase...');
            const startTime = Date.now();
            await loadFromSupabase(session.user.id);
            console.log(`[Auth] loadFromSupabase 完成，耗时 ${Date.now() - startTime}ms`);
          } catch (err) {
            console.error('[Auth] loadFromSupabase 失败:', err);
            loadFromLocalStorage();
          }
          setShowAuth(false);
        } else {
          console.log('[Auth] 无 session，尝试 getSession...');
          try {
            const { data, error } = await supabase.auth.getSession();
            console.log('[Auth] getSession 结果:', { hasSession: !!data?.session, error });

            if (data?.session?.user) {
              setUser(data.session.user);
              await loadFromSupabase(data.session.user.id);
              setShowAuth(false);
            } else {
              console.log('[Auth] 无有效 session，使用本地模式');
              loadFromLocalStorage();
              setShowAuth(false);
            }
          } catch (err) {
            console.error('[Auth] getSession 失败:', err);
            loadFromLocalStorage();
            setShowAuth(false);
          }
        }
        console.log('[Auth] INITIAL_SESSION 处理完成，设置 loading=false');
        setLoading(false);

      } else if (event === 'SIGNED_IN') {
        console.log('[Auth] 处理 SIGNED_IN...', { hasInitialized });

        // 如果已经初始化过了，跳过重复的 SIGNED_IN 事件（可能是 token 刷新触发的）
        if (hasInitialized) {
          console.log('[Auth] 已经初始化过，跳过重复的 SIGNED_IN');
          setUser(session.user); // 只更新用户状态
          return;
        }

        hasInitialized = true;
        setUser(session.user);
        try {
          console.log('[Auth] SIGNED_IN: 调用 loadFromSupabase...');
          await loadFromSupabase(session.user.id);
          console.log('[Auth] SIGNED_IN: loadFromSupabase 完成');
        } catch (err) {
          console.error('[Auth] SIGNED_IN: loadFromSupabase 失败:', err);
        }
        setShowAuth(false);
        setLoading(false);

      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] 处理 SIGNED_OUT...');
        setUser(null);
        loadFromLocalStorage();
        setShowAuth(true);
        setLoading(false);

      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token 刷新成功');
      } else {
        console.log(`[Auth] 未处理的事件: ${event}`);
      }
    });

    // 设置一个备用超时，防止 onAuthStateChange 不触发
    const fallbackTimeout = setTimeout(() => {
      console.log('[Auth] 超时检查:', { isMounted, hasInitialized });
      if (isMounted && !hasInitialized) {
        console.warn('[Auth] 10秒超时，onAuthStateChange 未触发 INITIAL_SESSION，切换到本地模式');
        loadFromLocalStorage();
        setLoading(false);
        setShowAuth(false);
      }
    }, 10000);

    return () => {
      console.log('[Auth] useEffect 清理');
      isMounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [loadFromLocalStorage, loadFromSupabase]); // 移除 loading 依赖，避免重复执行

  // Sync to localStorage (fallback) and auto-save
  useEffect(() => {
    // 保存到 localStorage 作为备份
    localStorage.setItem('coding-todo-backup-projects', JSON.stringify(projects));
    localStorage.setItem('coding-todo-backup-tasks', JSON.stringify(tasks));
    localStorage.setItem('coding-todo-backup-history', JSON.stringify(history));

    // 如果没有登录，也保存到主要 localStorage
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

  // Session recovery on focus/visibility change - 简化版本
  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;

    let lastRefreshTime = 0;
    const REFRESH_THROTTLE = 30000; // 30秒节流，避免频繁刷新

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastRefreshTime < REFRESH_THROTTLE) {
          return;
        }
        lastRefreshTime = now;

        // 简单的 token 刷新，不需要复杂的超时逻辑
        try {
          await supabase.auth.refreshSession();
          console.log('Session token refreshed');
        } catch (err) {
          console.warn('Session refresh failed:', err.message);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured()) return;
    if (typeof window === 'undefined' || !window.localStorage) return;

    const pendingProjects = getPendingProjects();
    const pendingTasks = getPendingTasks();
    if (!pendingProjects.length && !pendingTasks.length) return;

    const syncPending = async () => {
      try {
        if (pendingProjects.length) {
          const projectPayload = pendingProjects.map((project) => ({
            id: project.id,
            name: project.name,
            user_id: user.id,
            created_at: project.createdAt,
          }));
          const { error: projectError } = await supabase
            .from('projects')
            .upsert(projectPayload, { onConflict: 'id' });
          if (projectError) throw projectError;
          clearStorageKey(PENDING_PROJECTS_KEY);
        }

        if (pendingTasks.length) {
          const taskPayload = pendingTasks.map((task) => ({
            id: task.id,
            text: task.text,
            project_id: task.projectId,
            user_id: user.id,
            created_at: task.createdAt,
            priority_weight: priorityToWeight(task.priority),
          }));
          const { error: taskError } = await supabase
            .from('tasks')
            .upsert(taskPayload, { onConflict: 'id' });
          if (taskError) throw taskError;
          clearStorageKey(PENDING_TASKS_KEY);
        }

        await loadFromSupabase(user.id);
        success('离线数据已同步');
      } catch (err) {
        console.error('同步离线数据失败:', err);
      }
    };

    syncPending();
  }, [user, loadFromSupabase, success]);

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
      // 登录成功后，确保 session 被保存并刷新
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await loadFromSupabase(session.user.id);
        success('登录成功！');
      } else {
        // 如果没有立即获取到 session，等待一下再试
        await new Promise(resolve => setTimeout(resolve, 500));
        const retrySession = await supabase.auth.getSession();
        if (retrySession.data?.session) {
          setUser(retrySession.data.session.user);
          await loadFromSupabase(retrySession.data.session.user.id);
          success('登录成功！');
        }
      }
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    loadFromLocalStorage();
  };

  // Retry helper
  const withRetry = async (operation, maxRetries = 3, baseDelay = 1000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed, retrying...`, error);
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  // Project actions
  const addProject = async (name) => {
    const newProject = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };

    console.log('[addProject] Creating project:', { id: newProject.id, name: newProject.name });

    // 先更新本地状态（乐观更新）
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    playAudioCue('add');

    if (!isSupabaseConfigured()) {
      warning('Supabase 未配置，项目仅保存在本地');
      return;
    }

    if (!user) {
      queuePendingProject(newProject);
      warning('当前未登录，项目已暂存，登录后会自动同步');
      return;
    }

    try {
      console.log('[addProject] Syncing to Supabase...');

      await withRetry(async () => {
        // 添加超时处理（30秒）
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('数据库操作超时')), 30000)
        );

        const insertPromise = supabase.from('projects').insert({
          id: newProject.id,
          name: newProject.name,
          user_id: user.id
        }).select().single();

        const { data: insertedData, error: insertError } = await Promise.race([
          insertPromise,
          timeoutPromise
        ]);

        if (insertError) throw insertError;

        // 验证数据是否真的插入成功
        if (!insertedData || insertedData.id !== newProject.id) {
          throw new Error('数据验证失败');
        }

        console.log('[addProject] Successfully created and verified:', insertedData);
        return insertedData;
      });

      success('项目已创建');
    } catch (err) {
      console.error('[addProject] Exception:', err);
      // 如果发生异常，回滚本地状态
      setProjects(projects);
      setActiveProjectId(activeProjectId);
      error(`创建项目失败: ${err.message || '网络错误'}`);
      return;
    }
  };

  const deleteProject = async (id) => {
    if (projects.length <= 1) return;

    const originalProjects = projects;
    const originalTasks = tasks;
    const originalHistory = history;
    const originalActiveProjectId = activeProjectId;

    // 先更新本地状态（乐观更新）
    const updatedProjects = projects.filter(p => p.id !== id);
    const updatedTasks = tasks.filter(t => t.projectId !== id);
    const updatedHistory = history.filter(t => t.projectId !== id);
    setProjects(updatedProjects);
    setTasks(updatedTasks);
    setHistory(updatedHistory);

    if (activeProjectId === id) {
      setActiveProjectId(updatedProjects[0]?.id);
    }
    playAudioCue('delete');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: deleteError } = await supabase.from('projects').delete().eq('id', id);

        if (deleteError) {
          // 如果删除失败，回滚本地状态
          setProjects(originalProjects);
          setTasks(originalTasks);
          setHistory(originalHistory);
          setActiveProjectId(originalActiveProjectId);
          error(`删除项目失败: ${deleteError.message || '未知错误'}`);
          console.error('Failed to delete project:', deleteError);
          return;
        }
        success('项目已删除');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setProjects(originalProjects);
        setTasks(originalTasks);
        setHistory(originalHistory);
        setActiveProjectId(originalActiveProjectId);
        error(`删除项目失败: ${err.message || '网络错误'}`);
        console.error('Failed to delete project:', err);
        return;
      }
    }
  };

  const renameProject = async (id, newName) => {
    const originalProjects = projects;

    // 先更新本地状态（乐观更新）
    setProjects(projects.map(p => p.id === id ? { ...p, name: newName } : p));

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase.from('projects').update({ name: newName }).eq('id', id);

        if (updateError) {
          // 如果更新失败，回滚本地状态
          setProjects(originalProjects);
          error(`重命名项目失败: ${updateError.message || '未知错误'}`);
          console.error('Failed to rename project:', updateError);
          return;
        }
        success('项目已重命名');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setProjects(originalProjects);
        error(`重命名项目失败: ${err.message || '网络错误'}`);
        console.error('Failed to rename project:', err);
        return;
      }
    }
  };

  // Task actions
  const addTask = async (text, priority = DEFAULT_PRIORITY) => {
    // 验证当前项目是否存在
    const currentProject = projects.find(p => p.id === activeProjectId);
    if (!currentProject) {
      error('当前项目不存在，请先创建或选择一个项目');
      console.error('[addTask] Active project not found:', activeProjectId);
      return;
    }

    const newTask = {
      id: crypto.randomUUID(),
      text,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      priority: normalizePriority(priority),
    };

    console.log('[addTask] Creating task:', { id: newTask.id, text: newTask.text, priority: newTask.priority, projectId: newTask.projectId });

    // 先更新本地状态（乐观更新）
    setTasks([...tasks, newTask]);
    playAudioCue('add');

    if (!isSupabaseConfigured()) {
      warning('Supabase 未配置，任务仅保存在本地');
      return;
    }

    if (!user) {
      queuePendingTask(newTask);
      warning('当前未登录，任务已暂存，登录后会自动同步');
      return;
    }

    try {
      console.log('[addTask] Syncing to Supabase...');
      console.log('[addTask] Task:', { id: newTask.id, text: newTask.text, projectId: newTask.projectId });
      console.log('[addTask] User ID:', user.id);

      // 添加超时保护，防止请求挂起
      const timeoutMs = 15000; // 15秒超时

      // 直接插入任务，不需要验证项目（前端已经验证过了）
      const insertPromise = supabase
        .from('tasks')
        .insert({
          id: newTask.id,
          text: newTask.text,
          project_id: newTask.projectId,
          user_id: user.id,
          priority_weight: priorityToWeight(newTask.priority)
        })
        .select()
        .single();

      const insertTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('数据库插入超时，请检查网络连接')), timeoutMs)
      );

      const { data: insertedData, error: insertError } = await Promise.race([
        insertPromise,
        insertTimeout
      ]);

      if (insertError) {
        console.error('[addTask] Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });

        // 检查是否是外键约束错误
        if (insertError.code === '23503') {
          throw new Error('项目不存在，请重新加载页面');
        }

        throw new Error(`数据库错误: ${insertError.message}`);
      }

      // 验证数据是否真的插入成功
      if (!insertedData || insertedData.id !== newTask.id) {
        throw new Error('数据验证失败');
      }

      console.log('[addTask] Successfully created and verified:', insertedData);
      success('任务已创建');
    } catch (err) {
      console.error('[addTask] Exception:', err);
      // 如果发生异常，回滚本地状态
      setTasks(tasks);
      error(`创建任务失败: ${err.message || '网络错误'}`);
      return;
    }
  };

  const completeTask = async (id) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (!taskToComplete) return;

    const historyItem = { ...taskToComplete, completedAt: new Date().toISOString() };

    // 先更新本地状态（乐观更新）
    const updatedTasks = tasks.filter(t => t.id !== id);
    const updatedHistory = [historyItem, ...history];
    setTasks(updatedTasks);
    setHistory(updatedHistory);
    playAudioCue('complete');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const [deleteRes, insertRes] = await Promise.all([
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

        // 检查是否有错误
        if (deleteRes.error) {
          // 回滚本地状态
          setTasks(tasks);
          setHistory(history);
          error(`完成任务失败: ${deleteRes.error.message || '删除任务失败'}`);
          console.error('Failed to delete task:', deleteRes.error);
          return;
        }

        if (insertRes.error) {
          // 回滚本地状态
          setTasks(tasks);
          setHistory(history);
          error(`完成任务失败: ${insertRes.error.message || '保存历史记录失败'}`);
          console.error('Failed to insert history:', insertRes.error);
          return;
        }

        success('任务已完成');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setTasks(tasks);
        setHistory(history);
        error(`完成任务失败: ${err.message || '网络错误'}`);
        console.error('Failed to complete task:', err);
        return;
      }
    }
  };

  const editTask = async (id, newText) => {
    const originalTasks = tasks;

    // 先更新本地状态（乐观更新）
    setTasks(tasks.map(t => t.id === id ? { ...t, text: newText } : t));

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase.from('tasks').update({ text: newText }).eq('id', id);

        if (updateError) {
          // 如果更新失败，回滚本地状态
          setTasks(originalTasks);
          error(`编辑任务失败: ${updateError.message || '未知错误'}`);
          console.error('Failed to edit task:', updateError);
          return;
        }
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setTasks(originalTasks);
        error(`编辑任务失败: ${err.message || '网络错误'}`);
        console.error('Failed to edit task:', err);
        return;
      }
    }
  };

  const deleteTask = async (id) => {
    const originalTasks = tasks;

    // 先更新本地状态（乐观更新）
    setTasks(tasks.filter(t => t.id !== id));
    playAudioCue('delete');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);

        if (deleteError) {
          // 如果删除失败，回滚本地状态
          setTasks(originalTasks);
          error(`删除任务失败: ${deleteError.message || '未知错误'}`);
          console.error('Failed to delete task:', deleteError);
          return;
        }
        success('任务已删除');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setTasks(originalTasks);
        error(`删除任务失败: ${err.message || '网络错误'}`);
        console.error('Failed to delete task:', err);
        return;
      }
    }
  };

  const deleteHistoryItem = async (id) => {
    const originalHistory = history;

    // 先更新本地状态（乐观更新）
    setHistory(history.filter(t => t.id !== id));
    playAudioCue('delete');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: deleteError } = await supabase.from('history').delete().eq('id', id);

        if (deleteError) {
          // 如果删除失败，回滚本地状态
          setHistory(originalHistory);
          error(`删除历史记录失败: ${deleteError.message || '未知错误'}`);
          console.error('Failed to delete history item:', deleteError);
          return;
        }
        success('历史记录已删除');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setHistory(originalHistory);
        error(`删除历史记录失败: ${err.message || '网络错误'}`);
        console.error('Failed to delete history item:', err);
        return;
      }
    }
  };

  const restoreTask = async (id) => {
    const taskToRestore = history.find(t => t.id === id);
    if (!taskToRestore) return;

    const { completedAt: _completedAt, ...rest } = taskToRestore;
    const originalHistory = history;
    const originalTasks = tasks;

    // 先更新本地状态（乐观更新）
    setHistory(history.filter(t => t.id !== id));
    setTasks([rest, ...tasks]);
    playAudioCue('restore');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const [deleteRes, insertRes] = await Promise.all([
          supabase.from('history').delete().eq('id', id),
          supabase.from('tasks').insert({
            id: rest.id,
            text: rest.text,
            project_id: rest.projectId,
            user_id: user.id,
            priority_weight: priorityToWeight(rest.priority)
          })
        ]);

        // 检查是否有错误
        if (deleteRes.error) {
          // 回滚本地状态
          setHistory(originalHistory);
          setTasks(originalTasks);
          error(`恢复任务失败: ${deleteRes.error.message || '删除历史记录失败'}`);
          console.error('Failed to delete history:', deleteRes.error);
          return;
        }

        if (insertRes.error) {
          // 回滚本地状态
          setHistory(originalHistory);
          setTasks(originalTasks);
          error(`恢复任务失败: ${insertRes.error.message || '创建任务失败'}`);
          console.error('Failed to insert task:', insertRes.error);
          return;
        }

        success('任务已恢复');
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setHistory(originalHistory);
        setTasks(originalTasks);
        error(`恢复任务失败: ${err.message || '网络错误'}`);
        console.error('Failed to restore task:', err);
        return;
      }
    }
  };

  const changeTaskPriority = async (id, direction) => {
    let updatedPriority = null;
    const originalTasks = tasks;

    // 先更新本地状态（乐观更新）
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      const nextPriority = shiftPriority(task.priority, direction);
      updatedPriority = nextPriority;
      return { ...task, priority: nextPriority };
    }));

    playAudioCue(direction === 'up' ? 'add' : 'delete');

    // 如果已登录，同步到 Supabase
    if (updatedPriority !== null && user && isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase.from('tasks').update({ priority_weight: priorityToWeight(updatedPriority) }).eq('id', id);

        if (updateError) {
          // 如果更新失败，回滚本地状态
          setTasks(originalTasks);
          error(`更新优先级失败: ${updateError.message || '未知错误'}`);
          console.error('Failed to update priority:', updateError);
          return;
        }
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setTasks(originalTasks);
        error(`更新优先级失败: ${err.message || '网络错误'}`);
        console.error('Failed to update priority:', err);
        return;
      }
    }
  };

  const setTaskPriority = async (id, newPriority) => {
    const originalTasks = tasks;

    // 先更新本地状态（乐观更新）
    setTasks(prev => prev.map(task => {
      if (task.id !== id) return task;
      return { ...task, priority: newPriority };
    }));

    playAudioCue('add');

    // 如果已登录，同步到 Supabase
    if (user && isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase.from('tasks').update({ priority_weight: priorityToWeight(newPriority) }).eq('id', id);

        if (updateError) {
          // 如果更新失败，回滚本地状态
          setTasks(originalTasks);
          error(`更新优先级失败: ${updateError.message || '未知错误'}`);
          console.error('Failed to set priority:', updateError);
          return;
        }
      } catch (err) {
        // 如果发生异常，回滚本地状态
        setTasks(originalTasks);
        error(`更新优先级失败: ${err.message || '网络错误'}`);
        console.error('Failed to set priority:', err);
        return;
      }
    }
  };

  const copyTask = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      playAudioCue('copy');
      success('已复制到剪贴板');
    } catch (err) {
      error('复制失败，请手动复制');
      console.error('Failed to copy:', err);
    }
  };


  const activeTasks = sortByPriority(
    tasks.filter(t => {
      if (t.projectId !== activeProjectId) return false;
      if (priorityFilter === 'all') return true;
      return t.priority === priorityFilter;
    })
  );
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

  // 如果需要登录，先显示登录界面
  // 但在移动端，如果有本地数据，允许先使用本地模式
  if (showAuth) {
    const hasLocalData = localStorage.getItem('coding-todo-tasks') ||
      localStorage.getItem('coding-todo-backup-tasks');

    return (
      <div className="relative min-h-screen bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-50 overflow-hidden selection:bg-indigo-200 dark:selection:bg-indigo-500/30 transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#020617] dark:to-[#020617]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <AuthModal
            onAuth={handleAuth}
            onClose={hasLocalData ? () => {
              // 如果有本地数据，允许关闭登录界面，使用本地模式
              setShowAuth(false);
              loadFromLocalStorage();
            } : undefined} // 没有本地数据时，防止用户关闭登录界面
            forceShow={!hasLocalData} // 只有在没有本地数据时才强制显示登录界面
          />
        </div>
      </div>
    );
  }

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

              <PriorityFilter
                activeFilter={priorityFilter}
                onFilterChange={setPriorityFilter}
              />

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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
