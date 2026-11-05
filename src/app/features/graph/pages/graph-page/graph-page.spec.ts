import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { GraphPage } from './graph-page';
import { SearchApiService } from '../../../../core/infrastructure/search-api/search-api.service';
import { SearchStateService } from '../../../search/data-access/search-state.service';
import { ConsolidatedProfilesApiService } from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.service';
import { PivotConsolidationRegistryService } from '../../data-access/pivot-consolidation-registry.service';
import { ProfileIntelligenceService } from '../../../../core/intelligence/profile-intelligence.service';
import { IntelligenceApiService } from '../../../../core/intelligence/intelligence-api.service';
import { SearchResultDetailResponse, SearchResultsPageResponse } from '../../../../core/infrastructure/search-api/search-api.models';
import { ConsolidatedProfileResponse } from '../../../../core/infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { PivotConsolidationRecord } from '../../data-access/pivot-consolidation-registry.service';

type NodeType = 'person' | 'vehicle' | 'weapon';
const entityType: Record<NodeType, string> = { person: 'Person', vehicle: 'Vehicle', weapon: 'Weapon' };
const emptyLinks = { persons: 0, vehicles: 0, weapons: 0 };

function makePage(totalItems: number): SearchResultsPageResponse {
  return {
    searchId: 'search-pivot',
    execution: { status: 'Completed', isPartial: false },
    counts: { totalItems, enriched: totalItems, partial: 0, contextual: 0 },
    pagination: { page: 1, pageSize: 18, totalPages: totalItems ? 1 : 0,
      hasPreviousPage: false, hasNextPage: false },
    items: totalItems ? [{ resultId: 'result-pivot', card: {
      name: { value: 'Relacionado', valueCount: 1 },
      alias: { value: '', valueCount: 0 },
      curp: { value: '', valueCount: 0 },
      rfc: { value: '', valueCount: 0 }
    }, hasConflicts: false }] : []
  };
}

describe('GraphPage – pivoteo de nodos hijos', () => {
  let component: GraphPage;
  let searchState: SearchStateService;
  let pivotCalls: string[][];
  let navigations: unknown[][];
  let detail: SearchResultDetailResponse;
  let response: SearchResultsPageResponse;
  let recordsByLink: Record<string, PivotConsolidationRecord[]>;

  beforeEach(() => {
    pivotCalls = [];
    navigations = [];
    response = makePage(1);
    recordsByLink = {};
    detail = { searchId: 'search-origin', resultId: 'result-origin', hasConflicts: false, linkGroups: [] };
    const params = convertToParamMap({ profileId: 'profile-origin' });
    TestBed.configureTestingModule({
      imports: [GraphPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } },
        { provide: Router, useValue: { navigate: (...args: unknown[]) => { navigations.push(args); return Promise.resolve(true); } } },
        { provide: SearchApiService, useValue: {
          getResultDetail: () => of(detail),
          pivotLink: (searchId: string, resultId: string, linkId: string, size: number) => {
            pivotCalls.push([searchId, resultId, linkId, String(size)]);
            return of(response);
          }
        } },
        { provide: ConsolidatedProfilesApiService, useValue: {} },
        { provide: PivotConsolidationRegistryService, useValue: {
          forLink: (_graphId: string, _searchId: string, _resultId: string, linkId: string) => recordsByLink[linkId] ?? []
        } },
        { provide: ProfileIntelligenceService, useValue: {} },
        { provide: IntelligenceApiService, useValue: {} }
      ]
    });
    component = TestBed.createComponent(GraphPage).componentInstance;
    searchState = TestBed.inject(SearchStateService);
  });

  function selectChild(type: NodeType, linkId = 'real-link'): void {
    component.nodes.set([
      { id: 'profile-origin', type: 'person', title: 'Principal', subtitle: '', x: 0, y: 0,
        radius: 35, details: [], links: emptyLinks },
      { id: 'child', type, title: `Nodo ${type}`, subtitle: '', x: 10, y: 10,
        radius: 27, details: [], links: emptyLinks }
    ]);
    component.links.set([{ id: 'edge', sourceId: 'profile-origin', targetId: 'child',
      type, externalId: linkId, label: 'Relacionado', status: '', details: [], sourceNames: [],
      searchId: 'search-origin', resultId: 'result-origin' }]);
    component.selectedNodeId.set('child');
    detail.linkGroups = [{ entityType: entityType[type], count: 1, items: [{ linkId }] }];
  }

  for (const type of ['person', 'vehicle', 'weapon'] as const) {
    it(`permite pivoteo de ${entityType[type]} por ID real y conserva el tipo de nodo`, () => {
      selectChild(type);
      expect(component.selectedPivotLink()?.externalId).toBe('real-link');
      component.pivotSelectedNode();
      expect(pivotCalls).toEqual([['search-origin', 'result-origin', 'real-link', '18']]);
      expect(searchState.page()).toEqual(response);
      expect(searchState.pivotContext()?.nodeType).toBe(entityType[type]);
      expect(searchState.pivotContext()?.graphRootType).toBe('Person');
      expect(navigations.length).toBe(1);
      expect(navigations[0][0]).toEqual(['/busqueda']);
    });
  }

  it('rechaza un vínculo cuyo tipo ya no coincide con el detalle real', () => {
    selectChild('weapon');
    detail.linkGroups = [{ entityType: 'Person', count: 1, items: [{ linkId: 'real-link' }] }];
    component.pivotSelectedNode();
    expect(pivotCalls.length).toBe(0);
    expect(component.pivotError()).toContain('tipo de nodo');
    expect(navigations.length).toBe(0);
  });

  it('evita enviar ID de vínculo ausente o visual', () => {
    selectChild('vehicle', '');
    expect(component.selectedPivotLink()).toBeNull();
    component.pivotSelectedNode();
    expect(pivotCalls.length).toBe(0);
  });

  it('no sale del grafo ni borra contexto cuando el pivoteo no tiene resultados', () => {
    selectChild('vehicle');
    response = makePage(0);
    component.pivotSelectedNode();
    expect(component.pivotNoResults()).toEqual({ nodeTitle: 'Nodo vehicle', nodeType: 'vehicle', isPartial: false });
    expect(searchState.page()).toBeNull();
    expect(navigations.length).toBe(0);
  });

  it('conecta perfiles consolidados compartidos sin duplicar nodos ni eliminar vínculos existentes', () => {
    const record = (profileId: string, parentLinkId: string): PivotConsolidationRecord => ({
      graphProfileId: 'profile-origin', parentSearchId: 'search-origin', parentResultId: 'result-origin',
      parentLinkId, pivotSearchId: `search-${profileId}`, pivotResultId: `result-${profileId}`,
      profileId, savedAt: '2026-11-05T00:00:00.000Z'
    });
    const profile = (profileId: string, curp: string): ConsolidatedProfileResponse => ({
      profileId, profileVersionId: `${profileId}-version`, versionNumber: 1,
      searchId: `search-${profileId}`, preconsolidatedResultId: `result-${profileId}`,
      effectiveAtUtc: '2026-11-05T00:00:00.000Z',
      data: [{ dataId: `${profileId}-curp`, code: 'CURP', value: curp }]
    });
    const relation = (linkId: string, curp: string) => ({
      type: 'person' as const, item: { linkId,
        identifiers: [{ evidenceId: `${linkId}-curp`, code: 'CURP', value: curp }] }
    });
    const curpA = 'AAAA000101HDFABC01';
    const curpB = 'BBBB000101HDFABC02';
    const curpShared = 'CCCC000101HDFABC03';
    const a = record('profile-a', 'link-a');
    const b = record('profile-b', 'link-b');
    recordsByLink = { 'link-a': [a], 'link-b': [b] };
    const root = { id: 'profile-origin', type: 'person' as const, title: 'Principal',
      subtitle: '', x: 620, y: 320, radius: 35, details: [], links: emptyLinks };
    const nodeA = { ...root, id: 'node-a', title: 'Perfil A', x: 190, y: 120,
      identityKeys: [`person:CURP:${curpA}`] };
    const nodeB = { ...root, id: 'node-b', title: 'Perfil B', x: 1020, y: 120,
      identityKeys: [`person:CURP:${curpB}`] };
    const graph = { nodes: [root, nodeA, nodeB], links: [
      { id: 'edge-a', sourceId: root.id, targetId: nodeA.id, type: 'person' as const,
        externalId: 'link-a', label: 'Relacionado', status: '', details: [], sourceNames: [],
        searchId: 'search-origin', resultId: 'result-origin' },
      { id: 'edge-b', sourceId: root.id, targetId: nodeB.id, type: 'person' as const,
        externalId: 'link-b', label: 'Relacionado', status: '', details: [], sourceNames: [],
        searchId: 'search-origin', resultId: 'result-origin' }
    ] };
    component.expandedPivotBranches.set([
      { record: a, profile: profile('profile-a', curpA), relations: [
        relation('a-to-b', curpB), relation('a-to-shared', curpShared) ] },
      { record: b, profile: profile('profile-b', curpB), relations: [
        relation('b-to-shared', curpShared), relation('b-to-a', curpA) ] }
    ]);

    const result = component['appendPivotBranches'](graph);
    const shared = result.nodes.filter(node => node.identityKeys?.includes(`person:CURP:${curpShared}`));
    expect(shared.length).toBe(1);
    expect(result.nodes.length).toBe(4); // raíz, A, B y un único nodo compartido
    expect(result.nodes.find(node => node.id === 'node-b')?.x).toBe(1020);
    const pairs = result.links.map(link => `${link.sourceId}->${link.targetId}`);
    expect(pairs).toContain('profile-origin->node-a');
    expect(pairs).toContain('profile-origin->node-b');
    expect(pairs).toContain('node-a->node-b');
    expect(pairs).toContain(`node-a->${shared[0].id}`);
    expect(pairs).toContain(`node-b->${shared[0].id}`);
    expect(pairs).toContain('node-b->node-a');
    expect(new Set(pairs).size).toBe(result.links.length);

    // Al contraer un perfil se quitan solo sus aristas, no el nodo compartido de otros.
    component.expandedPivotBranches.set([
      { record: b, profile: profile('profile-b', curpB), relations: [relation('b-to-shared', curpShared)] }
    ]);
    const collapsed = component['appendPivotBranches'](graph);
    const remainingShared = collapsed.nodes.find(node => node.identityKeys?.includes(`person:CURP:${curpShared}`));
    expect(remainingShared).toBeDefined();
    expect(collapsed.links.some(link => link.sourceId === 'node-b' && link.targetId === remainingShared?.id)).toBeTrue();
    expect(collapsed.links.some(link => link.sourceId === 'node-a' && link.targetId === remainingShared?.id)).toBeFalse();
  });

  it('no fusiona personas solo por nombres parecidos si no tienen identidad comprobable', () => {
    const root = { id: 'profile-origin', type: 'person' as const,
      title: 'Juan Pérez López', subtitle: '', x: 620, y: 320, radius: 35,
      details: [], links: emptyLinks };
    const child = { ...root, id: 'child', x: 900, y: 100, title: 'Juan Pérez López' };
    const graph = { nodes: [root, child], links: [{ id: 'link',
      sourceId: root.id, targetId: child.id, type: 'person' as const, externalId: 'unconfirmed',
      label: 'Relacionado', status: '', details: [], sourceNames: [] }] };
    const result = component['appendPivotBranches'](graph);
    expect(result.nodes.length).toBe(2);
    expect(result.links.length).toBe(1);
  });

  it('une al perfil SALVADOR NAVA LUNA con el hijo sin CURP de un perfil pivoteado', () => {
    const pivotRecord: PivotConsolidationRecord = {
      graphProfileId: 'profile-origin', parentSearchId: 'search-origin', parentResultId: 'result-origin',
      parentLinkId: 'rey-link', pivotSearchId: 'search-rey', pivotResultId: 'result-rey',
      profileId: 'profile-rey', savedAt: '2026-11-05T00:00:00.000Z'
    };
    recordsByLink = { 'rey-link': [pivotRecord] };
    const root = { id: 'profile-origin', type: 'person' as const,
      title: 'SALVADOR NAVA LUNA', subtitle: 'NALS680131HGRVNL06',
      identityKeys: ['person:CURP:NALS680131HGRVNL06'],
      x: 620, y: 320, radius: 35, details: [], links: emptyLinks };
    const rey = { ...root, id: 'rey-node', title: 'REY PABLO II OLMOS RIOS',
      identityKeys: ['person:CURP:OORR890106HVZLSY01'], x: 930, y: 320 };
    const graph = { nodes: [root, rey], links: [{ id: 'root-rey', sourceId: root.id,
      targetId: rey.id, type: 'person' as const, externalId: 'rey-link',
      label: 'Relacionado', status: '', details: [], sourceNames: [],
      searchId: 'search-origin', resultId: 'result-origin' }] };
    const profileRey: ConsolidatedProfileResponse = {
      profileId: 'profile-rey', profileVersionId: 'rey-version', versionNumber: 1,
      searchId: 'search-rey', preconsolidatedResultId: 'result-rey',
      effectiveAtUtc: '2026-11-05T00:00:00.000Z',
      data: [
        { dataId: 'name', code: 'nombre', value: 'REY PABLO II' },
        { dataId: 'surname-1', code: 'apellidoPaterno', value: 'OLMOS' },
        { dataId: 'surname-2', code: 'apellidoMaterno', value: 'RIOS' },
        { dataId: 'curp', code: 'CURP', value: 'OORR890106HVZLSY01' }
      ]
    };
    // As in the provided API response, the linked person has a complete name
    // and an idRef but NO identity in identifiers (no CURP or CUIP).
    const linkSalvador = { type: 'person' as const, item: {
      linkId: 'rey-to-salvador', relationshipCode: 'COMPADRE', identifiers: [],
      attributes: [
        { evidenceId: 'id-ref', code: 'idRef', value: '5382728' },
        { evidenceId: 'name', code: 'nombre', value: 'SALVADOR' },
        { evidenceId: 'surname-1', code: 'apellidoPaterno', value: 'NAVA' },
        { evidenceId: 'surname-2', code: 'apellidoMaterno', value: 'LUNA' },
        { evidenceId: 'origin', code: 'sourceLinkedId', value: '4939545' }
      ]
    } };
    component.expandedPivotBranches.set([{ record: pivotRecord,
      profile: profileRey, relations: [linkSalvador] }]);
    const result = component['appendPivotBranches'](graph);
    expect(result.nodes.filter(node => node.title === 'SALVADOR NAVA LUNA').length).toBe(1);
    expect(result.nodes.length).toBe(2);
    expect(result.links.some(edge => edge.sourceId === 'rey-node'
      && edge.targetId === 'profile-origin' && edge.label === 'Compadre')).toBeTrue();
    expect(result.links.some(edge => edge.sourceId === 'profile-origin'
      && edge.targetId === 'rey-node')).toBeTrue();
  });

  it('consolida un hijo sin identificadores aunque su perfil aparezca después', () => {
    const record = (profileId: string, parentLinkId: string): PivotConsolidationRecord => ({
      graphProfileId: 'profile-origin', parentSearchId: 'search-origin', parentResultId: 'result-origin',
      parentLinkId, pivotSearchId: `search-${profileId}`, pivotResultId: `result-${profileId}`,
      profileId, savedAt: '2026-11-05T00:00:00.000Z'
    });
    const a = record('profile-a', 'link-a');
    const b = record('profile-b', 'link-b');
    const sandra = record('profile-sandra', 'b-to-sandra');
    recordsByLink = { 'link-a': [a], 'link-b': [b], 'b-to-sandra': [sandra] };
    const root = { id: 'profile-origin', type: 'person' as const, title: 'RAIZ',
      subtitle: '', x: 620, y: 320, radius: 35, details: [], links: emptyLinks };
    const nodeA = { ...root, id: 'node-a', title: 'Perfil A', x: 150, y: 80 };
    const nodeB = { ...root, id: 'node-b', title: 'Perfil B', x: 1050, y: 80 };
    const graph = { nodes: [root, nodeA, nodeB], links: [
      ...[nodeA, nodeB].map((node, index) => ({ id: `edge-${index}`,
        sourceId: root.id, targetId: node.id, type: 'person' as const,
        externalId: index === 0 ? 'link-a' : 'link-b', label: 'Relacionado',
        status: '', details: [], sourceNames: [], searchId: 'search-origin', resultId: 'result-origin' }))
    ] };
    const branchProfile = (profileId: string): ConsolidatedProfileResponse => ({
      profileId, profileVersionId: 'version', versionNumber: 1,
      searchId: `search-${profileId}`, preconsolidatedResultId: `result-${profileId}`,
      effectiveAtUtc: '2026-11-05T00:00:00.000Z', data: []
    });
    const sandraRelation = (linkId: string) => ({ type: 'person' as const, item: {
      linkId, identifiers: [], attributes: [
        { evidenceId: 'n', code: 'nombre', value: 'SANDRA' },
        { evidenceId: 'p', code: 'apellidoPaterno', value: 'VERA' },
        { evidenceId: 'm', code: 'apellidoMaterno', value: 'MORA' }
      ]
    } });
    component.expandedPivotBranches.set([
      { record: a, profile: branchProfile('profile-a'), relations: [sandraRelation('a-to-sandra')] },
      { record: b, profile: branchProfile('profile-b'), relations: [sandraRelation('b-to-sandra')] }
    ]);
    const result = component['appendPivotBranches'](graph);
    const shared = result.nodes.filter(node => node.title === 'SANDRA VERA MORA');
    expect(shared.length).toBe(1);
    expect(result.links.some(edge => edge.sourceId === 'node-a' && edge.targetId === shared[0].id)).toBeTrue();
    expect(result.links.some(edge => edge.sourceId === 'node-b' && edge.targetId === shared[0].id)).toBeTrue();
  });

  it('mantiene separados los homónimos con identificadores contradictorios', () => {
    const root = { id: 'profile-origin', type: 'person' as const,
      title: 'SALVADOR NAVA LUNA', subtitle: '',
      identityKeys: ['person:CURP:AAAA000101HDFABC01'],
      x: 620, y: 320, radius: 35, details: [], links: emptyLinks };
    const rey = { ...root, id: 'rey-node', title: 'REY PABLO II OLMOS RIOS',
      identityKeys: ['person:CURP:OORR890106HVZLSY01'], x: 930, y: 320 };
    const pivotRecord: PivotConsolidationRecord = {
      graphProfileId: 'profile-origin', parentSearchId: 'search-origin', parentResultId: 'result-origin',
      parentLinkId: 'rey-link', pivotSearchId: 'search-rey', pivotResultId: 'result-rey',
      profileId: 'profile-rey', savedAt: '2026-11-05T00:00:00.000Z'
    };
    recordsByLink = { 'rey-link': [pivotRecord] };
    const graph = { nodes: [root, rey], links: [{ id: 'root-rey', sourceId: root.id,
      targetId: rey.id, type: 'person' as const, externalId: 'rey-link',
      label: '', status: '', details: [], sourceNames: [],
      searchId: 'search-origin', resultId: 'result-origin' }] };
    component.expandedPivotBranches.set([{ record: pivotRecord, profile: {
      profileId: 'profile-rey', profileVersionId: 'version', versionNumber: 1,
      searchId: 'search-rey', preconsolidatedResultId: 'result-rey',
      effectiveAtUtc: '2026-11-05T00:00:00.000Z',
      data: [{ dataId: 'curp', code: 'CURP', value: 'OORR890106HVZLSY01' }]
    }, relations: [{ type: 'person', item: {
      linkId: 'other-salvador', identifiers: [{
        evidenceId: 'other-curp', code: 'CURP', value: 'BBBB000101HDFABC02'
      }], attributes: [
        { evidenceId: 'n', code: 'nombre', value: 'SALVADOR' },
        { evidenceId: 'p', code: 'apellidoPaterno', value: 'NAVA' },
        { evidenceId: 'm', code: 'apellidoMaterno', value: 'LUNA' }
      ] } }] }]);
    const result = component['appendPivotBranches'](graph);
    expect(result.nodes.filter(node => node.title === 'SALVADOR NAVA LUNA').length).toBe(2);
    expect(result.links.some(edge => edge.sourceId === 'rey-node'
      && edge.targetId === 'profile-origin')).toBeFalse();
  });

});
