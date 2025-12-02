import React, { useState } from 'react';
import { Folder, Plus, Trash2, Edit2 } from 'lucide-react';
import clsx from 'clsx';

function ProjectSidebar({ projects, activeProjectId, onSelectProject, onAddProject, onDeleteProject, onRenameProject }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            onAddProject(newProjectName.trim());
            setNewProjectName('');
            setIsAdding(false);
        }
    };

    const handleRenameSubmit = (e) => {
        e.preventDefault();
        if (editName.trim()) {
            onRenameProject(editingId, editName.trim());
            setEditingId(null);
        }
    };

    return (
        <div className="w-64 lg:w-72 bg-slate-50 dark:bg-[#020617] border-r border-slate-200 dark:border-white/5 flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-200">
                            <Folder className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">项目列表</h2>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className={clsx(
                            "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all",
                            activeProjectId === project.id
                                ? "bg-slate-200 dark:bg-white/5 text-slate-900 dark:text-white"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.02]"
                        )}
                        onClick={() => onSelectProject(project.id)}
                    >
                        {editingId === project.id ? (
                            <form onSubmit={handleRenameSubmit} className="flex-1 mr-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-transparent text-slate-900 dark:text-slate-200 px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-700"
                                    autoFocus
                                    onBlur={() => setEditingId(null)}
                                />
                            </form>
                        ) : (
                            <span className="truncate text-sm font-medium flex-1">{project.name}</span>
                        )}

                        <div className={clsx(
                            "flex items-center gap-1 transition-opacity",
                            activeProjectId === project.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(project.id);
                                    setEditName(project.name);
                                }}
                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                            {projects.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`确定要删除项目 "${project.name}" 及其所有任务吗?`)) {
                                            onDeleteProject(project.id);
                                        }
                                    }}
                                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-slate-500"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {isAdding ? (
                    <form onSubmit={handleAddSubmit} className="px-1 py-2">
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="新项目..."
                            className="w-full bg-white dark:bg-white/[0.02] text-slate-900 dark:text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-700 border border-slate-200 dark:border-white/5"
                            autoFocus
                            onBlur={() => !newProjectName && setIsAdding(false)}
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.02] rounded-lg transition-colors text-sm font-medium mt-2"
                    >
                        <Plus className="w-4 h-4" />
                        新建项目
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProjectSidebar;
