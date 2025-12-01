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
        <div className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col h-screen sticky top-0">
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-purple-500" />
                    Projects
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className={clsx(
                            "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                            activeProjectId === project.id
                                ? "bg-purple-500/10 text-purple-400"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                        onClick={() => onSelectProject(project.id)}
                    >
                        {editingId === project.id ? (
                            <form onSubmit={handleRenameSubmit} className="flex-1 mr-2" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-slate-800 text-slate-200 px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                                className="p-1 hover:bg-slate-700 rounded"
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
                                    className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {isAdding ? (
                    <form onSubmit={handleAddSubmit} className="p-2">
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project Name..."
                            className="w-full bg-slate-800 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 border border-slate-700"
                            autoFocus
                            onBlur={() => !newProjectName && setIsAdding(false)}
                        />
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full flex items-center gap-2 p-2 text-slate-500 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors text-sm"
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
