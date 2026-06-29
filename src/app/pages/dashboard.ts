import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TaskManager, Task } from '../services/task-manager';
import { CalendarService, CalendarEvent } from '../services/calendar';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  selector: 'app-dashboard',
  template: `
    <!-- Top Action Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
      <div>
        <h2 class="font-display font-bold text-2xl text-slate-900">Dashboard</h2>
        <p class="text-xs text-slate-500 mt-0.5">
          @if (taskManager.currentUser()?.name) {
            Welcome back, {{ taskManager.currentUser()?.name }}! Manage your tasks effectively.
          } @else {
            Welcome back! Manage your tasks effectively.
          }
        </p>
      </div>
      
      <div class="flex flex-wrap items-center gap-3">
        <!-- Re-Prioritize Trigger -->
        <button (click)="runPrioritization()"
                [disabled]="taskManager.loadingPrioritization() || taskManager.tasks().length === 0"
                class="px-4 py-2.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                id="btn-re-prioritize"
                title="Let AI analyze and sort your tasks by priority">
          <span class="material-icons text-sm" [class.animate-spin]="taskManager.loadingPrioritization()">auto_awesome</span>
          <span>{{ taskManager.loadingPrioritization() ? 'Sorting Tasks...' : 'Auto-Sort Tasks (AI)' }}</span>
        </button>

        <!-- Create Task Link -->
        <a routerLink="/create-task" 
           class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
           id="btn-new-task">
          <span class="material-icons text-sm">add</span>
          <span>Add New Task</span>
        </a>
      </div>
    </div>

    <!-- Error Banner -->
    @if (taskManager.aiError()) {
      <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
        <span class="material-icons text-red-500 text-lg shrink-0">error_outline</span>
        <div class="flex-1">
          <h5 class="text-xs font-bold text-slate-800">Priority Assessment Notice</h5>
          <p class="text-2xs text-red-600 mt-0.5 leading-relaxed">{{ taskManager.aiError() }}</p>
        </div>
      </div>
    }

    <!-- Performance Metrics Bar -->
    <section class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time Rate</span>
          <span class="material-icons text-indigo-500 text-lg">insights</span>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-display font-bold text-slate-900">{{ taskManager.stats().completionRate }}%</span>
        </div>
        <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
          <div class="bg-indigo-600 h-full transition-all duration-500" [style.width.%]="taskManager.stats().completionRate"></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tasks</span>
          <span class="material-icons text-slate-400 text-lg">checklist_rtl</span>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-display font-bold text-slate-900">{{ taskManager.stats().pending }}</span>
          <span class="text-xs text-slate-400">/ {{ taskManager.stats().total }} total</span>
        </div>
        <p class="text-[10px] text-slate-400 mt-3 font-medium">Ready to execute</p>
      </div>

      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
          <span class="material-icons text-emerald-500 text-lg">check_circle</span>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-display font-bold text-emerald-600">{{ taskManager.stats().completed }}</span>
        </div>
        <p class="text-[10px] text-emerald-600 font-semibold mt-3 font-mono">Tasks secured</p>
      </div>

      <div class="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm"
           [class.border-red-200]="taskManager.stats().looming > 0"
           [class.bg-red-50/10]="taskManager.stats().looming > 0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">24H Looming</span>
          <span class="material-icons text-red-500 text-lg" [class.animate-pulse]="taskManager.stats().looming > 0">error_outline</span>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-3xl font-display font-bold" [class.text-red-500]="taskManager.stats().looming > 0" [class.text-slate-900]="taskManager.stats().looming === 0">
            {{ taskManager.stats().looming }}
          </span>
        </div>
        <p class="text-[10px] mt-3" [class.text-red-600]="taskManager.stats().looming > 0" [class.text-slate-400]="taskManager.stats().looming === 0">
          {{ taskManager.stats().looming > 0 ? 'Urgent threat detected' : 'Schedule is safe' }}
        </p>
      </div>
    </section>

    <!-- ONBOARDING CARD FOR NEW USERS -->
    @if (taskManager.tasks().length === 0) {
      <div class="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl shadow-xs" id="onboarding-card">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <span class="material-icons text-3xl">task</span>
          </div>
          <div class="flex-grow text-center md:text-left space-y-1">
            <h3 class="font-display font-bold text-sm text-slate-950">Welcome to your AI Task Manager!</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              This is your main dashboard. To get started, click <strong>Add New Task</strong> above to add your first item to the list, or connect your calendar to see real-time conflicts.
            </p>
          </div>
          <a routerLink="/create-task" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer">
            <span class="material-icons text-sm">add</span>
            <span>Add Your First Task</span>
          </a>
        </div>
      </div>
    }

    <!-- ACCOUNTABILITY AGENT MINI-BANNER -->
    @if (hasActiveTasks()) {
      <div class="mb-8 p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-800/20 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-indigo-600/30 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-500/20">
            <span class="material-icons text-2xl animate-pulse">psychology</span>
          </div>
          <div class="space-y-1">
            <h4 class="font-display font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              AI Coach: Review Your Progress
              @if (taskManager.stats().looming > 0) {
                <span class="bg-red-500 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm animate-pulse">
                  Urgent
                </span>
              }
            </h4>
            <p class="text-xs text-indigo-200 leading-relaxed max-w-2xl">
              Get an AI-guided check-in. Review your tasks, identify roadblocks, and let the AI build a step-by-step plan to help you get started.
            </p>
          </div>
        </div>
        
        <a routerLink="/accountability"
           class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:scale-[1.02] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
           id="dash-start-checkin">
          <span class="material-icons text-sm">psychology</span>
          <span>Start AI Review</span>
        </a>
      </div>
    }

    <!-- Global Workspace Bento Layout -->
    <div class="space-y-8">
      
      <!-- WIDGET 1: AI RECOMMENDED TASK (Hero focus widget) -->
      <section class="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <!-- skewed dynamic accent -->
        <div class="absolute right-0 top-0 w-80 h-full bg-white/5 -skew-x-12 transform translate-x-12 pointer-events-none"></div>
        
        <div class="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="material-icons text-indigo-300">auto_awesome</span>
            <h3 class="font-display font-bold text-sm uppercase tracking-wider">Top Priority Task</h3>
          </div>
          <span class="bg-indigo-500 text-white text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm">
            AI Recommended
          </span>
        </div>

        @if (taskManager.recommendedTask()) {
          <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 items-center">
            
            <div class="md:col-span-2 space-y-4">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded-md font-semibold uppercase">
                  Score {{ taskManager.recommendedTask()?.priorityScore }}/100
                </span>
                
                @switch (taskManager.recommendedTask()?.urgency) {
                  @case ('critical') {
                    <span class="bg-red-500/20 text-red-200 border border-red-500/30 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">Critical</span>
                  }
                  @case ('high') {
                    <span class="bg-orange-500/20 text-orange-200 border border-orange-500/30 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">High</span>
                  }
                  @default {
                    <span class="bg-indigo-800/40 text-indigo-200 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">Standard</span>
                  }
                }

                <span class="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                  <span class="material-icons text-xs">schedule</span>
                  {{ taskManager.getRemainingTime(taskManager.recommendedTask()!.deadline).text }}
                </span>
              </div>

              <h4 class="font-display font-bold text-xl md:text-2xl text-white tracking-tight leading-snug">
                {{ taskManager.recommendedTask()?.title }}
              </h4>

              <p class="text-xs text-indigo-100 leading-relaxed max-w-xl">
                {{ taskManager.recommendedTask()?.description || 'No description available. Get details in the console.' }}
              </p>

              <!-- Recommendation statement from Gemini -->
              <div class="p-3 bg-indigo-950/60 border border-indigo-800/30 rounded-xl flex items-start gap-2.5 text-xs italic text-indigo-200">
                <span class="material-icons text-indigo-400 text-sm shrink-0 mt-0.5">auto_awesome</span>
                <p>"{{ taskManager.recommendedTask()?.aiRecommendationReason }}"</p>
              </div>
            </div>

            <!-- Focus Actions side-panel -->
            <div class="bg-indigo-950/40 border border-white/5 rounded-2xl p-5 space-y-4 text-center">
              <span class="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">Task Progress</span>
              
              <!-- Progress bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-2xs font-mono text-indigo-200">
                  <span>{{ getCompletedSubtasksCount(taskManager.recommendedTask()!) }} of {{ taskManager.recommendedTask()?.subtasks?.length || 0 }} steps completed</span>
                  <span>{{ taskManager.recommendedTask()?.progress }}%</span>
                </div>
                <div class="w-full bg-indigo-950 h-2 rounded-full overflow-hidden border border-white/5">
                  <div class="bg-emerald-400 h-full transition-all duration-300" [style.width.%]="taskManager.recommendedTask()?.progress"></div>
                </div>
              </div>

              <button [routerLink]="['/task-details', taskManager.recommendedTask()?.id]"
                      class="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all">
                <span class="material-icons text-sm">visibility</span>
                <span>Open Task Details</span>
              </button>
            </div>

          </div>
        } @else {
          <!-- Empty focus advisor state -->
          <div class="text-center py-8 relative z-10 space-y-2">
            <span class="material-icons text-emerald-400 text-4xl">verified</span>
            <h4 class="text-sm font-semibold text-white">All Clear! No Pending Priority Tasks</h4>
            <p class="text-xs text-indigo-200 max-w-md mx-auto">
              You have no active tasks that require immediate attention. When you add tasks, the AI will recommend which one to start first here.
            </p>
          </div>
        }
      </section>

      <!-- BOTTOM ROW WIDGETS: TODAY'S TASKS vs UPCOMING DEADLINES vs GOOGLE CALENDAR -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- WIDGET 2: TODAY'S TASKS (Due Today / Overdue) -->
        <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[420px]">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <span class="material-icons text-red-500">today</span>
              <h3 class="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Widget: Today's Tasks</h3>
            </div>
            <span class="bg-red-50 text-red-600 text-2xs font-bold px-2 py-0.5 rounded-full font-mono">
              {{ todaysTasks().length }} Active
            </span>
          </div>

          <!-- List block -->
          <div class="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-1">
            @if (todaysTasks().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                <span class="material-icons text-emerald-500 text-3xl">task_alt</span>
                <h4 class="text-xs font-semibold text-slate-700">No overdue or tasks due today!</h4>
                <p class="text-2xs text-slate-400">All imminent timeline requirements are secure.</p>
              </div>
            } @else {
              @for (task of todaysTasks(); track task.id) {
                <div [routerLink]="['/task-details', task.id]"
                     class="p-4 border border-slate-100 rounded-2xl hover:border-red-300 hover:shadow-sm bg-slate-50/30 transition-all cursor-pointer flex flex-col gap-2 relative">
                  
                  <!-- Alert skew line if critical/overdue -->
                  @if (taskManager.getRemainingTime(task.deadline).isOverdue) {
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl"></div>
                  }

                  <div class="flex justify-between items-start gap-2">
                    <h5 class="text-xs font-bold text-slate-800 line-clamp-1 break-all flex-1">
                      {{ task.title }}
                    </h5>
                    
                    <span [class]="taskManager.getRemainingTime(task.deadline).isOverdue ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'"
                          class="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md font-mono shrink-0">
                      {{ taskManager.getRemainingTime(task.deadline).text }}
                    </span>
                  </div>

                  <!-- Mini details -->
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span class="flex items-center gap-1">
                      <span class="material-icons text-xs">tune</span>
                      Urgency: <strong class="text-slate-600 uppercase">{{ task.urgency }}</strong>
                    </span>
                    <span>{{ task.subtasks.length }} steps ({{ getCompletedSubtasksCount(task) }} done)</span>
                  </div>

                  @if (task.subtasks.length > 0) {
                    <div class="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                      <div class="bg-indigo-600 h-full transition-all duration-300" [style.width.%]="task.progress"></div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </section>

        <!-- WIDGET 3: UPCOMING DEADLINES (Next 7 Days) -->
        <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[420px]">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <span class="material-icons text-indigo-500">event_note</span>
              <h3 class="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Widget: Upcoming Deadlines</h3>
            </div>
            <span class="bg-indigo-50 text-indigo-600 text-2xs font-bold px-2 py-0.5 rounded-full font-mono">
              {{ upcomingTasks().length }} Active
            </span>
          </div>

          <!-- List block -->
          <div class="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-1">
            @if (upcomingTasks().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                <span class="material-icons text-slate-300 text-3xl">calendar_today</span>
                <h4 class="text-xs font-semibold text-slate-700">No deadlines in the next 7 days!</h4>
                <p class="text-2xs text-slate-400">Schedule looks highly manageable.</p>
              </div>
            } @else {
              @for (task of upcomingTasks(); track task.id) {
                <div [routerLink]="['/task-details', task.id]"
                     class="p-4 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-sm bg-slate-50/30 transition-all cursor-pointer flex flex-col gap-2">
                  
                  <div class="flex justify-between items-start gap-2">
                    <h5 class="text-xs font-bold text-slate-800 line-clamp-1 break-all flex-1">
                      {{ task.title }}
                    </h5>
                    
                    <span class="bg-indigo-50 text-indigo-600 text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md font-mono shrink-0">
                      {{ taskManager.getRemainingTime(task.deadline).text }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span class="flex items-center gap-1">
                      <span class="material-icons text-xs">schedule</span>
                      Due: {{ task.deadline | date:'shortDate' }}
                    </span>
                    <span>{{ task.subtasks.length }} steps ({{ getCompletedSubtasksCount(task) }} done)</span>
                  </div>

                  @if (task.subtasks.length > 0) {
                    <div class="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                      <div class="bg-indigo-600 h-full transition-all duration-300" [style.width.%]="task.progress"></div>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </section>

        <!-- WIDGET 4: GOOGLE CALENDAR EVENTS -->
        <section class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[420px]">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <span class="material-icons" [class.text-indigo-600]="calendarService.isConnected()" [class.text-slate-400]="!calendarService.isConnected()">calendar_today</span>
              <h3 class="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Widget: Google Calendar</h3>
            </div>
            @if (calendarService.isConnected()) {
              <span class="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Sync
              </span>
            } @else {
              <span class="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Demo Simulation
              </span>
            }
          </div>

          <!-- Connection Banner / CTA if not connected -->
          @if (!calendarService.isConnected()) {
            <div class="mb-4 p-3.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl text-left space-y-2.5">
              <p class="text-[11px] text-indigo-950 font-medium leading-normal">
                Avoid deadline misses by coordinating with your actual work events. Connect your primary Google Calendar.
              </p>
              <button (click)="connectCalendar()"
                      [disabled]="calendarService.loadingEvents()"
                      class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      id="btn-connect-calendar">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.2-.2-.41-.3-.63z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Connect Google Calendar</span>
              </button>
            </div>
          } @else {
            <!-- Disconnect link -->
            <div class="flex justify-between items-center mb-3">
              <span class="text-[9px] text-slate-400 font-mono truncate">Synced to Google Account</span>
              <button (click)="disconnectCalendar()" 
                      class="text-[9px] text-red-500 hover:text-red-700 font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
                      id="btn-disconnect-calendar">
                <span class="material-icons text-xs">power_settings_new</span>
                Disconnect
              </button>
            </div>
          }

          <!-- Events Listing -->
          <div class="flex-1 overflow-y-auto space-y-2.5 max-h-[340px] pr-1">
            @if (calendarService.loadingEvents()) {
              <div class="h-full flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <span class="material-icons text-indigo-500 text-3xl animate-spin">sync</span>
                <span class="text-xs">Fetching Google Calendar...</span>
              </div>
            } @else if (calendarService.events().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                <span class="material-icons text-slate-300 text-3xl">calendar_today</span>
                <h4 class="text-xs font-semibold text-slate-700">No upcoming events found</h4>
                <p class="text-[10px] text-slate-400 leading-normal">Your schedule is completely clear for the next 7 days.</p>
              </div>
            } @else {
              @for (event of calendarService.events(); track event.id) {
                <div class="p-3 border border-slate-100 rounded-xl hover:border-indigo-100 hover:shadow-xs bg-slate-50/10 hover:bg-slate-50/40 transition-all flex flex-col gap-1">
                  <div class="flex justify-between items-start gap-2">
                    <h5 class="text-xs font-bold text-slate-800 leading-tight line-clamp-2 break-all">
                      {{ event.summary }}
                    </h5>
                    
                    @if (isEventBusyWithTasks(event)) {
                      <span class="bg-amber-50 text-amber-800 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0"
                            title="Task deadlines occur close to or during this busy period!">
                        <span class="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                        Overlap
                      </span>
                    }
                  </div>

                  @if (event.description) {
                    <p class="text-[10px] text-slate-500 leading-normal line-clamp-1 italic">{{ event.description }}</p>
                  }

                  <div class="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <span class="material-icons text-[11px] shrink-0">access_time</span>
                    <span>{{ getFormattedEventTime(event) }}</span>
                  </div>
                </div>
              }
            }
          </div>
        </section>

      </div>

      <!-- WORKSPACE ARCHIVE SECTION: COMPLETED & FAR FUTURE TASKS -->
      <section class="bg-slate-50 border border-slate-100 rounded-3xl p-6">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">All Workspace Tasks (History & Backlog)</h4>
          <span class="text-2xs text-slate-400 font-mono">Search & Filter Active Workspace Items Below</span>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <!-- Search & Status filter row -->
          <div class="flex flex-wrap items-center gap-3 justify-between">
            <div class="flex flex-wrap items-center gap-3">
              <!-- Search bar -->
              <div class="relative w-full sm:w-60">
                <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                <input type="text" 
                       [value]="taskManager.searchQuery()" 
                       (input)="taskManager.searchQuery.set($any($event.target).value)"
                       placeholder="Search all tasks..." 
                       class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50" />
              </div>

              <!-- Status Filters -->
              <div class="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button (click)="taskManager.filterStatus.set('all')" 
                        [class]="taskManager.filterStatus() === 'all' ? 'px-2.5 py-1 text-2xs font-semibold rounded-md bg-white text-slate-900 shadow-sm' : 'px-2.5 py-1 text-2xs font-medium rounded-md text-slate-500 hover:text-slate-900'">
                  All
                </button>
                <button (click)="taskManager.filterStatus.set('pending')" 
                        [class]="taskManager.filterStatus() === 'pending' ? 'px-2.5 py-1 text-2xs font-semibold rounded-md bg-white text-slate-900 shadow-sm' : 'px-2.5 py-1 text-2xs font-medium rounded-md text-slate-500 hover:text-slate-900'">
                  Active
                </button>
                <button (click)="taskManager.filterStatus.set('completed')" 
                        [class]="taskManager.filterStatus() === 'completed' ? 'px-2.5 py-1 text-2xs font-semibold rounded-md bg-white text-slate-900 shadow-sm' : 'px-2.5 py-1 text-2xs font-medium rounded-md text-slate-500 hover:text-slate-900'">
                  Completed
                </button>
              </div>

              <!-- Urgency Dropdown -->
              <select [value]="taskManager.filterUrgency()" 
                      (change)="taskManager.filterUrgency.set($any($event.target).value)"
                      class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="all">All Urgency</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
          </div>

          <!-- Search list mapping -->
          <div class="space-y-3 pt-2">
            @if (taskManager.filteredTasks().length === 0) {
              <p class="text-center py-6 text-2xs text-slate-400 italic">No search results match current queries.</p>
            } @else {
              @for (task of taskManager.filteredTasks(); track task.id) {
                <div class="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <button (click)="toggleCompletion(task, $event)" 
                            class="inline-flex items-center justify-center p-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
                      @if (task.status === 'completed') {
                        <span class="material-icons text-indigo-600 text-lg">check_box</span>
                      } @else {
                        <span class="material-icons text-slate-300 hover:text-slate-400 text-lg">check_box_outline_blank</span>
                      }
                    </button>

                    <div class="min-w-0 flex-1">
                      <a [routerLink]="['/task-details', task.id]" 
                         class="text-xs font-semibold text-slate-800 hover:text-indigo-600 transition-colors block truncate">
                        {{ task.title }}
                      </a>
                      <p class="text-[10px] text-slate-400 mt-0.5 font-mono">Due: {{ task.deadline | date:'short' }} | Score: {{ task.priorityScore }}</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 ml-4 shrink-0">
                    <span [class]="task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                          class="text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {{ task.status }}
                    </span>
                    
                    <button (click)="deleteTask(task.id, $event)"
                            class="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg cursor-pointer transition-colors">
                      <span class="material-icons text-base">delete</span>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </section>

    </div>
  `,
})
export class Dashboard {
  taskManager = inject(TaskManager);
  calendarService = inject(CalendarService);
  router = inject(Router);

  hasActiveTasks = computed(() => {
    return this.taskManager.tasks().some(t => t.status !== 'completed');
  });

  connectCalendar() {
    this.calendarService.connect();
  }

  disconnectCalendar() {
    this.calendarService.disconnect();
  }

  isEventBusyWithTasks(event: CalendarEvent): boolean {
    const evStart = new Date(event.start.dateTime || event.start.date || '').getTime();
    const evEnd = new Date(event.end.dateTime || event.end.date || '').getTime();
    if (isNaN(evStart) || isNaN(evEnd)) return false;

    // Check if any active task deadline is inside or near this event
    return this.taskManager.tasks().some(t => {
      if (t.status === 'completed') return false;
      const deadline = new Date(t.deadline).getTime();
      // If task is due within the event, or within 30 minutes of it
      return (deadline >= evStart - 30 * 60 * 1000) && (deadline <= evEnd + 30 * 60 * 1000);
    });
  }

  getFormattedEventTime(event: CalendarEvent): string {
    const startStr = event.start.dateTime || event.start.date || '';
    const endStr = event.end.dateTime || event.end.date || '';
    if (!startStr) return 'All Day';

    const start = new Date(startStr);
    const end = new Date(endStr);

    const isAllDay = !event.start.dateTime;
    if (isAllDay) {
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (All Day)`;
    }

    const startDay = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

    // Check if start and end are on the same day
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return `${startDay}, ${startTime} - ${endTime}`;
    } else {
      const endDay = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `${startDay} ${startTime} - ${endDay} ${endTime}`;
    }
  }

  todaysTasks = computed(() => {
    const list = this.taskManager.tasks();
    const now = new Date();
    // Start of today (local time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // End of today (local time)
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    return list.filter(t => {
      if (t.status === 'completed') return false;
      const deadlineTime = new Date(t.deadline).getTime();
      // Due today or overdue
      return deadlineTime <= todayEnd;
    });
  });

  upcomingTasks = computed(() => {
    const list = this.taskManager.tasks();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    // Next 7 days
    const sevenDaysLater = todayEnd + 7 * 24 * 60 * 60 * 1000;

    return list.filter(t => {
      if (t.status === 'completed') return false;
      const deadlineTime = new Date(t.deadline).getTime();
      return deadlineTime > todayEnd && deadlineTime <= sevenDaysLater;
    });
  });

  toggleCompletion(task: Task, event: Event) {
    event.stopPropagation();
    this.taskManager.toggleTaskCompletion(task);
  }

  getCompletedSubtasksCount(task: Task): number {
    return task.subtasks.filter(s => s.completed).length;
  }

  deleteTask(taskId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this task?')) {
      this.taskManager.deleteTask(taskId);
    }
  }

  runPrioritization() {
    this.taskManager.runAIPrioritization();
  }
}
