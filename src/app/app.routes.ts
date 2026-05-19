import { Routes } from '@angular/router';
import { AppShell } from './shared/layout/app-shell/app-shell';

export const routes: Routes = [
    {
        path: '',
        component: AppShell,
        children: [
            {
                path: '',
                redirectTo: 'busqueda',
                pathMatch: 'full'
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
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/pages/dashboard-page/dashboard-page').then(
                        m => m.DashboardPage
                    )
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'busqueda'
    }
];