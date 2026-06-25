import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/pages/login-page/login-page').then(
                (m) => m.LoginPage
            )
    },
    {
        path: 'autenticacion',
        loadComponent: () =>
            import('./features/auth/pages/two-step-auth-page/two-step-auth-page').then(
                (m) => m.TwoStepAuthPage
            )
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
                (m) => m.DashboardPage
            )
    },
    {
        path: 'busqueda',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/search/pages/search-page/search-page').then(
                (m) => m.SearchPage
            )
    },
    {
        path: 'grafo',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/graph/pages/graph-page/graph-page').then(
                (m) => m.GraphPage
            )
    },
    {
        path: 'perfil-consolidado',
        canActivate: [authGuard],
        loadComponent: () =>
            import(
                './features/profile-consolidation/pages/profile-consolidation-page/profile-consolidation-page'
            ).then((m) => m.ProfileConsolidationPage)
    },
    {
        path: 'detalle-persona',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/person-detail/pages/person-detail-page/person-detail-page').then(
                (m) => m.PersonDetailPage
            )
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];