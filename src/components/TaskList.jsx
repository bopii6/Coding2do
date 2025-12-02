import React from 'react';
import { AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';

function TaskList({ tasks, onComplete, onDelete, onCopy, onEdit, onPromotePriority, onCalmPriority, onSetPriority }) {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 rounded-xl border border-dashed border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">暂无任务</p>
                <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">添加一个任务开始吧</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onComplete={onComplete}
                        onDelete={onDelete}
                        onCopy={onCopy}
                        onEdit={onEdit}
                        onPromotePriority={() => onPromotePriority(task.id)}
                        onCalmPriority={() => onCalmPriority(task.id)}
                        onSetPriority={(priority) => onSetPriority(task.id, priority)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export default TaskList;
