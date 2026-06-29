import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TaskManager } from '../services/task-manager';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-login',
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200/80">
      <div class="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-2xl p-8 transform transition-all">
        <!-- Logo Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-sm mb-4">
            <span class="material-icons text-3xl">hourglass_empty</span>
          </div>
          <h1 class="font-display font-bold text-3xl tracking-tight text-slate-900">LifeSaver AI</h1>
          <p class="text-slate-500 text-sm mt-2 font-medium">AI-Powered Cognitive Productivity Guard</p>
        </div>

        <!-- Auth Tabs -->
        <div class="flex border-b border-slate-100 mb-6 bg-slate-100 p-1 rounded-xl">
          <button (click)="authTab.set('signin')" 
                  [class]="authTab() === 'signin' ? 'w-1/2 py-2 text-sm font-semibold rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'w-1/2 py-2 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-900 transition-colors'"
                  id="tab-signin">
            Sign In
          </button>
          <button (click)="authTab.set('register')" 
                  [class]="authTab() === 'register' ? 'w-1/2 py-2 text-sm font-semibold rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'w-1/2 py-2 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-900 transition-colors'"
                  id="tab-register">
            Register
          </button>
        </div>

        <!-- Authentication Form -->
        <form [formGroup]="authForm" (ngSubmit)="onAuthSubmit()" class="space-y-4">
          @if (authTab() === 'register') {
            <div>
              <label for="reg-name" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Name</label>
              <div class="relative">
                <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">person</span>
                <input id="reg-name" type="text" formControlName="name" placeholder="John Doe" 
                       class="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          }

          <div>
            <label for="reg-email" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <div class="relative">
              <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">mail</span>
              <input id="reg-email" type="email" formControlName="email" placeholder="you@example.com" 
                     class="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label for="reg-password" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <div class="relative">
              <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">lock</span>
              <input id="reg-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" placeholder="••••••••" 
                     class="w-full pl-10 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <button type="button"
                      (click)="showPassword.set(!showPassword())"
                      class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none bg-transparent border-0 p-0 cursor-pointer select-none flex items-center"
                      id="btn-toggle-password"
                      title="Toggle password visibility">
                <span class="material-icons text-lg">{{ showPassword() ? 'visibility' : 'visibility_off' }}</span>
              </button>
            </div>
          </div>

          @if (authError()) {
            <p class="text-xs text-red-500 font-medium">{{ authError() }}</p>
          }

          <button type="submit" 
                  class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 mt-6 cursor-pointer"
                  id="btn-auth-submit">
            <span>{{ authTab() === 'signin' ? 'Sign In to Workspace' : 'Create New Account' }}</span>
            <span class="material-icons text-base">arrow_forward</span>
          </button>
        </form>

        <div class="relative flex py-4 items-center">
          <div class="flex-grow border-t border-slate-200"></div>
          <span class="flex-shrink mx-4 text-slate-400 text-xs uppercase tracking-wider font-semibold">or authenticate via</span>
          <div class="flex-grow border-t border-slate-200"></div>
        </div>

        <!-- Google Sign-In (Direct Social Authenticator) -->
        <button (click)="signInWithGoogle()" 
                class="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors shadow-xs flex items-center justify-center gap-3 mb-3 cursor-pointer"
                id="btn-google-signin">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.2-.2-.41-.3-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Sign In with Google</span>
        </button>

        <!-- Quick Demo Switcher -->
        <button (click)="enterGuestMode()" 
                class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                id="btn-guest-mode">
          <span class="material-icons text-lg text-indigo-400">bolt</span>
          <span>Access Demo Guest Workspace</span>
        </button>

        <p class="text-xs text-slate-400 text-center mt-6">
          LifeSaver AI uses browser caching and secure local database sandboxing for secure MVP workspace deployment.
        </p>
      </div>
    </div>
  `,
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private taskManager = inject(TaskManager);

  authTab = signal<'signin' | 'register'>('signin');
  authError = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    name: ['', [Validators.required]]
  });

  onAuthSubmit() {
    this.authError.set(null);
    if (this.authForm.get('email')?.invalid || this.authForm.get('password')?.invalid) {
      this.authError.set('Please provide a valid email and password.');
      return;
    }

    if (this.authTab() === 'register' && this.authForm.get('name')?.invalid) {
      this.authError.set('Name is required for registration.');
      return;
    }

    const { email, name } = this.authForm.value;
    const resolvedName = this.authTab() === 'signin' ? email.split('@')[0] : name;
    this.taskManager.login(email, resolvedName);
    this.router.navigate(['/dashboard']);
  }

  signInWithGoogle() {
    this.authError.set(null);
    // Google auth triggers beautiful standard pop-up simulation
    const simulatedPopup = window.open('', 'Google Sign-In', 'width=500,height=600,left=100,top=100');
    if (simulatedPopup) {
      simulatedPopup.document.write(`
        <html>
          <head>
            <title>Sign in - Google Accounts</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
          </head>
          <body class="bg-slate-50 font-sans flex flex-col justify-between h-screen p-6">
            <div class="flex-grow flex flex-col items-center justify-center text-center">
              <svg class="w-12 h-12 mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.2-.2-.41-.3-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <h1 class="text-xl font-semibold text-slate-800">Sign in with Google</h1>
              <p class="text-sm text-slate-500 mt-1">to continue to LifeSaver AI</p>
              
              <div class="mt-6 p-4 border border-slate-200 bg-white rounded-xl w-full max-w-sm flex items-center gap-3 text-left">
                <div class="w-10 h-10 bg-indigo-100 text-indigo-700 flex items-center justify-center rounded-full font-bold">G</div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">Google User</p>
                  <p class="text-xs text-slate-500">google.user&#64;example.com</p>
                </div>
              </div>
            </div>
            
            <div class="text-center">
              <button onclick="window.close()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium w-full">
                Confirm & Authorize
              </button>
            </div>
          </body>
        </html>
      `);

      // Monitor closure to login the user
      const timer = setInterval(() => {
        if (simulatedPopup.closed) {
          clearInterval(timer);
          this.taskManager.login('google.user@example.com', 'Google User');
          this.router.navigate(['/dashboard']);
        }
      }, 500);
    } else {
      // Direct login if popup is blocked
      this.taskManager.login('google.user@example.com', 'Google User');
      this.router.navigate(['/dashboard']);
    }
  }

  enterGuestMode() {
    this.taskManager.enterGuestMode();
    this.router.navigate(['/dashboard']);
  }
}
