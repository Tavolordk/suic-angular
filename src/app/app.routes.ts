import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AppShell } from './shared/layout/app-shell/app-shell';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/pages/login-page/login-page').then(m => m.LoginPage)
    },
    {
        path: '',
        component: AppShell,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
                        m => m.DashboardPage
                    )
            },
            {
                path: 'busqueda',
                loadComponent: () =>
                    import('./features/search/pages/search-page/search-page').then(
                        m => m.SearchPage
                    )
            },
            {
                path: 'persona/:id',
                loadComponent: () =>
                    import('./features/person-detail/pages/person-detail-page/person-detail-page').then(
                        m => m.PersonDetailPage
                    )
            },
            {
                path: 'red/:id',
                loadComponent: () =>
                    import('./features/graph/pages/graph-page/graph-page').then(
                        m => m.GraphPage
                    )
            },
            {
                path: 'perfil-consolidado/:id',
                loadComponent: () =>
                    import('./features/profile-consolidation/pages/profile-consolidation-page/profile-consolidation-page').then(
                        m => m.ProfileConsolidationPage
                    )
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];