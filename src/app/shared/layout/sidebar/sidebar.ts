import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  readonly items: SidebarItem[] = [
    {
      path: '/dashboard',
      icon: 'fa-solid fa-table-cells-large',
      label: 'Dashboard'
    },
    {
      path: '/busqueda',
      icon: 'fa-solid fa-magnifying-glass',
      label: 'Búsqueda'
    },
    {
      path: '/red/1',
      icon: 'fa-solid fa-circle-nodes',
      label: 'Red de vínculos'
    }
  ];
}