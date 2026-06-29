import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TaskManager } from '../services/task-manager';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  selector: 'app-profile',
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      
      <!-- Page Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 class="font-display font-bold text-2xl text-slate-900">User Profile Console</h2>
          <p class="text-xs text-slate-500 mt-0.5">Manage your active workspace profile and cognitive parameters.</p>
        </div>
        
        <a routerLink="/dashboard" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
          <span class="material-icons text-base">dashboard</span>
          <span>Return to Dashboard</span>
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- LEFT PANEL: Identity Details -->
        <div class="md:col-span-1 space-y-6">
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            <!-- User avatar -->
            <div class="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center font-display font-bold text-3xl shadow-md mb-4">
              {{ (taskManager.currentUser()?.name || 'U').charAt(0).toUpperCase() }}
            </div>

            <h3 class="font-display font-bold text-lg text-slate-900 leading-snug">{{ taskManager.currentUser()?.name || 'User Name' }}</h3>
            <p class="text-xs text-slate-400 font-mono mt-1 break-all">{{ taskManager.currentUser()?.email }}</p>
            
            <div class="mt-4 pt-4 border-t border-slate-100 w-full space-y-3 text-left">
              <div>
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Session Type</span>
                <span class="text-xs font-semibold text-slate-700">
                  {{ taskManager.currentUser()?.id === 'guest_user' ? 'Guest Workspace' : 'Authenticated Cloud User' }}
                </span>
              </div>
              
              <div>
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cognitive Role</span>
                <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                  Strategic Planner
                </span>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-100 w-full">
              <button (click)="logout()" 
                      class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95">
                <span class="material-icons text-sm">logout</span>
                <span>Sign Out Session</span>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: Productivity Stats & System Operations -->
        <div class="md:col-span-2 space-y-6">
          
          <!-- Performance Metrics Card -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Productivity Performance Index</h3>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="p-4 bg-slate-50 border border-slate-100/50 rounded-xl text-center">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Rate</span>
                <span class="text-2xl font-display font-extrabold text-indigo-600 block mt-1">
                  {{ taskManager.stats().completionRate }}%
                </span>
              </div>

              <div class="p-4 bg-slate-50 border border-slate-100/50 rounded-xl text-center">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Workload</span>
                <span class="text-2xl font-display font-extrabold text-slate-900 block mt-1">
                  {{ taskManager.stats().total }}
                </span>
              </div>

              <div class="p-4 bg-slate-50 border border-slate-100/50 rounded-xl text-center">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                <span class="text-2xl font-display font-extrabold text-emerald-600 block mt-1">
                  {{ taskManager.stats().completed }}
                </span>
              </div>

              <div class="p-4 bg-slate-50 border border-slate-100/50 rounded-xl text-center"
                   [class.bg-red-50/50]="taskManager.stats().looming > 0">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Overdue/Alerts</span>
                <span class="text-2xl font-display font-extrabold block mt-1" [class.text-red-500]="taskManager.stats().looming > 0" [class.text-slate-900]="taskManager.stats().looming === 0">
                  {{ taskManager.stats().looming }}
                </span>
              </div>
            </div>

            <!-- Personalized Advisor Dialogue -->
            <div class="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl flex items-start gap-3 mt-4">
              <span class="material-icons text-indigo-600 text-lg">psychology</span>
              <div class="space-y-1">
                <h5 class="text-xs font-bold text-slate-800">AI Cognitive Performance Assessment</h5>
                <p class="text-xs text-slate-500 leading-relaxed">
                  "{{ diagnosisMessage() }}"
                </p>
              </div>
            </div>
          </div>

          <!-- Sandbox Database Management -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider text-red-500">Workspace Database Controls</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              To support rapid prototype sandboxing, you can load a set of curated LifeSaver onboarding tasks or clear all local database caches to start fresh.
            </p>
            
            <div class="flex flex-wrap gap-3 pt-2">
              <button (click)="resetDemoData()" 
                      class="px-4 py-2 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
                <span class="material-icons text-sm">rocket_launch</span>
                <span>Load Sample Onboarding Tasks</span>
              </button>

              <button (click)="clearAllTasks()" 
                      class="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
                <span class="material-icons text-sm">delete_forever</span>
                <span>Clear All Workspace Tasks</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  `,
})
export class Profile {
  taskManager = inject(TaskManager);
  private router = inject(Router);

  diagnosisMessage = computed(() => {
    const rate = this.taskManager.stats().completionRate;
    const total = this.taskManager.stats().total;

    if (total === 0) {
      return 'No scheduling data loaded yet. Add tasks with deadlines on the dashboard to trigger cognitive priority assessments!';
    }
    
    if (rate >= 80) {
      return 'Exceptional Cognitive Mastery. Your completion index shows absolute control over deadline deadlines. Your risk of task stress is currently optimal.';
    } else if (rate >= 50) {
      return 'Controlled Momentum. You are progressing through milestones steadily, but some critical tasks remain. Trigger a dynamic Gemini re-prioritization to optimize workflow.';
    } else {
      return 'Urgent Overload threat detected. Task backlogs are accumulating faster than resolution speed. Use Gemini AI to break down pending critical blockers into smaller digestible steps.';
    }
  });

  logout() {
    this.taskManager.logout();
    this.router.navigate(['/login']);
  }

  resetDemoData() {
    if (confirm('Load sample onboarding tasks? Your current temporary items will be overwritten.')) {
      const user = this.taskManager.currentUser();
      if (user) {
        const demo = this.taskManager.getDemoTasks(user.id);
        this.taskManager.tasks.set(demo);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`lifesaver_tasks_${user.id}`, JSON.stringify(demo));
        }
      }
    }
  }

  clearAllTasks() {
    if (confirm('Are you sure you want to clear ALL task records in your workspace database? This action is permanent.')) {
      const user = this.taskManager.currentUser();
      if (user) {
        this.taskManager.tasks.set([]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`lifesaver_tasks_${user.id}`, JSON.stringify([]));
        }
      }
    }
  }
}
