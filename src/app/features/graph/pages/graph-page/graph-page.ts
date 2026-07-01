import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

type GraphNodeType = 'person' | 'vehicle' | 'weapon';

interface GraphNodeDetail {
  label: string;
  value: string;
}

interface GraphNodeLinks {
  persons: number;
  vehicles: number;
  weapons: number;
}

interface GraphNode {
  id: string;
  type: GraphNodeType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  details: GraphNodeDetail[];
  links: GraphNodeLinks;
}

interface GraphLink {
  id: string;
  sourceId: string;
  targetId: string;
}

interface GraphFilter {
  type: GraphNodeType;
  label: string;
}

@Component({
  selector: 'app-graph-page',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './graph-page.html',
  styleUrl: './graph-page.scss'
})
export class GraphPage {
  private readonly router = inject(Router);

  readonly detailPanelOpen = signal(true);
  readonly selectedNodeId = signal('benito');
  readonly zoom = signal(1);

  readonly activeFilters = signal<Record<GraphNodeType, boolean>>({
    person: true,
    vehicle: true,
    weapon: true
  });

  readonly filters: GraphFilter[] = [
    {
      type: 'person',
      label: 'Personas'
    },
    {
      type: 'vehicle',
      label: 'Vehículos'
    },
    {
      type: 'weapon',
      label: 'Armas'
    }
  ];

  readonly nodes: GraphNode[] = [
    {
      id: 'benito',
      type: 'person',
      title: 'Benito Juárez G.',
      subtitle: 'JDPS950728',
      x: 620,
      y: 320,
      radius: 35,
      details: [
        {
          label: 'Nombre',
          value: 'Benito Juárez García'
        },
        {
          label: 'CURP',
          value: 'JDPS950728HDFABC'
        },
        {
          label: 'Sexo',
          value: 'Hombre'
        },
        {
          label: 'Fecha Nac.',
          value: '28/07/1995'
        },
        {
          label: 'Dependencia',
          value: 'SSPC'
        },
        {
          label: 'Puesto',
          value: 'Agente'
        }
      ],
      links: {
        persons: 1,
        vehicles: 2,
        weapons: 1
      }
    },
    {
      id: 'carmen',
      type: 'person',
      title: 'Carmen Villanueva',
      subtitle: 'CVLT850901',
      x: 470,
      y: 500,
      radius: 30,
      details: [
        {
          label: 'Nombre',
          value: 'Carmen Villanueva Torres'
        },
        {
          label: 'CURP',
          value: 'CVLT850901MDFRRS09'
        },
        {
          label: 'Relación',
          value: 'Contacto frecuente'
        },
        {
          label: 'Fuente',
          value: 'Registro Nacional de Detenciones'
        }
      ],
      links: {
        persons: 1,
        vehicles: 0,
        weapons: 0
      }
    },
    {
      id: 'honda',
      type: 'vehicle',
      title: 'Honda Civic',
      subtitle: 'ABC-1234',
      x: 640,
      y: 130,
      radius: 27,
      details: [
        {
          label: 'Vehículo',
          value: 'Honda Civic'
        },
        {
          label: 'Placa',
          value: 'ABC-1234'
        },
        {
          label: 'Color',
          value: 'Gris'
        },
        {
          label: 'Estatus',
          value: 'Relacionado'
        }
      ],
      links: {
        persons: 1,
        vehicles: 0,
        weapons: 0
      }
    },
    {
      id: 'ford',
      type: 'vehicle',
      title: 'Ford Focus',
      subtitle: 'XYZ-5678',
      x: 770,
      y: 515,
      radius: 27,
      details: [
        {
          label: 'Vehículo',
          value: 'Ford Focus'
        },
        {
          label: 'Placa',
          value: 'XYZ-5678'
        },
        {
          label: 'Color',
          value: 'Negro'
        },
        {
          label: 'Estatus',
          value: 'Perfil detectado'
        }
      ],
      links: {
        persons: 1,
        vehicles: 0,
        weapons: 0
      }
    },
    {
      id: 'glock',
      type: 'weapon',
      title: 'GLOCK 17',
      subtitle: 'ABCD123 · 9MM',
      x: 420,
      y: 285,
      radius: 27,
      details: [
        {
          label: 'Arma',
          value: 'GLOCK 17'
        },
        {
          label: 'Serie',
          value: 'ABCD123'
        },
        {
          label: 'Calibre',
          value: '9MM'
        },
        {
          label: 'Estatus',
          value: 'Vínculo activo'
        }
      ],
      links: {
        persons: 1,
        vehicles: 0,
        weapons: 0
      }
    }
  ];

  readonly links: GraphLink[] = [
    {
      id: 'benito-carmen',
      sourceId: 'benito',
      targetId: 'carmen'
    },
    {
      id: 'benito-honda',
      sourceId: 'benito',
      targetId: 'honda'
    },
    {
      id: 'benito-ford',
      sourceId: 'benito',
      targetId: 'ford'
    },
    {
      id: 'benito-glock',
      sourceId: 'benito',
      targetId: 'glock'
    }
  ];

  readonly visibleNodes = computed(() => {
    const filters = this.activeFilters();

    return this.nodes.filter((node) => filters[node.type]);
  });

  readonly visibleLinks = computed(() => {
    const visibleIds = new Set(this.visibleNodes().map((node) => node.id));

    return this.links.filter(
      (link) => visibleIds.has(link.sourceId) && visibleIds.has(link.targetId)
    );
  });

  readonly selectedNode = computed(() => {
    const selectedId = this.selectedNodeId();
    return this.nodes.find((node) => node.id === selectedId) ?? this.nodes[0];
  });

  readonly pendingProfilesLabel = computed(() => {
    const pending = this.nodes.filter((node) => node.id !== this.selectedNodeId()).length;
    return `${pending} perfiles por consolidar`;
  });

  readonly graphTransform = computed(() => {
    const currentZoom = this.zoom();
    return `translate(0 0) scale(${currentZoom})`;
  });

  goBack(): void {
    this.router.navigateByUrl('/perfil-consolidado');
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    this.detailPanelOpen.set(true);
  }

  consolidateNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    this.router.navigateByUrl('/perfil-consolidado');
  }

  toggleDetailPanel(): void {
    this.detailPanelOpen.update((value) => !value);
  }

  toggleFilter(type: GraphNodeType): void {
    this.activeFilters.update((filters) => {
      const nextFilters = {
        ...filters,
        [type]: !filters[type]
      };

      const hasActiveFilter = Object.values(nextFilters).some(Boolean);

      if (!hasActiveFilter) {
        return filters;
      }

      const selectedNode = this.selectedNode();
      const selectedNodeStillVisible = nextFilters[selectedNode.type];

      if (!selectedNodeStillVisible) {
        const nextNode = this.nodes.find((node) => nextFilters[node.type]);

        if (nextNode) {
          this.selectedNodeId.set(nextNode.id);
        }
      }

      return nextFilters;
    });
  }

  zoomIn(): void {
    this.zoom.update((value) => Math.min(1.55, Number((value + 0.1).toFixed(2))));
  }

  zoomOut(): void {
    this.zoom.update((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))));
  }

  resetZoom(): void {
    this.zoom.set(1);
  }

  isFilterActive(type: GraphNodeType): boolean {
    return this.activeFilters()[type];
  }

  isSelected(node: GraphNode): boolean {
    return this.selectedNodeId() === node.id;
  }

  isConnectedToSelected(node: GraphNode): boolean {
    const selectedId = this.selectedNodeId();

    if (node.id === selectedId) {
      return true;
    }

    return this.links.some(
      (link) =>
        (link.sourceId === selectedId && link.targetId === node.id) ||
        (link.targetId === selectedId && link.sourceId === node.id)
    );
  }

  getNodeOpacity(node: GraphNode): number {
    return this.isConnectedToSelected(node) ? 1 : 0.42;
  }

  getLinkOpacity(link: GraphLink): number {
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 0.45 : 0.15;
  }

  getLinkStrokeWidth(link: GraphLink): number {
    const selectedId = this.selectedNodeId();
    return link.sourceId === selectedId || link.targetId === selectedId ? 2 : 1.2;
  }

  getNodeColor(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return '#FCB025';
      case 'vehicle':
        return '#8B3086';
      case 'weapon':
        return '#3E8C22';
      default:
        return '#99A8BE';
    }
  }

  getNodeTypeLabel(type: GraphNodeType): string {
    switch (type) {
      case 'person':
        return 'Personas';
      case 'vehicle':
        return 'Vehículos';
      case 'weapon':
        return 'Armas';
      default:
        return 'Entidad';
    }
  }

  getNodeById(nodeId: string): GraphNode {
    return this.nodes.find((node) => node.id === nodeId) ?? this.nodes[0];
  }

  getNodeDetailBackground(type: GraphNodeType): string {
    const color = this.getNodeColor(type);
    return this.hexToRgba(color, 0.13);
  }

  getNodeDetailBorder(type: GraphNodeType): string {
    const color = this.getNodeColor(type);
    return `1.5px solid ${this.hexToRgba(color, 0.33)}`;
  }

  getSoftBackground(type: GraphNodeType): string {
    const color = this.getNodeColor(type);
    return this.hexToRgba(color, 0.08);
  }

  getSoftBorder(type: GraphNodeType): string {
    const color = this.getNodeColor(type);
    return `1px solid ${this.hexToRgba(color, 0.25)}`;
  }

  getGlowColor(type: GraphNodeType): string {
    const color = this.getNodeColor(type);
    return this.hexToRgba(color, 0.55);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalizedHex = hex.replace('#', '');
    const red = parseInt(normalizedHex.substring(0, 2), 16);
    const green = parseInt(normalizedHex.substring(2, 4), 16);
    const blue = parseInt(normalizedHex.substring(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}