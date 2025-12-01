import React from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';

function TaskList({ tasks, setTasks, onComplete, onDelete, onCopy }) {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl text-slate-400 shadow-inner shadow-slate-900/30">
                <p className="text-lg font-medium">Queue is calm</p>
                <p className="text-sm text-slate-500 mt-2">Capture an idea above to keep momentum.</p>
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
