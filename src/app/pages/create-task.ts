import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TaskManager } from '../services/task-manager';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-create-task',
  template: `
    <div class="max-w-xl mx-auto">
      
      <!-- Back to Dashboard -->
      <div class="mb-6">
        <a routerLink="/dashboard" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
          <span class="material-icons text-base">arrow_back</span>
          <span>Back to Dashboard</span>
        </a>
      </div>

      <!-- Main card -->
      <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        
        <div class="pb-6 border-b border-slate-100 flex items-center gap-3 mb-6">
          <div class="flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl">
            <span class="material-icons">add_task</span>
          </div>
          <div>
            <h2 class="font-display font-bold text-xl text-slate-900">New LifeSaver Task</h2>
            <p class="text-xs text-slate-500 mt-0.5">Setup a deadline goal to get customized Gemini AI micro-steps.</p>
          </div>
        </div>

        <form [formGroup]="taskForm" (ngSubmit)="onCreateTask()" class="space-y-5">
          <!-- Title Input -->
          <div>
            <label for="task-title" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Task Title *</label>
            <input id="task-title" type="text" formControlName="title" placeholder="e.g. Complete university research proposal"
                   class="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/30" />
            @if (taskForm.get('title')?.touched && taskForm.get('title')?.invalid) {
              <span class="text-[10px] text-red-500 mt-1 block">Title is required (minimum 3 characters).</span>
            }
          </div>

          <!-- Description Input -->
          <div>
            <label for="task-desc" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
            <textarea id="task-desc" formControlName="description" rows="4" placeholder="Add relevant details, links, or context to help Gemini structure the ultimate step-by-step roadmap for you..."
                      class="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/30"></textarea>
          </div>

          <!-- Grid: Date picker & Urgency selector -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Date Time picker -->
            <div>
              <label for="task-deadline" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Deadline *</label>
              <input id="task-deadline" type="datetime-local" formControlName="deadline" 
                     class="w-full px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/30" />
              @if (taskForm.get('deadline')?.touched && taskForm.get('deadline')?.invalid) {
                <span class="text-[10px] text-red-500 mt-1 block">Valid deadline date is required.</span>
              }
            </div>

            <!-- Urgency level -->
            <div>
              <label for="task-urgency" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Urgency Threat</label>
              <select id="task-urgency" formControlName="urgency"
                      class="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">🔴 Critical Blockers</option>
              </select>
            </div>
          </div>

          <!-- AI Subtasks Checker -->
          <div class="p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-xl flex items-start gap-3 mt-4">
            <input type="checkbox" formControlName="generateAI" id="chk-generate-ai"
                   class="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" />
            <label for="chk-generate-ai" class="text-xs text-slate-700 leading-relaxed cursor-pointer">
              <strong>Generate Subtasks with Gemini AI</strong><br />
              Decompose your stress. Generates 3 to 5 realistic micro-milestones automatically using Google's cognitive assistant.
            </label>
          </div>

          <!-- Form Buttons -->
          <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 mt-8">
            <a routerLink="/dashboard" 
               class="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium cursor-pointer transition-colors text-center">
              Cancel
            </a>
            <button type="submit" [disabled]="taskForm.invalid || isSaving()"
                    class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    id="btn-save-task">
              @if (isSaving()) {
                <span class="material-icons text-sm animate-spin">autorenew</span>
                <span>Generating Steps...</span>
              } @else {
                <span class="material-icons text-sm">save</span>
                <span>Create Task</span>
              }
            </button>
          </div>
        </form>

      </div>
    </div>
  `,
})
export class CreateTask {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private taskManager = inject(TaskManager);

  isSaving = signal<boolean>(false);

  taskForm: FormGroup;

  constructor() {
    const defaultDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      deadline: [defaultDeadline, [Validators.required]],
      urgency: ['medium', [Validators.required]],
      generateAI: [true]
    });
  }

  async onCreateTask() {
    if (this.taskForm.invalid) return;

    this.isSaving.set(true);
    const { title, description, deadline, urgency, generateAI } = this.taskForm.value;

    try {
      await this.taskManager.createTask(title, description, deadline, urgency, generateAI);
      this.router.navigate(['/dashboard']);
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving.set(false);
    }
  }
}
