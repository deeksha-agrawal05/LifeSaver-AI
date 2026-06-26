import { Injectable, computed, signal, inject } from '@angular/core';
import { CalendarService } from './calendar';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes: number;
}

export interface RescuePlan {
  emergencyPlan: string;
  probabilityOfMissing: number; // Percentage, e.g. 85 for 85%
  recommendationReason: string;
  calculatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO DateTime string
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  progress: number; // 0 to 100
  subtasks: Subtask[];
  priorityScore: number; // 0 to 100
  aiRecommendationReason: string;
  rescuePlan?: RescuePlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class TaskManager {
  private calendarService = inject(CalendarService);

  // Core State Signals
  currentUser = signal<User | null>(null);
  tasks = signal<Task[]>([]);
  
  // Async Loading states
  loadingSubtasks = signal<boolean>(false);
  loadingPrioritization = signal<boolean>(false);
  loadingRescue = signal<boolean>(false);
  loadingAccountability = signal<boolean>(false);
  aiError = signal<string | null>(null);

  // Filters State Signals
  filterStatus = signal<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  filterUrgency = signal<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  searchQuery = signal<string>('');

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('lifesaver_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          this.currentUser.set(user);
          this.loadTasks(user.id);
        } catch {
          localStorage.removeItem('lifesaver_user');
        }
      }
    }
  }

  loadTasks(userId: string) {
    if (typeof window !== 'undefined') {
      const storedTasks = localStorage.getItem(`lifesaver_tasks_${userId}`);
      if (storedTasks) {
        try {
          this.tasks.set(JSON.parse(storedTasks));
        } catch {
          this.tasks.set([]);
        }
      } else if (userId === 'guest_user') {
        const demo = this.getDemoTasks(userId);
        this.tasks.set(demo);
        this.saveTasksToStorage(userId, demo);
      } else {
        this.tasks.set([]);
      }
    }
  }

  private saveTasksToStorage(userId: string, taskList: Task[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`lifesaver_tasks_${userId}`, JSON.stringify(taskList));
    }
  }

  login(email: string, name: string) {
    const userId = 'user_' + Math.random().toString(36).substring(2, 9);
    const user: User = {
      id: userId,
      email,
      name
    };

    this.currentUser.set(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifesaver_user', JSON.stringify(user));
    }
    this.loadTasks(user.id);
    this.aiError.set(null);
    return user;
  }

  enterGuestMode() {
    const guestUser: User = {
      id: 'guest_user',
      email: 'guest@lifesaver.ai',
      name: 'Guest'
    };

    this.currentUser.set(guestUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifesaver_user', JSON.stringify(guestUser));
    }
    this.loadTasks(guestUser.id);
    this.aiError.set(null);
    return guestUser;
  }

  logout() {
    this.currentUser.set(null);
    this.tasks.set([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lifesaver_user');
    }
  }

  async createTask(title: string, description: string, deadline: string, urgency: Task['urgency'], generateAI: boolean) {
    const user = this.currentUser();
    if (!user) return null;

    const taskId = 'task_' + Math.random().toString(36).substring(2, 9);
    const newTask: Task = {
      id: taskId,
      userId: user.id,
      title,
      description: description || '',
      deadline: new Date(deadline).toISOString(),
      urgency,
      status: 'pending',
      progress: 0,
      subtasks: [],
      priorityScore: this.calculateDefaultPriority(urgency, deadline),
      aiRecommendationReason: 'Awaiting dynamic AI assessment...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const currentList = [...this.tasks(), newTask];
    this.tasks.set(currentList);
    this.saveTasksToStorage(user.id, currentList);

    if (generateAI) {
      await this.generateAISubtasks(newTask);
    }
    return newTask;
  }

  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) {
    const user = this.currentUser();
    if (!user) return;

    const updatedTasks = this.tasks().map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  private calculateDefaultPriority(urgency: string, deadlineStr: string): number {
    let score = 20;
    if (urgency === 'critical') score = 75;
    else if (urgency === 'high') score = 55;
    else if (urgency === 'medium') score = 35;

    const hoursRemaining = (new Date(deadlineStr).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursRemaining > 0 && hoursRemaining < 24) {
      score += 20;
    }
    return Math.min(score, 99);
  }

  deleteTask(taskId: string) {
    const user = this.currentUser();
    if (!user) return;

    const updated = this.tasks().filter(t => t.id !== taskId);
    this.tasks.set(updated);
    this.saveTasksToStorage(user.id, updated);
  }

  toggleTaskCompletion(task: Task) {
    const user = this.currentUser();
    if (!user) return;

    const updatedStatus = (task.status === 'completed' ? 'pending' : 'completed') as Task['status'];
    const updatedTasks = this.tasks().map(t => {
      if (t.id === task.id) {
        const updatedSubtasks = t.subtasks.map(s => ({ ...s, completed: updatedStatus === 'completed' }));
        return {
          ...t,
          status: updatedStatus,
          progress: updatedStatus === 'completed' ? 100 : 0,
          subtasks: updatedSubtasks,
          priorityScore: updatedStatus === 'completed' ? 0 : t.priorityScore,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  toggleSubtask(taskId: string, subtaskId: string) {
    const user = this.currentUser();
    if (!user) return;

    const updatedTasks = this.tasks().map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, completed: !s.completed };
          }
          return s;
        });

        const completedCount = updatedSubtasks.filter(s => s.completed).length;
        const progress = updatedSubtasks.length > 0 
          ? Math.round((completedCount / updatedSubtasks.length) * 100) 
          : 0;

        const updatedStatus = (progress === 100 ? 'completed' : (progress > 0 ? 'in_progress' : 'pending')) as Task['status'];

        return {
          ...t,
          subtasks: updatedSubtasks,
          progress,
          status: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  addSubtaskManually(taskId: string, title: string, estimatedMinutes: number) {
    const user = this.currentUser();
    if (!user) return;

    const newSubtask: Subtask = {
      id: 'sub_' + Math.random().toString(36).substring(2, 9),
      title,
      completed: false,
      estimatedMinutes
    };

    const updatedTasks = this.tasks().map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = [...t.subtasks, newSubtask];
        const completedCount = updatedSubtasks.filter(s => s.completed).length;
        const progress = Math.round((completedCount / updatedSubtasks.length) * 100);
        const updatedStatus = (progress === 100 ? 'completed' : 'in_progress') as Task['status'];

        return {
          ...t,
          subtasks: updatedSubtasks,
          progress,
          status: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  deleteSubtask(taskId: string, subtaskId: string) {
    const user = this.currentUser();
    if (!user) return;

    const updatedTasks = this.tasks().map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.filter(s => s.id !== subtaskId);
        const completedCount = updatedSubtasks.filter(s => s.completed).length;
        const progress = updatedSubtasks.length > 0
          ? Math.round((completedCount / updatedSubtasks.length) * 100)
          : 0;
        const updatedStatus = (progress === 100 ? 'completed' : (progress > 0 ? 'in_progress' : 'pending')) as Task['status'];

        return {
          ...t,
          subtasks: updatedSubtasks,
          progress,
          status: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  async generateAISubtasks(task: Task) {
    const user = this.currentUser();
    if (!user) return;

    this.loadingSubtasks.set(true);
    this.aiError.set(null);

    try {
      const response = await fetch('/api/ai/subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          urgency: task.urgency,
          calendarEvents: this.calendarService.events()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error generating subtasks');
      }

      const data = await response.json();
      const generated: { title: string; estimatedMinutes?: number }[] = data.subtasks || [];
      const priorityScore = typeof data.priorityScore === 'number' ? data.priorityScore : this.calculateDefaultPriority(task.urgency, task.deadline);
      const recommendationReason = data.recommendationReason || 'Structured with Gemini AI.';

      const newSubtasks: Subtask[] = generated.map(s => ({
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        title: s.title,
        completed: false,
        estimatedMinutes: s.estimatedMinutes || 20
      }));

      const updatedTasks = this.tasks().map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            subtasks: newSubtasks,
            progress: 0,
            status: 'pending' as const,
            priorityScore,
            aiRecommendationReason: recommendationReason,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      this.tasks.set(updatedTasks);
      this.saveTasksToStorage(user.id, updatedTasks);

    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'API key missing or configuration error.';
      this.aiError.set(errMsg + ' Running local simulation fallback.');
      
      const fallbackSubtasks: Subtask[] = [
        { id: 'sub_fb1', title: 'Define outline & gather details', completed: false, estimatedMinutes: 20 },
        { id: 'sub_fb2', title: 'Execute primary deliverables', completed: false, estimatedMinutes: 45 },
        { id: 'sub_fb3', title: 'Quality check and submit results', completed: false, estimatedMinutes: 15 }
      ];

      const updatedTasks = this.tasks().map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            subtasks: fallbackSubtasks,
            progress: 0,
            status: 'pending' as const,
            aiRecommendationReason: 'Setup completed. Note: Please add GEMINI_API_KEY in secrets panel for premium AI guidance.',
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      this.tasks.set(updatedTasks);
      this.saveTasksToStorage(user.id, updatedTasks);
    } finally {
      this.loadingSubtasks.set(false);
    }
  }

  async runAIPrioritization() {
    const user = this.currentUser();
    if (!user) return;

    const activeTasks = this.tasks().filter(t => t.status !== 'completed');
    if (activeTasks.length === 0) return;

    this.loadingPrioritization.set(true);
    this.aiError.set(null);

    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: this.tasks(),
          calendarEvents: this.calendarService.events()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error calculating priorities');
      }

      const data = await response.json();
      const recommendations: { taskId: string; priorityScore: number; recommendationReason: string }[] = data.recommendations;

      const updatedTasks = this.tasks().map(t => {
        const rec = recommendations.find((r: { taskId: string }) => r.taskId === t.id);
        if (rec) {
          return {
            ...t,
            priorityScore: rec.priorityScore,
            aiRecommendationReason: rec.recommendationReason,
            updatedAt: new Date().toISOString()
          };
        } else if (t.status === 'completed') {
          return {
            ...t,
            priorityScore: 0,
            aiRecommendationReason: 'Task completed! Safe and secured.',
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      const sortedTasks = [...updatedTasks].sort((a, b) => b.priorityScore - a.priorityScore);
      this.tasks.set(sortedTasks);
      this.saveTasksToStorage(user.id, sortedTasks);

    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'API call failed.';
      this.aiError.set(errMsg + ' Generating smart local workload ordering.');

      const now = new Date().getTime();
      const updatedTasks = this.tasks().map(t => {
        if (t.status === 'completed') {
          return { ...t, priorityScore: 0, aiRecommendationReason: 'Completed!' };
        }

        const deadline = new Date(t.deadline).getTime();
        const hrsRemaining = (deadline - now) / (1000 * 60 * 60);

        let score = 30;
        let reason = 'Normal task progression.';

        if (t.urgency === 'critical') { score += 40; }
        else if (t.urgency === 'high') { score += 25; }

        if (hrsRemaining > 0 && hrsRemaining < 12) {
          score += 30;
          reason = `Critical Time Alert: Due in less than 12 hours (${Math.round(hrsRemaining)}h remaining)!`;
        } else if (hrsRemaining > 0 && hrsRemaining < 24) {
          score += 15;
          reason = `Urgent: Looming deadline tomorrow (${Math.round(hrsRemaining)}h remaining).`;
        } else if (hrsRemaining < 0) {
          score += 50;
          reason = `OVERDUE: Complete immediately to prevent critical blocker.`;
        } else {
          reason = `Scheduled task. Ample time (${Math.round(hrsRemaining / 24)} days) remaining.`;
        }

        return {
          ...t,
          priorityScore: Math.min(score, 100),
          aiRecommendationReason: reason + ' (Configure GEMINI_API_KEY in secrets for custom cognitive prioritization).'
        };
      });

      const sortedTasks = [...updatedTasks].sort((a, b) => b.priorityScore - a.priorityScore);
      this.tasks.set(sortedTasks);
      this.saveTasksToStorage(user.id, sortedTasks);
    } finally {
      this.loadingPrioritization.set(false);
    }
  }

  async runRescueMode(task: Task) {
    const user = this.currentUser();
    if (!user) return;

    this.loadingRescue.set(true);
    this.aiError.set(null);

    try {
      const response = await fetch('/api/ai/rescue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          deadline: task.deadline,
          urgency: task.urgency,
          subtasks: task.subtasks,
          currentTime: new Date().toISOString(),
          calendarEvents: this.calendarService.getBusyEventsInWindow(task.deadline)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error generating rescue plan');
      }

      const data = await response.json();
      
      const emergencyPlan = data.emergencyPlan || 'No tactical plan returned from Gemini.';
      const probabilityOfMissing = typeof data.probabilityOfMissing === 'number' ? data.probabilityOfMissing : 50;
      const recommendationReason = data.recommendationReason || 'Action required.';
      const reordered: Subtask[] = data.reorderedSubtasks || task.subtasks;

      const updatedTasks = this.tasks().map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            subtasks: reordered,
            priorityScore: Math.max(t.priorityScore, 90), // Bumps priority as it is a rescue state task
            rescuePlan: {
              emergencyPlan,
              probabilityOfMissing,
              recommendationReason,
              calculatedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      this.tasks.set(updatedTasks);
      this.saveTasksToStorage(user.id, updatedTasks);

    } catch (err: unknown) {
      console.error('Error running rescue mode:', err);
      const errMsg = err instanceof Error ? err.message : 'Rescue API failed.';
      this.aiError.set(errMsg + ' Generating local tactical triage fallback.');

      // Fallback calculation
      const remainingEffort = task.subtasks.filter(s => !s.completed).reduce((acc, curr) => acc + curr.estimatedMinutes, 0);
      const availableTime = (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60);
      let probOfMissing = 50;
      if (remainingEffort === 0) {
        probOfMissing = 0;
      } else if (availableTime <= 0) {
        probOfMissing = 100;
      } else {
        probOfMissing = Math.min(100, Math.round((remainingEffort / availableTime) * 100));
      }

      // Reorder: uncompleted first
      const sortedSubtasks = [...task.subtasks].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return 0;
      });

      const fallbackPlan = `### Emergency Completion Plan (Local Fallback)
The local scheduler calculated your available time vs. efforts to optimize progress:

- **Remaining Efforts**: **${remainingEffort} minutes** of active tasks.
- **Available Time Window**: **${availableTime > 0 ? Math.round(availableTime) : 0} minutes** remaining before deadline.
- **Urgent Recommendations**:
  1. We have automatically reordered your checklist to put **pending tasks first**.
  2. Skip non-essential steps and seek immediate focus.
  3. Keep the browser open and execute the active console.

*Note: Configure a GEMINI_API_KEY in the Secrets panel to activate personalized, smart rescue instructions from LifeSaver AI.*`;

      const updatedTasks = this.tasks().map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            subtasks: sortedSubtasks,
            priorityScore: Math.max(t.priorityScore, 90),
            rescuePlan: {
              emergencyPlan: fallbackPlan,
              probabilityOfMissing: probOfMissing,
              recommendationReason: `High deadline threat alert. Remaining effort of ${remainingEffort}m relative to time left.`,
              calculatedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      this.tasks.set(updatedTasks);
      this.saveTasksToStorage(user.id, updatedTasks);
    } finally {
      this.loadingRescue.set(false);
    }
  }

  async runAccountabilityAudit(userFeedback: { taskId: string; progressComment: string; blockerSelected: string }[]) {
    const user = this.currentUser();
    if (!user) return null;

    this.loadingAccountability.set(true);
    this.aiError.set(null);

    try {
      const response = await fetch('/api/ai/accountability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: this.tasks().filter(t => t.status !== 'completed'),
          userFeedback,
          currentTime: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error generating accountability audit');
      }

      return await response.json();
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'API key missing or configuration error.';
      this.aiError.set(errMsg);
      throw err;
    } finally {
      this.loadingAccountability.set(false);
    }
  }

  applyAccountabilityUpdates(updates: {
    taskId: string;
    updatedPriorityScore: number;
    updatedUrgency: 'low' | 'medium' | 'high' | 'critical';
    suggestedNextAction: string;
    actionEstMinutes: number;
    recommendationReason: string;
  }[]) {
    const user = this.currentUser();
    if (!user) return;

    const updatedTasks = this.tasks().map(t => {
      const update = updates.find(u => u.taskId === t.id);
      if (update) {
        // Create subtask if it doesn't already exist in task's subtasks list
        const actionExists = t.subtasks.some(s => s.title.toLowerCase().includes(update.suggestedNextAction.toLowerCase()) || update.suggestedNextAction.toLowerCase().includes(s.title.toLowerCase()));
        const newSubtasks = [...t.subtasks];
        
        if (!actionExists && update.suggestedNextAction && update.suggestedNextAction.trim() !== '') {
          newSubtasks.push({
            id: 'sub_acc_' + Math.random().toString(36).substring(2, 9),
            title: 'Accountability Microstep: ' + update.suggestedNextAction,
            completed: false,
            estimatedMinutes: update.actionEstMinutes || 10
          });
        }

        // Recalculate progress
        const completedCount = newSubtasks.filter(s => s.completed).length;
        const progress = newSubtasks.length > 0 
          ? Math.round((completedCount / newSubtasks.length) * 100) 
          : 0;

        const updatedStatus = (progress === 100 ? 'completed' : (progress > 0 ? 'in_progress' : 'pending')) as Task['status'];

        return {
          ...t,
          urgency: update.updatedUrgency,
          priorityScore: update.updatedPriorityScore,
          aiRecommendationReason: update.recommendationReason,
          subtasks: newSubtasks,
          progress,
          status: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    this.tasks.set(updatedTasks);
    this.saveTasksToStorage(user.id, updatedTasks);
  }

  // Derived Computeds
  filteredTasks = computed(() => {
    let list = this.tasks();
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(t => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    }

    const status = this.filterStatus();
    if (status !== 'all') {
      list = list.filter(t => t.status === status);
    }

    const urgency = this.filterUrgency();
    if (urgency !== 'all') {
      list = list.filter(t => t.urgency === urgency);
    }

    return list;
  });

  recommendedTask = computed(() => {
    const active = this.tasks().filter(t => t.status !== 'completed');
    if (active.length === 0) return null;

    return active.reduce((highest, current) => {
      return (current.priorityScore > highest.priorityScore) ? current : highest;
    }, active[0]);
  });

  stats = computed(() => {
    const list = this.tasks();
    const total = list.length;
    const completed = list.filter(t => t.status === 'completed').length;
    const pending = list.filter(t => t.status !== 'completed').length;
    
    const now = new Date().getTime();
    const looming = list.filter(t => {
      if (t.status === 'completed') return false;
      const deadline = new Date(t.deadline).getTime();
      const diffHours = (deadline - now) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      looming,
      completionRate
    };
  });

  getRemainingTime(deadlineStr: string) {
    if (!deadlineStr) return { text: 'No deadline', isLooming: false, isOverdue: false };
    
    const now = new Date().getTime();
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - now;
    
    if (isNaN(deadline)) {
      return { text: 'No deadline', isLooming: false, isOverdue: false };
    }
    
    if (diff < 0) {
      return { text: 'Overdue!', isLooming: true, isOverdue: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return { text: `Due in ${days}d ${hours % 24}h`, isLooming: days <= 1, isOverdue: false };
    } else if (hours > 0) {
      return { text: `Due in ${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`, isLooming: true, isOverdue: false };
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return { text: `Due in ${minutes}m!`, isLooming: true, isOverdue: false };
    }
  }

  getDemoTasks(userId: string): Task[] {
    const now = new Date();
    const d1 = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const d2 = new Date(now.getTime() + 18 * 60 * 60 * 1000);
    const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'task_demo_1',
        userId,
        title: 'Complete final research proposal',
        description: 'Compile literature reviews, format references, and prepare the executive slide summary for the team review.',
        deadline: d1.toISOString(),
        urgency: 'critical',
        status: 'in_progress',
        progress: 33,
        subtasks: [
          { id: 'sub_d1_1', title: 'Verify references & citations', completed: true, estimatedMinutes: 20 },
          { id: 'sub_d1_2', title: 'Draft methodology description', completed: false, estimatedMinutes: 45 },
          { id: 'sub_d1_3', title: 'Format and export final PDF proposal', completed: false, estimatedMinutes: 15 }
        ],
        priorityScore: 92,
        aiRecommendationReason: 'CRITICAL ALERT: Due in less than 4 hours! Only 1 of 3 subtasks is completed. Immediate focus is strongly advised.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'task_demo_2',
        userId,
        title: 'Review team development blocker',
        description: 'Check cloud server configurations and resolve connection timeout issues on the staging environment.',
        deadline: d2.toISOString(),
        urgency: 'high',
        status: 'pending',
        progress: 0,
        subtasks: [
          { id: 'sub_d2_1', title: 'Inspect docker deployment logs', completed: false, estimatedMinutes: 30 },
          { id: 'sub_d2_2', title: 'Test local connection timeout settings', completed: false, estimatedMinutes: 15 }
        ],
        priorityScore: 78,
        aiRecommendationReason: 'HIGH PRIORITY: Due tomorrow morning. Ensure logs are inspected today to avoid blocking developer work.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'task_demo_3',
        userId,
        title: 'Weekly grocery prep & budget audit',
        description: 'Review bank statement expenses, plan meals, and log pending credit records.',
        deadline: d3.toISOString(),
        urgency: 'medium',
        status: 'completed',
        progress: 100,
        subtasks: [
          { id: 'sub_d3_1', title: 'Calculate total meal expenses', completed: true, estimatedMinutes: 10 }
        ],
        priorityScore: 0,
        aiRecommendationReason: 'Task is already safely completed! Great job.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];
  }
}
