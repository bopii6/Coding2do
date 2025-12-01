import React from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';

function TaskList({ tasks, setTasks, onComplete, onDelete, onCopy, onEdit }) {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 rounded-xl border border-dashed border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] text-slate-400 dark:text-slate-500">
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">Add a task to get started</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="flex flex-col gap-2">
                <AnimatePresence mode='popLayout'>
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onComplete={onComplete}
                            onDelete={onDelete}
                            onCopy={onCopy}
                            onEdit={onEdit}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>
        </div>
    );
}

export default TaskList;
