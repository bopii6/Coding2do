import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Copy, Edit2 } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import PriorityBadge from './PriorityBadge';

function TaskItem({
    task,
    onComplete,
    onDelete,
    onCopy,
    onEdit,
    onSetPriority,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        if (editText.trim() && editText !== task.text) {
            onEdit(task.id, editText.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditText(task.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handlePriorityClick = () => {
        // Cycle: Now <-> Later
        const nextPriority = task.priority === 'now' ? 'later' : 'now';
        onSetPriority(nextPriority);
    };

    const priorityColors = {
        now: 'border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10',
        later: 'border-l-4 border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/20',
    };

    return (
        <Motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={`group relative overflow-hidden rounded-xl border border-white/10 shadow-sm hover:shadow-md transition-all ${priorityColors[task.priority] || priorityColors.now}`}
        >
            <div className="flex items-center gap-3 p-4">
                <div
                    className="cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    onClick={handlePriorityClick}
                    title="点击切换优先级"
                >
                    <PriorityBadge level={task.priority} />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="w-full text-base text-slate-800 dark:text-slate-100 bg-transparent border-b border-indigo-500 focus:outline-none pb-1"
                            />
                        ) : (
                            <span
                                className="block text-base text-slate-800 dark:text-slate-100 leading-relaxed break-words cursor-text"
                                onDoubleClick={handleEdit}
                            >
                                {task.text}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleEdit}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="编辑"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onCopy(task.text)}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="复制"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = (rect.left + rect.width / 2) / window.innerWidth;
                                const y = (rect.top + rect.height / 2) / window.innerHeight;
                                confetti({ particleCount: 50, spread: 60, origin: { x, y }, colors: ['#10b981', '#34d399'], disableForReducedMotion: true, zIndex: 1000 });
                                onComplete(task.id);
                            }}
                            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="完成"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="删除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}

export default TaskItem;
