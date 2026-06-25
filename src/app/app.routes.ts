import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { TaskManager } from './services/task-manager';
import { Login } from './pages/login';
import { Shell } from './pages/shell';
import { Dashboard } from './pages/dashboard';
import { CreateTask } from './pages/create-task';
import { TaskDetails } from './pages/task-details';
import { Profile } from './pages/profile';
import { AccountabilityPage } from './pages/accountability';

// Modern Functional Auth Guards
const authGuard = () => {
  const taskManager = inject(TaskManager);
  const router = inject(Router);
  
  if (taskManager.currentUser()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

const redirectIfLoggedInGuard = () => {
  const taskManager = inject(TaskManager);
  const router = inject(Router);
  
  if (taskManager.currentUser()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [redirectIfLoggedInGuard]
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'create-task',
        component: CreateTask
      },
      {
        path: 'task-details/:id',
        component: TaskDetails
      },
      {
        path: 'profile',
        component: Profile
      },
      {
        path: 'accountability',
        component: AccountabilityPage
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
