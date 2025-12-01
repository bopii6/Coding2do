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
        <div className="w-64 lg:w-72 bg-white/[0.03] border-r border-white/10 backdrop-blur-2xl flex flex-col h-screen sticky top-0 shadow-[0_15px_80px_rgba(2,6,23,0.85)]">
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 text-fuchsia-100">
                        <Folder className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Spaces</p>
                        <h2 className="text-lg font-semibold text-white">Projects</h2>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className={clsx(
                            "group flex items-center justify-between px-3 py-2 rounded-2xl cursor-pointer transition-all border",
                            activeProjectId === project.id
                                ? "bg-gradient-to-r from-purple-500/30 to-sky-500/20 border-white/20 text-white shadow-lg shadow-purple-900/30"
                                : "text-slate-400 border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                        )}
                        onClick={() => onSelectProject(project.id)}
                    >
                        {editingId === project.id ? (
                            <form onSubmit={handleRenameSubmit} className="flex-1 mr-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-transparent text-slate-200 px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/60"
                                    autoFocus
                                    onBlur={() => setEditingId(null)}
                                />
                            </form>
                        ) : (
                            <span className="truncate font-medium flex-1">{project.name}</span>
                        )}

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(project.id);
                                    setEditName(project.name);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10"
                            >
                                <Edit2 className="w-3 h-3" />
                            </button>
                            {projects.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete project "${project.name}" and all its tasks?`)) {
                                            onDeleteProject(project.id);
                                        }
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-300"
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
                            placeholder="Project Name..."
                            className="w-full bg-white/[0.02] text-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/60 border border-white/10"
                            autoFocus
                            onBlur={() => !newProjectName && setIsAdding(false)}
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-purple-200 hover:bg-white/[0.04] rounded-2xl transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Project
                    </button>
                )}
            </div>
        </div>
    );
}

export default ProjectSidebar;
