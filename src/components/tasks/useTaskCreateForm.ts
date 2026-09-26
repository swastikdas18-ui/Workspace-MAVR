import { useState } from 'react';
import { TaskPriority, User, Project } from '../../types';

interface UseTaskCreateFormProps {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  createTask: (task: any) => Promise<boolean>;
}

export function useTaskCreateForm({ currentUser, users, projects, createTask }: UseTaskCreateFormProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [storyPoints, setStoryPoints] = useState<number>(1);
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [assignedTo, setAssignedTo] = useState<string>(currentUser?.id || '');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [isLearningTask, setIsLearningTask] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStoryPoints(1);
    setEstimatedHours(4);
    const defaultAssignee = currentUser?.id || users[0]?.id || '';
    setAssignedTo(defaultAssignee);
    setProjectId(projects[0]?.id || '');
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    const targetUser = users.find(u => u.id === defaultAssignee);
    setIsLearningTask(targetUser?.role === 'intern');
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    }
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const success = await createTask({
      title,
      description,
      status: 'todo',
      priority,
      story_points: storyPoints,
      estimated_hours: estimatedHours,
      assigned_to: assignedTo,
      project_id: projectId,
      due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      is_learning_task: isLearningTask,
      comments_count: 0,
    });
    setIsCreating(false);
    if (success) {
      setIsCreateModalOpen(false);
      resetCreateForm();
    }
  };

  return {
    isCreateModalOpen,
    handleOpenCreateModal,
    handleCloseCreateModal,
    handleCreateSubmit,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    storyPoints,
    setStoryPoints,
    estimatedHours,
    setEstimatedHours,
    assignedTo,
    setAssignedTo,
    projectId,
    setProjectId,
    dueDate,
    setDueDate,
    isLearningTask,
    setIsLearningTask,
    isCreating,
  };
}
