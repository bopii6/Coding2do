import React from 'react';
import { Reorder, AnimatePresence } from 'framer-motion';
import TaskItem from './TaskItem';

function TaskList({ tasks, setTasks, onComplete, onDelete, onCopy }) {
    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-lg">
                <p>No tasks in queue. Capture an idea above!</p>
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
