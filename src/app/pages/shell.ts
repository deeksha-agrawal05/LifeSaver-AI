import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { TaskManager } from '../services/task-manager';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, RouterOutlet],
  selector: 'app-shell',
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors duration-300">
      
      <!-- Top App Bar Header -->
      <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <!-- Logo and Brand Title -->
          <div class="flex items-center gap-3">
            <a routerLink="/dashboard" class="flex items-center gap-3 group">
              <div class="flex items-center justify-center w-11 h-11 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors">
                <span class="material-icons text-2xl">hourglass_empty</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="font-display font-bold text-2xl tracking-tight text-slate-900">LifeSaver AI</h1>
                </div>
                <p class="text-xs text-slate-500">Intelligent workload & deadline scheduler</p>
              </div>
            </a>
          </div>

          <!-- Mid-section Navigation Links -->
          <nav class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar shrink-0">
            <a routerLink="/dashboard" 
               routerLinkActive="bg-white text-indigo-600 shadow-2xs border-slate-200/50 font-semibold" 
               [routerLinkActiveOptions]="{exact: true}"
               class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1.5 border border-transparent whitespace-nowrap shrink-0">
              <span class="material-icons text-sm shrink-0">dashboard</span>
              <span>Dashboard</span>
            </a>
            <a routerLink="/accountability" 
               routerLinkActive="bg-white text-indigo-600 shadow-2xs border-slate-200/50 font-semibold" 
               class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1.5 border border-transparent whitespace-nowrap shrink-0"
               id="nav-accountability">
              <span class="material-icons text-sm shrink-0">psychology</span>
              <span>Accountability</span>
            </a>
            <a routerLink="/profile" 
               routerLinkActive="bg-white text-indigo-600 shadow-2xs border-slate-200/50 font-semibold" 
               class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1.5 border border-transparent whitespace-nowrap shrink-0">
              <span class="material-icons text-sm shrink-0">account_circle</span>
              <span>Profile</span>
            </a>
          </nav>

          <!-- Quick Info & Action Bar -->
          <div class="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto shrink-0">
            
            <!-- User Tag -->
            <a routerLink="/profile" class="flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 transition-colors shrink-0">
              <span class="material-icons text-indigo-500 mr-1.5 text-sm shrink-0">person</span>
              <span class="truncate max-w-[100px] sm:max-w-none">{{ taskManager.currentUser()?.name || 'User' }}</span>
            </a>

            <!-- AI Priorities Button -->
            <button (click)="runAIOptimization()" 
                    [disabled]="taskManager.loadingPrioritization() || taskManager.tasks().length === 0"
                    [class]="taskManager.loadingPrioritization() ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-wait shrink-0' : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer hover:shadow-md shrink-0'"
                    id="btn-ai-prioritize">
              @if (taskManager.loadingPrioritization()) {
                <span class="material-icons animate-spin text-sm shrink-0">autorenew</span>
                <span class="hidden sm:inline">AI Optimizing Workload...</span>
                <span class="sm:hidden">Optimizing...</span>
              } @else {
                <span class="material-icons text-sm text-indigo-200 shrink-0">psychology</span>
                <span class="hidden sm:inline">Prioritize with Gemini AI</span>
                <span class="sm:hidden">Prioritize</span>
              }
            </button>

            <!-- Logout Button -->
            <button (click)="logout()" 
                    class="flex items-center justify-center p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0 ml-auto md:ml-0"
                    title="Sign Out"
                    id="btn-logout">
              <span class="material-icons text-lg shrink-0">logout</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Global AI Retry / Progress Banner -->
      @if (taskManager.aiService.isRetrying()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" id="ai-retry-banner">
          <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 shadow-xs animate-pulse">
            <span class="material-icons text-indigo-600 mt-0.5 animate-spin">sync</span>
            <div class="flex-1 min-w-0">
              <h4 class="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                AI Engine Optimizer is Active
                <span class="bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">
                  Retrying...
                </span>
              </h4>
              <p class="text-xs text-indigo-700 mt-1 leading-relaxed">
                {{ taskManager.aiService.statusMessage() }}
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Global AI Notification Banner -->
      @if (taskManager.aiError()) {
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div class="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 shadow-xs">
            <span class="material-icons text-red-600 mt-0.5">warning</span>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-red-800">Intelligence Gateway Alert</h4>
              <p class="text-xs text-red-700 mt-0.5 leading-relaxed">{{ taskManager.aiError() }}</p>
            </div>
            <button (click)="taskManager.aiError.set(null)" class="text-red-400 hover:text-red-600 cursor-pointer">
              <span class="material-icons text-sm">close</span>
            </button>
          </div>
        </div>
      }

      <!-- Main Shell Content Routing Container -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>
      
    </div>
  `,
})
export class Shell {
  router = inject(Router);
  taskManager = inject(TaskManager);

  runAIOptimization() {
    this.taskManager.runAIPrioritization();
  }

  logout() {
    this.taskManager.logout();
    this.router.navigate(['/login']);
  }
}
