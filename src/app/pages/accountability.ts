import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TaskManager, Task } from '../services/task-manager';

interface FeedbackItem {
  taskId: string;
  progressComment: string;
  blockerSelected: string;
}

interface TaskUpdateProposal {
  taskId: string;
  updatedPriorityScore: number;
  updatedUrgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedNextAction: string;
  actionEstMinutes: number;
  recommendationReason: string;
}

interface AuditResponse {
  generalAssessment: string;
  taskUpdates: TaskUpdateProposal[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  selector: 'app-accountability',
  template: `
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- PAGE HEADER -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-icons text-indigo-600 text-3xl">psychology</span>
            <h2 class="font-display font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight">AI Accountability Agent</h2>
          </div>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Your cognitive coach. Identify blockers, log status milestones, and let Gemini audit priorities and break procrastination with immediate micro-steps.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/dashboard" class="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white transition-colors">
            <span class="material-icons text-sm">dashboard</span>
            <span>Return to Dashboard</span>
          </a>
        </div>
      </div>

      <!-- ACTIVE TASKS LIST & AUDIT INTERFACE -->
      @if (activeTasks().length === 0) {
        <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
          <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
            <span class="material-icons text-4xl">task_alt</span>
          </div>
          <h3 class="font-display font-bold text-lg text-slate-800">Your Active Queue is Clear!</h3>
          <p class="text-xs text-slate-400 max-w-sm leading-relaxed">
            There are no pending or in-progress tasks that require accountability monitoring. Enjoy the clear mind, or add new tasks on the dashboard!
          </p>
          <a routerLink="/create-task" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer" id="btn-create-first-task">
            <span class="material-icons text-xs">add_circle</span>
            <span>Create New Task</span>
          </a>
        </div>
      } @else if (!auditResult()) {
        <!-- STEP 1: AUDIT FORM -->
        <div class="space-y-6">
          
          <!-- Banners & Warnings -->
          @if (overdueTasks().length > 0) {
            <div class="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3.5 shadow-xs">
              <span class="material-icons text-red-600 mt-0.5">warning_amber</span>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-red-950">Overdue Milestones Detected!</h4>
                <p class="text-xs text-red-800 mt-1 leading-relaxed">
                  The Accountability Agent detected **{{ overdueTasks().length }} overdue task(s)**. These need immediate intervention. Let's diagnose what is holding you back.
                </p>
              </div>
            </div>
          }

          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="bg-indigo-50 text-indigo-600 text-2xs font-bold px-2 py-0.5 rounded-full">Phase 1</span>
                <h3 class="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Workspace Diagnose Form</h3>
              </div>
              <span class="text-xs text-slate-400 font-mono">
                {{ activeTasks().length }} Active Tasks
              </span>
            </div>

            <p class="text-xs text-slate-500 leading-relaxed">
              Select any blockers you are experiencing and describe your progress. Your Accountability Agent will run an analysis using Gemini to suggest micro-steps and optimize your schedule.
            </p>

            <div class="space-y-6">
              @for (task of activeTasks(); track task.id) {
                <div [class.border-red-200]="isOverdue(task)"
                     [class.bg-red-50/5]="isOverdue(task)"
                     class="p-5 border border-slate-100 rounded-2xl bg-slate-50/10 hover:bg-slate-50/40 transition-all space-y-4">
                  
                  <!-- Task Info Bar -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-xs text-slate-800">{{ task.title }}</span>
                        @if (isOverdue(task)) {
                          <span class="bg-red-100 text-red-700 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <span class="material-icons text-[10px]">error_outline</span>
                            Overdue
                          </span>
                        } @else {
                          <span class="bg-indigo-50 text-indigo-700 text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        }
                        <span class="text-[9px] font-mono text-slate-400">
                          Priority Score: {{ task.priorityScore }}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-500 line-clamp-1 italic">
                        {{ task.description || 'No description provided.' }}
                      </p>
                    </div>

                    <div class="text-right shrink-0">
                      <span class="text-[10px] text-slate-400 font-mono block">Deadline Remaining</span>
                      <span [class.text-red-600]="isOverdue(task)" class="text-xs font-bold font-mono">
                        {{ taskManager.getRemainingTime(task.deadline).text }}
                      </span>
                    </div>
                  </div>

                  <!-- Inputs section -->
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100/60">
                    
                    <!-- Progress commentary input -->
                    <div class="md:col-span-7 flex flex-col gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span class="material-icons text-xs">edit_note</span>
                        Recent Progress / What has been done?
                      </span>
                      <input type="text"
                             [value]="getFeedbackItem(task.id).progressComment"
                             (input)="updateProgressComment(task.id, $event)"
                             placeholder="e.g. Gathered some links, but feeling stuck on starting..."
                             class="w-full px-3 py-2 text-xs border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl bg-white transition-colors" />
                    </div>

                    <!-- Blocker dropdown selector -->
                    <div class="md:col-span-5 flex flex-col gap-1.5">
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span class="material-icons text-xs">block</span>
                        Identify Primary Blocker
                      </span>
                      <select [value]="getFeedbackItem(task.id).blockerSelected"
                              (change)="updateBlocker(task.id, $event)"
                              class="w-full px-3 py-2 text-xs border border-slate-200 focus:border-indigo-500 focus:outline-hidden rounded-xl bg-white transition-colors">
                        <option value="none">🟢 No blocker - just executing</option>
                        <option value="procrastination">🔴 Procrastination / Starting Inertia</option>
                        <option value="clarity">🟡 Lack of clarity / Missing details</option>
                        <option value="overwhelmed">🟠 Overwhelmed by task complexity</option>
                        <option value="energy">🔵 Low energy / Mental Fatigue</option>
                        <option value="technical">🟣 Technical roadblock / Stuck</option>
                      </select>
                    </div>

                  </div>

                </div>
              }
            </div>

            <!-- Submit trigger -->
            <div class="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
              <div class="flex items-center gap-2 text-2xs text-slate-400">
                <span class="material-icons text-xs text-indigo-500 animate-pulse">lock</span>
                <span>Analyses are secured entirely on your server using Gemini.</span>
              </div>

              <button (click)="runCheckIn()"
                      [disabled]="taskManager.loadingAccountability()"
                      class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95"
                      id="btn-run-audit">
                @if (taskManager.loadingAccountability()) {
                  <span class="material-icons animate-spin text-sm">autorenew</span>
                  <span>Agent Analyzing Workspace...</span>
                } @else {
                  <span class="material-icons text-sm text-indigo-200">bolt</span>
                  <span>Initiate AI Accountable Check-in</span>
                }
              </button>
            </div>

          </div>

          <!-- REASSURING LOADING SCREEN -->
          @if (taskManager.loadingAccountability()) {
            <div class="bg-indigo-950 text-white border border-indigo-900 rounded-3xl p-8 shadow-md space-y-4 animate-pulse">
              <div class="flex items-center gap-3">
                <span class="material-icons text-indigo-400 text-2xl animate-spin">sync</span>
                <h4 class="font-display font-bold text-sm uppercase tracking-wider">Accountability Agent Active</h4>
              </div>
              <p class="text-xs text-indigo-200 leading-relaxed max-w-xl">
                Gemini is auditing your overdue task timelines, evaluating blocker parameters, and structuring micro next actions. This might take a few moments. Hang tight!
              </p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div class="p-3 bg-indigo-900/40 rounded-xl border border-indigo-800/30 text-center">
                  <span class="text-[9px] text-indigo-300 block uppercase font-bold tracking-wider">Audit Focus</span>
                  <span class="text-[11px] text-indigo-100 block mt-1">Timeline Drift</span>
                </div>
                <div class="p-3 bg-indigo-900/40 rounded-xl border border-indigo-800/30 text-center">
                  <span class="text-[9px] text-indigo-300 block uppercase font-bold tracking-wider">Deconstruction</span>
                  <span class="text-[11px] text-indigo-100 block mt-1">Micro Achievability</span>
                </div>
                <div class="p-3 bg-indigo-900/40 rounded-xl border border-indigo-800/30 text-center">
                  <span class="text-[9px] text-indigo-300 block uppercase font-bold tracking-wider">Goal</span>
                  <span class="text-[11px] text-indigo-100 block mt-1">Inertia Destruction</span>
                </div>
              </div>
            </div>
          }

        </div>
      } @else {
        <!-- STEP 2: AUDIT REPORTS AND RECOMMENDATIONS -->
        <div class="space-y-8">
          
          <!-- SUMMARY BANNER -->
          <div class="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-100">
              <div class="flex items-center gap-2">
                <span class="material-icons text-emerald-600 text-2xl">verified_user</span>
                <h3 class="font-display font-extrabold text-sm text-emerald-950 uppercase tracking-wider">Accountability Audit Complete</h3>
              </div>
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Gemini Optimized
              </span>
            </div>

            <!-- Markdown-rendered overall report -->
            <div class="text-xs text-slate-700 leading-relaxed space-y-3 prose max-w-none" [innerHTML]="parsedAssessment()"></div>
          </div>

          <!-- PROPOSED ADJUSTMENTS AND ACTIONS -->
          <div class="space-y-4">
            <h3 class="font-display font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-icons text-sm">tune</span>
              Proposed Priority Recalculations & Next Steps
            </h3>

            <div class="grid grid-cols-1 gap-4">
              @for (proposal of auditResult()?.taskUpdates; track proposal.taskId) {
                @if (getTask(proposal.taskId); as task) {
                  <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    
                    <!-- Left: Task & priority score comparison -->
                    <div class="md:col-span-4 space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 pr-0 md:pr-4">
                      <div>
                        <h4 class="font-bold text-xs text-slate-900 line-clamp-1" [title]="task.title">
                          {{ task.title }}
                        </h4>
                        <span class="text-[9px] text-slate-400 block mt-0.5 font-mono">ID: {{ task.id }}</span>
                      </div>

                      <div class="flex items-center gap-4">
                        <div>
                          <span class="text-[9px] uppercase font-bold text-slate-400 block">Old Priority</span>
                          <span class="text-sm font-extrabold text-slate-500 font-mono">{{ task.priorityScore }}</span>
                        </div>
                        <div class="text-indigo-600">
                          <span class="material-icons">arrow_forward</span>
                        </div>
                        <div>
                          <span class="text-[9px] uppercase font-bold text-indigo-500 block">New Priority</span>
                          <span class="text-lg font-extrabold text-indigo-600 font-mono">{{ proposal.updatedPriorityScore }}</span>
                        </div>
                      </div>

                      <div>
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Proposed Urgency</span>
                        <span [class]="getUrgencyClass(proposal.updatedUrgency)"
                              class="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {{ proposal.updatedUrgency }}
                        </span>
                      </div>
                    </div>

                    <!-- Right: Proposed Next Action and Rationale -->
                    <div class="md:col-span-8 space-y-3.5">
                      
                      <!-- AI Next Action suggestion -->
                      <div class="p-3.5 bg-gradient-to-r from-indigo-50/50 to-indigo-100/20 border border-indigo-100/50 rounded-xl space-y-1.5 text-left">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                            <span class="material-icons text-indigo-600 text-xs">bolt</span>
                            Suggested Micro-Action
                          </span>
                          <span class="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-sm font-mono shrink-0">
                            {{ proposal.actionEstMinutes }} Minutes
                          </span>
                        </div>
                        <p class="text-xs font-bold text-slate-800 leading-snug">
                          {{ proposal.suggestedNextAction }}
                        </p>
                      </div>

                      <!-- AI Rationale explanation -->
                      <div class="flex items-start gap-2 text-xs leading-normal text-slate-600">
                        <span class="material-icons text-slate-400 text-sm mt-0.5 shrink-0">chat_bubble_outline</span>
                        <p class="italic">"{{ proposal.recommendationReason }}"</p>
                      </div>

                    </div>

                  </div>
                }
              }
            </div>
          </div>

          <!-- ACTIONS TRIGGER FOOTER -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <h4 class="font-bold text-sm text-slate-900">Authorize Accountability Plan</h4>
              <p class="text-xs text-slate-500">
                This will automatically apply new priorities, update task urgencies, and append the suggested micro-actions to your subtask checklists.
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button (click)="resetAudit()"
                      class="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      id="btn-re-evaluate">
                Discard & Rediagnose
              </button>
              
              <button (click)="applyProposedUpdates()"
                      class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      id="btn-apply-audit">
                <span class="material-icons text-sm">check_circle</span>
                <span>Apply & Update Workspace</span>
              </button>
            </div>
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    :host ::ng-deep .prose h3 {
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      letter-spacing: 0.05em;
    }
    :host ::ng-deep .prose ul {
      list-style-type: disc;
      padding-left: 1.25rem;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }
    :host ::ng-deep .prose li {
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
    }
    :host ::ng-deep .prose p {
      margin-bottom: 0.75rem;
    }
    :host ::ng-deep .prose strong {
      font-weight: 600;
      color: #1e1b4b;
    }
  `]
})
export class AccountabilityPage {
  taskManager = inject(TaskManager);
  router = inject(Router);

  // Dictionary keeping track of selected feedback for each active task
  feedbackState = signal<Record<string, { progressComment: string; blockerSelected: string }>>({});

  // Signal storing generated audit result from Gemini API
  auditResult = signal<AuditResponse | null>(null);

  activeTasks = computed(() => {
    return this.taskManager.tasks().filter(t => t.status !== 'completed');
  });

  overdueTasks = computed(() => {
    return this.activeTasks().filter(t => this.isOverdue(t));
  });

  // Lifecycle-like hook on initialization to setup feedback dictionary
  constructor() {
    this.initializeFeedbackState();
  }

  initializeFeedbackState() {
    const tasks = this.activeTasks();
    const state: Record<string, { progressComment: string; blockerSelected: string }> = {};
    tasks.forEach(t => {
      state[t.id] = {
        progressComment: '',
        blockerSelected: 'none'
      };
    });
    this.feedbackState.set(state);
  }

  getFeedbackItem(taskId: string) {
    const state = this.feedbackState();
    if (!state[taskId]) {
      // Lazy initialize
      state[taskId] = { progressComment: '', blockerSelected: 'none' };
      this.feedbackState.set({ ...state });
    }
    return state[taskId];
  }

  updateProgressComment(taskId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const state = this.feedbackState();
    state[taskId] = {
      ...this.getFeedbackItem(taskId),
      progressComment: value
    };
    this.feedbackState.set({ ...state });
  }

  updateBlocker(taskId: string, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const state = this.feedbackState();
    state[taskId] = {
      ...this.getFeedbackItem(taskId),
      blockerSelected: value
    };
    this.feedbackState.set({ ...state });
  }

  isOverdue(task: Task): boolean {
    return new Date(task.deadline).getTime() < new Date().getTime();
  }

  getTask(taskId: string): Task | undefined {
    return this.taskManager.tasks().find(t => t.id === taskId);
  }

  async runCheckIn() {
    const tasks = this.activeTasks();
    const payload: FeedbackItem[] = tasks.map(t => {
      const fb = this.getFeedbackItem(t.id);
      return {
        taskId: t.id,
        progressComment: fb.progressComment || 'No commentary logged.',
        blockerSelected: fb.blockerSelected
      };
    });

    try {
      const response = await this.taskManager.runAccountabilityAudit(payload);
      if (response) {
        this.auditResult.set(response);
        
        // Log last check-in date
        if (typeof window !== 'undefined') {
          const todayStr = new Date().toLocaleDateString();
          localStorage.setItem('lifesaver_last_checkin', todayStr);
        }
      }
    } catch (err) {
      console.error('Accountability execution error:', err);
    }
  }

  parsedAssessment = computed(() => {
    const res = this.auditResult();
    if (!res || !res.generalAssessment) return '';
    return this.simpleMarkdownToHtml(res.generalAssessment);
  });

  simpleMarkdownToHtml(md: string): string {
    // Escaping html tags for safety
    let text = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings (### Name)
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold (**text**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points (* text or - text)
    text = text.replace(/^\s*[*-]\s+(.*$)/gim, '<li>$1</li>');
    
    // Wrap groups of <li> inside <ul>
    // Quick regex to group adjacent <li> tags
    text = text.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    // Remove consecutive </ul><ul> wrappers
    text = text.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraph splits (double newlines)
    text = text.replace(/\n\s*\n/g, '</p><p>');
    
    // Wrap in standard paragraph if not already wrapped or starts with header
    if (!text.startsWith('<h3>') && !text.startsWith('<p>')) {
      text = '<p>' + text;
    }
    if (!text.endsWith('</h3>') && !text.endsWith('</ul>') && !text.endsWith('</p>')) {
      text = text + '</p>';
    }

    return text;
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-amber-100 text-amber-800';
      case 'medium': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  resetAudit() {
    this.auditResult.set(null);
  }

  applyProposedUpdates() {
    const result = this.auditResult();
    if (result && result.taskUpdates) {
      this.taskManager.applyAccountabilityUpdates(result.taskUpdates);
      
      // Navigate user to dashboard to see their fresh workload
      alert('Your Accountability Plan has been authorized and applied successfully! Task focus ratings, urgencies, and step-by-step micro-actions have been refreshed.');
      this.router.navigate(['/dashboard']);
    }
  }
}
