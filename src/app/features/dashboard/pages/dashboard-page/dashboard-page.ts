import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DashboardMetric {
  label: string;
  value: string;
  trend: string;
  icon: string;
  tone: 'blue' | 'green' | 'orange' | 'red';
}

interface RecentSearch {
  id: string;
  name: string;
  curp: string;
  date: string;
  status: string;
  risk: string;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss'
})
export class DashboardPage {
  readonly metrics: DashboardMetric[] = [
    {
      label: 'Consultas realizadas',
      value: '1,284',
      trend: '+12.5%',
      icon: 'fa-solid fa-magnifying-glass-chart',
      tone: 'blue'
    },
    {
      label: 'Personas identificadas',
      value: '438',
      trend: '+8.2%',
      icon: 'fa-solid fa-user-check',
      tone: 'green'
    },
    {
      label: 'Vínculos detectados',
      value: '912',
      trend: '+17.9%',
      icon: 'fa-solid fa-circle-nodes',
      tone: 'orange'
    },
    {
      label: 'Alertas críticas',
      value: '24',
      trend: '+3',
      icon: 'fa-solid fa-triangle-exclamation',
      tone: 'red'
    }
  ];

  readonly recentSearches: RecentSearch[] = [
    {
      id: '1',
      name: 'Miguel Ángel Hernández López',
      curp: 'HELM850214HGRRPG09',
      date: '2026-05-20 11:42',
      status: 'Validado',
      risk: 'Alto'
    },
    {
      id: '3',
      name: 'José Alberto Ramírez Castro',
      curp: 'RACJ780922HDFMSS08',
      date: '2026-05-20 10:18',
      status: 'Coincidencia',
      risk: 'Crítico'
    },
    {
      id: '2',
      name: 'María Fernanda Salgado Ruiz',
      curp: 'SARM920701MGRLZR03',
      date: '2026-05-19 18:02',
      status: 'Pendiente',
      risk: 'Medio'
    },
    {
      id: '4',
      name: 'Ana Sofía Martínez Torres',
      curp: 'MATA990304MGRRNN06',
      date: '2026-05-19 14:27',
      status: 'Validado',
      risk: 'Bajo'
    }
  ];

  readonly activity: ActivityItem[] = [
    {
      title: 'Consulta de identidad',
      description: 'Se validó CURP y datos generales contra registros internos.',
      time: 'Hace 8 min',
      icon: 'fa-solid fa-fingerprint'
    },
    {
      title: 'Red de vínculos actualizada',
      description: 'Se agregaron 3 nodos asociados a una persona investigada.',
      time: 'Hace 24 min',
      icon: 'fa-solid fa-circle-nodes'
    },
    {
      title: 'Alerta operativa',
      description: 'Se detectó una relación indirecta con riesgo crítico.',
      time: 'Hace 41 min',
      icon: 'fa-solid fa-triangle-exclamation'
    },
    {
      title: 'Reporte generado',
      description: 'Se exportó una ficha de consulta para revisión interna.',
      time: 'Hace 1 h',
      icon: 'fa-solid fa-file-lines'
    }
  ];
}