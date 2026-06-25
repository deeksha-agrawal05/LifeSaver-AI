import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskManager } from '../services/task-manager';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-task-details',
  template: `
    <div class="max-w-3xl mx-auto">
      
      <!-- Back to Dashboard Navigation -->
      <div class="mb-6 flex items-center justify-between">
        <a routerLink="/dashboard" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
          <span class="material-icons text-base">arrow_back</span>
          <span>Back to Dashboard</span>
        </a>
        
        <span class="text-xs text-slate-400 font-mono">Task ID: {{ taskId() }}</span>
      </div>

      @if (task()) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- LEFT/MAIN COLUMN: Task Header & Description & Checklist -->
          <div class="md:col-span-2 space-y-6">
            
            <!-- Core Details -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div class="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <h2 class="font-display font-bold text-xl text-slate-900 tracking-tight leading-snug break-words flex-1">
                  {{ task()?.title }}
                </h2>
                
                <button (click)="toggleMainCompletion()" 
                        class="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer border shrink-0"
                        [class]="task()?.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'">
                  {{ task()?.status === 'completed' ? 'Completed' : 'Mark Completed' }}
                </button>
              </div>

              @if (task()?.description) {
                <div>
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Background & Details</h4>
                  <p class="text-slate-700 text-sm leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-100/50 whitespace-pre-line">
                    {{ task()?.description }}
                  </p>
                </div>
              } @else {
                <p class="text-xs text-slate-400 italic">No description details loaded for this task.</p>
              }
            </div>

            <!-- CHECKLIST ENGINE -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Required Steps List</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Deconstruct targets into sequential steps.</p>
                </div>
                
                <!-- Regenerate subtasks button -->
                <button (click)="regenerateAISubtasks()"
                        [disabled]="taskManager.loadingSubtasks()"
                        class="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  @if (taskManager.loadingSubtasks()) {
                    <span class="material-icons animate-spin text-xs">autorenew</span>
                    <span>Decomposing Goal...</span>
                  } @else {
                    <span class="material-icons text-xs">auto_awesome</span>
                    <span>Regenerate with AI</span>
                  }
                </button>
              </div>

              <!-- Subtasks checklist -->
              @if (task()!.subtasks.length > 0) {
                <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                  @for (sub of task()!.subtasks; track sub.id) {
                    <div class="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100/50">
                      <label class="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                        <input type="checkbox" 
                               [checked]="sub.completed" 
                               (change)="toggleSubtask(sub.id)"
                               class="mt-0.5 h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" />
                        <div class="min-w-0 flex-1">
                          <span [class.line-through]="sub.completed" 
                                [class.text-slate-400]="sub.completed"
                                class="text-xs font-semibold text-slate-850 break-words leading-relaxed block">
                            {{ sub.title }}
                          </span>
                          <div class="flex items-center text-[9px] text-slate-400 font-mono mt-0.5">
                            <span class="material-icons text-[10px] mr-0.5">hourglass_bottom</span>
                            <span>{{ sub.estimatedMinutes }}m estimated efforts</span>
                          </div>
                        </div>
                      </label>

                      <button (click)="deleteSubtask(sub.id)" 
                              class="text-slate-400 hover:text-red-500 p-1.5 cursor-pointer rounded-lg transition-colors hover:bg-red-50"
                              title="Delete step">
                        <span class="material-icons text-sm">delete_outline</span>
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-8 bg-slate-50 border border-slate-100/50 rounded-2xl">
                  <span class="material-icons text-slate-300 text-4xl mb-2">subdirectory_arrow_right</span>
                  <h4 class="text-xs font-bold text-slate-600">No Actionable Subtasks Available</h4>
                  <p class="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto font-medium">Use the "Regenerate with AI" button above to dynamically load logical subtasks for this workload.</p>
                </div>
              }

              <!-- Add manual subtask form -->
              <form [formGroup]="subtaskForm" (ngSubmit)="addSubtaskManually()" 
                    class="p-4 bg-slate-50 border border-slate-100/50 rounded-xl space-y-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add Custom Subtask</span>
                
                <div class="flex flex-col sm:flex-row gap-2">
                  <input type="text" formControlName="title" placeholder="e.g. Conduct proofreading review"
                         class="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500" />
                  
                  <div class="flex gap-1.5 shrink-0">
                    <input type="number" formControlName="estimatedMinutes" placeholder="Mins"
                           class="w-16 px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white text-center focus:outline-none focus:border-indigo-500 font-mono" />
                    
                    <button type="submit" [disabled]="subtaskForm.invalid"
                            class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer disabled:opacity-50 transition-all">
                      <span class="material-icons text-sm mr-1">add</span>
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <!-- RESCUE ACTIVE CONSOLE -->
            @if (task()?.rescuePlan) {
              <div class="bg-slate-900 text-white rounded-2xl p-6 border border-amber-500/30 shadow-md space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-white/10">
                  <div class="flex items-center gap-2 text-amber-400">
                    <span class="material-icons text-lg">bolt</span>
                    <h3 class="font-display font-semibold text-xs uppercase tracking-wider">Active Rescue Console</h3>
                  </div>
                  <span class="text-[9px] font-mono text-slate-400">Calculated {{ task()!.rescuePlan!.calculatedAt | date:'shortTime' }}</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/5">
                  <div class="space-y-1">
                    <span class="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Probability of Missing Deadline</span>
                    <div class="flex items-center gap-2">
                      <span class="text-2xl font-bold font-mono"
                            [class.text-red-500]="task()!.rescuePlan!.probabilityOfMissing >= 75"
                            [class.text-amber-500]="task()!.rescuePlan!.probabilityOfMissing >= 40 && task()!.rescuePlan!.probabilityOfMissing < 75"
                            [class.text-emerald-400]="task()!.rescuePlan!.probabilityOfMissing < 40">
                        {{ task()!.rescuePlan!.probabilityOfMissing }}%
                      </span>
                      <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full transition-all duration-500"
                             [class.bg-red-500]="task()!.rescuePlan!.probabilityOfMissing >= 75"
                             [class.bg-amber-500]="task()!.rescuePlan!.probabilityOfMissing >= 40 && task()!.rescuePlan!.probabilityOfMissing < 75"
                             [class.bg-emerald-400]="task()!.rescuePlan!.probabilityOfMissing < 40"
                             [style.width.%]="task()!.rescuePlan!.probabilityOfMissing">
                        </div>
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400">
                      {{ task()!.rescuePlan!.probabilityOfMissing >= 75 ? 'Critical Risk: Immediate triage required' : (task()!.rescuePlan!.probabilityOfMissing >= 40 ? 'Moderate Risk: Keep focus' : 'Safe Window: On-track') }}
                    </p>
                  </div>

                  <div class="space-y-1">
                    <span class="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Triage Diagnostics</span>
                    <div class="text-xs space-y-1">
                      <div class="flex justify-between">
                        <span class="text-slate-400">Total remaining efforts:</span>
                        <span class="font-bold font-mono text-indigo-300">{{ getRemainingEffortsMinutes() }}m</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-400">Available time window:</span>
                        <span class="font-bold font-mono text-emerald-400">{{ getAvailableMinutesText() }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-2 text-xs text-slate-300">
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gemini Tactical Rescue Plan</span>
                  <div class="p-4 bg-slate-950/40 rounded-xl border border-white/5 overflow-x-auto leading-relaxed whitespace-pre-line"
                       [innerHTML]="getFormattedRescuePlan()">
                  </div>
                </div>
              </div>
            }

          </div>

          <!-- RIGHT/SIDE COLUMN: Metrics & AI Advice & Actions -->
          <div class="md:col-span-1 space-y-6">
            
            <!-- Deadline & Urgent Panel -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule & Urgency</h3>
              
              <div class="space-y-3">
                <div>
                  <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remaining Time</span>
                  <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-1"
                       [class.text-red-500]="taskManager.getRemainingTime(task()!.deadline).isLooming">
                    <span class="material-icons text-sm" [class.animate-pulse]="taskManager.getRemainingTime(task()!.deadline).isLooming">timer</span>
                    <span>{{ taskManager.getRemainingTime(task()!.deadline).text }}</span>
                  </div>
                </div>

                <div>
                  <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deadline Target</span>
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-1">
                    <span class="material-icons text-sm">calendar_today</span>
                    <span class="truncate">{{ task()!.deadline | date:'medium' }}</span>
                  </div>
                </div>

                <div>
                  <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Urgency Level</span>
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mt-1">
                    @switch (task()?.urgency) {
                      @case ('critical') {
                        <span class="bg-red-50 text-red-600 border border-red-200 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider animate-pulse">Critical Blocker</span>
                      }
                      @case ('high') {
                        <span class="bg-orange-50 text-orange-600 border border-orange-200 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider">High Priority</span>
                      }
                      @case ('medium') {
                        <span class="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider">Medium Priority</span>
                      }
                      @case ('low') {
                        <span class="bg-slate-50 text-slate-500 border border-slate-100 text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider">Low Priority</span>
                      }
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Rescue Mode Activation Trigger -->
            @if (task()?.status !== 'completed') {
              <div class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3 shadow-sm">
                <div class="flex items-center gap-1.5 text-amber-700">
                  <span class="material-icons text-sm">bolt</span>
                  <span class="text-xs font-bold uppercase tracking-wider">Emergency Rescue</span>
                </div>
                <p class="text-[11px] text-slate-500 leading-normal">
                  If this task is close to its deadline, trigger Rescue Mode. Gemini will analyze remaining steps, available time, reorder priorities, and formulate an emergency plan.
                </p>
                <button (click)="triggerRescueMode()"
                        [disabled]="taskManager.loadingRescue()"
                        class="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
                        id="btn-rescue-mode">
                  @if (taskManager.loadingRescue()) {
                    <span class="material-icons text-xs animate-spin">sync</span>
                    <span>Triage active...</span>
                  } @else {
                    <span class="material-icons text-xs">run_circle</span>
                    <span>Activate Rescue Mode</span>
                  }
                </button>
              </div>
            }

            <!-- Gemini AI priority diagnostics -->
            @if (task()!.status !== 'completed' && task()!.priorityScore > 0) {
              <div class="bg-indigo-900 text-white border border-indigo-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
                <!-- Decorative element -->
                <div class="absolute right-0 top-0 w-32 h-full bg-indigo-800/20 -skew-x-12 transform translate-x-10 pointer-events-none"></div>
                
                <div class="relative z-10 space-y-3">
                  <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    <span class="material-icons text-sm">psychology</span>
                    <span>Gemini Priority Diagnosis</span>
                  </div>
                  
                  <p class="text-xs italic text-indigo-100 leading-relaxed">
                    "{{ task()?.aiRecommendationReason }}"
                  </p>
                  
                  <div class="pt-3 border-t border-indigo-800 flex items-center justify-between text-[10px] text-indigo-200 font-medium">
                    <span>Intelligent Priority Level</span>
                    <span class="font-mono text-indigo-300 font-bold bg-indigo-950/50 px-2 py-0.5 rounded-sm">Threat: {{ task()?.priorityScore }}/100</span>
                  </div>
                </div>
              </div>
            }

            <!-- Workload progress percentage details -->
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Goal Completion Progress</span>
              <div class="flex items-center gap-3">
                <div class="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div class="bg-indigo-600 h-full transition-all duration-300" [style.width.%]="task()!.progress"></div>
                </div>
                <span class="font-mono text-xs font-bold text-slate-700">{{ task()!.progress }}%</span>
              </div>
              <p class="text-[9px] text-slate-400 leading-normal">Derived dynamically based on subtask checklists above.</p>
            </div>

            <!-- Deletion and Action toolbar -->
            <div class="space-y-2">
              <button (click)="deleteTask()" 
                      class="w-full py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      [attr.id]="'btn-delete-task-' + task()?.id">
                <span class="material-icons text-sm">delete</span>
                <span>Delete LifeSaver Task</span>
              </button>
            </div>

          </div>

        </div>
      } @else {
        <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto">
          <span class="material-icons text-slate-350 text-5xl mb-4">search_off</span>
          <h3 class="font-display font-bold text-lg text-slate-800">Task Not Found</h3>
          <p class="text-xs text-slate-500 mt-1 leading-normal">This task item could not be retrieved from the active workspace database. It may have been deleted or the session has expired.</p>
          <a routerLink="/dashboard" class="mt-6 inline-flex py-2 px-4 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors">
            Return to Dashboard
          </a>
        </div>
      }

    </div>
  `,
})
export class TaskDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  taskManager = inject(TaskManager);
  private fb = inject(FormBuilder);

  taskId = signal<string | null>(null);

  task = computed(() => {
    const id = this.taskId();
    if (!id) return null;
    return this.taskManager.tasks().find(t => t.id === id) || null;
  });

  subtaskForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    estimatedMinutes: [15, [Validators.required, Validators.min(1)]]
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.taskId.set(params.get('id'));
    });
  }

  toggleMainCompletion() {
    const currentTask = this.task();
    if (currentTask) {
      this.taskManager.toggleTaskCompletion(currentTask);
    }
  }

  toggleSubtask(subtaskId: string) {
    const currentTask = this.task();
    if (currentTask) {
      this.taskManager.toggleSubtask(currentTask.id, subtaskId);
    }
  }

  deleteSubtask(subtaskId: string) {
    const currentTask = this.task();
    if (currentTask) {
      this.taskManager.deleteSubtask(currentTask.id, subtaskId);
    }
  }

  regenerateAISubtasks() {
    const currentTask = this.task();
    if (currentTask) {
      this.taskManager.generateAISubtasks(currentTask);
    }
  }

  addSubtaskManually() {
    const currentTask = this.task();
    if (currentTask && this.subtaskForm.valid) {
      const { title, estimatedMinutes } = this.subtaskForm.value;
      this.taskManager.addSubtaskManually(currentTask.id, title, estimatedMinutes);
      this.subtaskForm.patchValue({ title: '', estimatedMinutes: 15 });
      this.subtaskForm.markAsUntouched();
    }
  }

  deleteTask() {
    const currentTask = this.task();
    if (currentTask) {
      if (confirm('Are you absolutely sure you want to delete this task? This action is irreversible.')) {
        this.taskManager.deleteTask(currentTask.id);
        this.router.navigate(['/dashboard']);
      }
    }
  }

  triggerRescueMode() {
    const currentTask = this.task();
    if (currentTask) {
      this.taskManager.runRescueMode(currentTask);
    }
  }

  getRemainingEffortsMinutes(): number {
    const currentTask = this.task();
    if (!currentTask) return 0;
    return currentTask.subtasks
      .filter(s => !s.completed)
      .reduce((sum, s) => sum + s.estimatedMinutes, 0);
  }

  getAvailableMinutesText(): string {
    const currentTask = this.task();
    if (!currentTask) return '0m';
    const deadlineTime = new Date(currentTask.deadline).getTime();
    const nowTime = new Date().getTime();
    const diffMins = Math.round((deadlineTime - nowTime) / (1000 * 60));
    if (diffMins <= 0) return 'Overdue';
    if (diffMins < 60) return `${diffMins}m remaining`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m remaining`;
  }

  getFormattedRescuePlan(): string {
    const currentTask = this.task();
    if (!currentTask || !currentTask.rescuePlan) return '';
    let plan = currentTask.rescuePlan.emergencyPlan;
    // Format markdown bold
    plan = plan.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300 font-semibold">$1</strong>');
    // Format headings
    plan = plan.replace(/### (.*?)\n/g, '<h5 class="text-xs font-bold text-amber-400 uppercase tracking-wider mt-3 mb-1.5 border-b border-white/10 pb-1">$1</h5>');
    plan = plan.replace(/## (.*?)\n/g, '<h4 class="text-sm font-bold text-amber-300 tracking-tight mt-4 mb-2">$1</h4>');
    // Format bullet points
    plan = plan.replace(/^- (.*?)$/gm, '<div class="flex items-start gap-1.5 my-1 text-slate-300"><span class="text-amber-400 shrink-0 select-none">•</span><span>$1</span></div>');
    return plan;
  }
}
