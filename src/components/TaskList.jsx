import React from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';

function TaskList({ tasks, setTasks, onComplete, onDelete, onCopy }) {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 rounded-xl border border-dashed border-white/5 bg-white/[0.01] text-slate-500">
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs text-slate-600 mt-1">Add a task to get started</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Reorder.Group axis="y" values={tasks} onReorder={setTasks}>
                <AnimatePresence mode='popLayout'>
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onComplete={onComplete}
                            onDelete={onDelete}
                            onCopy={onCopy}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>
        </div>
    );
}

export default TaskList;
