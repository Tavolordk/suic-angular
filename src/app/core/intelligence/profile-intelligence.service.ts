import { Injectable } from '@angular/core';
import {
  ConsolidatedProfileAddressDto,
  ConsolidatedProfileDataDto,
  ConsolidatedProfileOriginDto,
  ConsolidatedProfileResponse
} from '../infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import {
  IntelligenceAnswer,
  IntelligenceConflict,
  IntelligenceEvidence,
  IntelligenceGraphContext,
  IntelligenceNodeContext,
  ProfileIntelligenceSnapshot
} from './profile-intelligence.models';

@Injectable({ providedIn: 'root' })
export class ProfileIntelligenceService {
  analyze(profile: ConsolidatedProfileResponse): ProfileIntelligenceSnapshot {
    const populatedData = (profile.data ?? []).filter((datum) => clean(datum.value));
    const addresses = profile.addresses ?? [];
    const origins = collectOrigins(profile);
    const facts = this.createFacts(populatedData, addresses);
    const conflicts = this.detectConflicts(populatedData);
    const title = resolveProfileTitle(profile);

    const metrics = {
      populatedData: populatedData.length,
      uniqueFields: new Set(
        populatedData.map((datum) => normalizeCode(datum.code || datum.dataType || datum.dataId))
      ).size,
      addresses: addresses.length,
      sources: origins.length,
      conflicts: conflicts.length
    };

    return {
      profileId: profile.profileId,
      title,
      summary: buildProfileStory(profile, title, conflicts),
      metrics,
      facts,
      conflicts,
      recommendations: this.buildRecommendations(conflicts, addresses, origins)
    };
  }

  answer(
    question: string,
    profile: ConsolidatedProfileResponse,
    selectedNode?: IntelligenceNodeContext,
    graph?: IntelligenceGraphContext
  ): IntelligenceAnswer {
    const snapshot = this.analyze(profile);
    const normalizedQuestion = normalizeText(question);

    if (!normalizedQuestion) {
      return this.storyAnswer(profile, snapshot, graph, selectedNode);
    }

    // Primero resolvemos preguntas puntuales. Así "dame la primera dirección" nunca
    // cae en un resumen general ni devuelve las demás direcciones.
    if (containsAny(normalizedQuestion, ['direccion', 'direcciones', 'domicilio', 'domicilios'])) {
      return this.addressesAnswer(
        profile,
        extractOrdinalIndex(normalizedQuestion),
        containsAny(normalizedQuestion, ['fuente', 'fuentes', 'origen', 'origenes', 'de donde', 'reporta', 'reportan', 'proviene', 'sale']),
        /\b(cuant[oa]s?|numero|cantidad|cuenta)\b/.test(normalizedQuestion)
      );
    }

    const fieldAnswer = this.dataFieldAnswer(profile, normalizedQuestion);
    if (fieldAnswer) {
      return fieldAnswer;
    }

    if (containsAny(normalizedQuestion, ['inconsistencia', 'inconsistencias', 'conflicto', 'conflictos', 'diferencia', 'diferencias', 'contradiccion', 'contradicciones'])) {
      return this.conflictsAnswer(snapshot);
    }

    if (containsAny(normalizedQuestion, ['vinculo', 'vinculos', 'relacion', 'relaciones', 'conexion', 'conexiones', 'conectado', 'conectada'])) {
      return this.relationshipsAnswer(profile, snapshot, graph, selectedNode);
    }

    if (containsAny(normalizedQuestion, ['nodo', 'seleccionado', 'seleccionada', 'activo', 'activa']) && selectedNode) {
      return this.nodeAnswer(selectedNode, graph);
    }

    if (containsAny(normalizedQuestion, ['fuente', 'fuentes', 'origen', 'origenes', 'reporta', 'reportan', 'proviene', 'sale'])) {
      return this.sourcesAnswer(profile, normalizedQuestion);
    }

    if (containsAny(normalizedQuestion, ['recomendacion', 'recomendaciones', 'revisar', 'siguiente', 'siguientes'])) {
      return {
        text: snapshot.recommendations.length
          ? `Si quieres seguirle el hilo, yo revisaría esto: ${snapshot.recommendations.join(' ')}`
          : 'Con lo que está visible no encuentro una revisión adicional concreta que sugerir.',
        evidence: snapshot.conflicts.flatMap((conflict) => conflict.evidence).slice(0, 12),
        disclaimer: 'Las sugerencias sólo señalan qué información conviene revisar; no califican a la persona.'
      };
    }

    if (containsAny(normalizedQuestion, ['chisme', 'cuentame', 'todo sobre', 'todo lo que', 'persona', 'quien es', 'que sabes', 'que aparece'])) {
      return this.storyAnswer(profile, snapshot, graph, selectedNode);
    }

    if (containsAny(normalizedQuestion, ['dato', 'datos', 'campo', 'campos', 'informacion', 'perfil', 'resume', 'resumen', 'describe', 'descripcion'])) {
      return this.storyAnswer(profile, snapshot, graph, selectedNode);
    }

    return {
      text: 'Eso no aparece de forma identificable en los datos que recibí. Puedo responderte con precisión sobre cualquier campo, dirección, fuente o vínculo que sí venga en el perfil o en el grafo.',
      evidence: [],
      disclaimer: 'No completo respuestas con información externa ni invento datos ausentes.'
    };
  }

  private storyAnswer(
    profile: ConsolidatedProfileResponse,
    snapshot: ProfileIntelligenceSnapshot,
    graph?: IntelligenceGraphContext,
    selectedNode?: IntelligenceNodeContext
  ): IntelligenceAnswer {
    const title = snapshot.title || 'esta persona';
    const paragraphs: string[] = [
      `Mira, de ${title} hay bastante información para seguirle el hilo. ${buildPersonalDetailsSentence(profile)} Te lo cuento tal como viene en las fuentes, sin completar ni corregir datos por mi cuenta.`
    ];

    const addresses = profile.addresses ?? [];
    if (addresses.length) {
      const places = addresses.slice(0, 4).map((address) => compactAddressPlace(address)).filter(Boolean);
      if (addresses.length === 1) {
        paragraphs.push(`En domicilios aparece uno registrado${places[0] ? `, ubicado en ${places[0]}` : ''}. Si quieres, te doy la dirección completa y quién la reporta.`);
      } else {
        const placeText = naturalJoin(places);
        paragraphs.push(
          `En domicilios aparecen ${addresses.length}. ${placeText ? `Se reparten entre ${placeText}. ` : ''}` +
          `No te aviento de golpe todas las calles y números: puedes pedirme la primera, la segunda, la última o preguntar qué fuente reporta cada una.`
        );
      }
    } else {
      paragraphs.push('En domicilios, por ahora no me llegó ninguno registrado para esta persona.');
    }

    const relationship = graphStory(profile, graph, selectedNode);
    if (relationship.text) {
      paragraphs.push(relationship.text);
    } else {
      const origins = collectOrigins(profile);
      if (origins.length) {
        paragraphs.push(
          `La información está respaldada por ${origins.length} registros de origen. Entre las fuentes que más aparecen están ${formatCounter(groupOrigins(origins), 5)}.`
        );
      }
    }

    if (snapshot.conflicts.length) {
      const names = snapshot.conflicts.slice(0, 6).map((conflict) => conflict.field).join(', ');
      paragraphs.push(
        `Y aquí sí hay algo que vale la pena mirar con calma: encontré ${snapshot.conflicts.length} ${plural(snapshot.conflicts.length, 'campo con valores diferentes', 'campos con valores diferentes')}. Aparecen en ${names}. Eso sólo significa que las fuentes no muestran exactamente lo mismo; no decide cuál dato es el correcto.`
      );
    } else {
      paragraphs.push(
        'Y por ahora las fuentes no se están contradiciendo en los campos que pude comparar. Eso está bien para seguir el análisis, aunque no significa que yo haya validado esos datos contra una fuente externa.'
      );
    }

    return {
      text: paragraphs.join('\n\n'),
      evidence: [...snapshot.facts.slice(0, 8), ...relationship.evidence.slice(0, 4)].slice(0, 12),
      disclaimer: 'Te lo cuento en tono conversacional, pero cada afirmación sale únicamente del response o del grafo recibido. “Aparece relacionado” no implica por sí solo amistad, parentesco, relación personal o relación delictiva.'
    };
  }

  private relationshipsAnswer(
    profile: ConsolidatedProfileResponse,
    snapshot: ProfileIntelligenceSnapshot,
    graph?: IntelligenceGraphContext,
    selectedNode?: IntelligenceNodeContext
  ): IntelligenceAnswer {
    const relationship = graphStory(profile, graph, selectedNode, true);
    if (relationship.text) {
      return {
        text: relationship.text,
        evidence: relationship.evidence.slice(0, 12),
        disclaimer: 'Sólo describo conexiones que existen como aristas en el grafo recibido; no deduzco el tipo de relación más allá de lo que el nodo indica.'
      };
    }

    const origins = collectOrigins(profile);
    const title = snapshot.title || 'esta persona';
    if (!origins.length) {
      return {
        text: `De ${title}, el response que recibí no trae vínculos de grafo ni registros de origen que pueda describir como conexiones.`,
        evidence: [],
        disclaimer: 'No agrego relaciones que no estén presentes en los datos recibidos.'
      };
    }

    return {
      text: `Sobre los vínculos de ${title}, todavía no tengo un grafo de entidades en esta petición, pero sí veo ${origins.length} registros de origen asociados a sus datos. Se reparten principalmente entre ${formatCounter(groupOrigins(origins), 6)}.`,
      evidence: origins.slice(0, 12).map((origin, index) => originEvidence(origin, index)),
      disclaimer: 'Los registros de origen indican de dónde salió la información; no equivalen por sí solos a vínculos personales.'
    };
  }

  private conflictsAnswer(snapshot: ProfileIntelligenceSnapshot): IntelligenceAnswer {
    if (!snapshot.conflicts.length) {
      return {
        text: `Por ahora no encuentro datos que se estén contradiciendo dentro del perfil de ${snapshot.title || 'esta persona'}. Cuando un mismo campo aparece varias veces, los valores recibidos coinciden entre sí.`,
        evidence: snapshot.facts.slice(0, 8),
        disclaimer: 'Esto no valida la información contra fuentes externas; sólo compara los valores presentes en el response recibido.'
      };
    }

    const descriptions = snapshot.conflicts.map(
      (conflict) => `${conflict.field} aparece como ${conflict.values.join(' / ')}`
    );

    return {
      text: `Aquí sí hay datos que no cuentan exactamente la misma historia sobre ${snapshot.title || 'esta persona'}: ${descriptions.join('; ')}. Yo los tomaría como puntos para contrastar con sus fuentes de origen.`,
      evidence: snapshot.conflicts.flatMap((conflict) => conflict.evidence),
      disclaimer: 'Una diferencia de valores no implica que alguno sea incorrecto; sólo indica que el response contiene más de un valor para el mismo campo.'
    };
  }

  private addressesAnswer(
    profile: ConsolidatedProfileResponse,
    ordinalIndex: number | null = null,
    includeSources = false,
    countOnly = false
  ): IntelligenceAnswer {
    const addresses = profile.addresses ?? [];
    const title = resolveProfileTitle(profile) || 'esta persona';
    if (!addresses.length) {
      return {
        text: `De ${title}, en lo que recibí no aparece ninguna dirección registrada.`,
        evidence: [],
        disclaimer: 'No se infieren domicilios que no estén incluidos en el response.'
      };
    }

    if (countOnly) {
      return {
        text: `De ${title} aparecen ${addresses.length} ${plural(addresses.length, 'dirección registrada', 'direcciones registradas')}.`,
        evidence: addresses.slice(0, 3).map((address, index) => addressEvidence(address, index)),
        disclaimer: 'El conteo se obtiene únicamente de las direcciones presentes en el response recibido.'
      };
    }

    if (ordinalIndex !== null) {
      const resolvedIndex = ordinalIndex === -1 ? addresses.length - 1 : ordinalIndex;
      if (resolvedIndex < 0 || resolvedIndex >= addresses.length) {
        const requested = ordinalIndex === -1 ? 'última' : `#${ordinalIndex + 1}`;
        return {
          text: `No existe esa dirección en lo que recibí: pediste la ${requested}, pero el perfil sólo trae ${addresses.length}.`,
          evidence: [],
          disclaimer: 'No sustituyo una posición inexistente por otra dirección.'
        };
      }

      const item = addressEvidence(addresses[resolvedIndex], resolvedIndex);
      const position = ordinalIndex === -1 ? 'última' : ordinalLabel(resolvedIndex);
      const sourceText = includeSources
        ? item.sourceCodes.length
          ? ` La reportan las fuentes ${naturalJoin(item.sourceCodes)}.`
          : ' Esa dirección no trae código de fuente visible en el response.'
        : '';
      return {
        text: `La ${position} dirección de ${title} es: ${item.value}.${sourceText}`,
        evidence: [item],
        disclaimer: 'Se devuelve únicamente la posición solicitada, respetando el orden recibido en el response.'
      };
    }

    const evidence = addresses.map((address, index) => addressEvidence(address, index));
    const descriptions = evidence.map((item, index) => `${index + 1}) ${item.value}`);
    return {
      text: `En la parte de domicilios de ${title} aparecen ${addresses.length} ${plural(addresses.length, 'dirección', 'direcciones')}. ${descriptions.join(' ')} Si una dirección trae varias fuentes, eso significa únicamente que más de un registro la reporta.`,
      evidence,
      disclaimer: 'Las direcciones se describen tal como fueron recibidas; no se geocodifican ni completan datos faltantes.'
    };
  }

  private dataFieldAnswer(
    profile: ConsolidatedProfileResponse,
    normalizedQuestion: string
  ): IntelligenceAnswer | null {
    const requested = requestedFieldAliases(normalizedQuestion);
    if (!requested.length) {
      return null;
    }

    const requestedVariants = requested.flatMap((canonical) => [
      canonical,
      ...(FIELD_QUERY_ALIASES[canonical] ?? [])
    ]).map(normalizeText);

    const matched = (profile.data ?? []).filter((datum) => {
      const label = normalizeText(humanize(datum.code || datum.dataType || datum.dataId));
      const code = normalizeText(datum.code || datum.dataType || '');
      const searchableCompact = compactText(`${label} ${code}`);
      return clean(datum.value) && requestedVariants.some((variant) =>
        label.includes(variant) || code.includes(variant) || searchableCompact.includes(compactText(variant))
      );
    });

    const title = resolveProfileTitle(profile) || 'esta persona';
    if (!matched.length) {
      return {
        text: `De ${title}, el campo ${naturalJoin(requested)} no aparece con valor en los datos que recibí.`,
        evidence: [],
        disclaimer: 'No completo campos faltantes con información externa.'
      };
    }

    const evidence = matched.map(dataEvidence);
    const details = evidence.map((item) => `${item.label}: ${item.value}`).join('; ');
    const wantsSources = containsAny(normalizedQuestion, ['fuente', 'fuentes', 'origen', 'origenes', 'de donde', 'reporta', 'reportan']);
    const sourceDetails = wantsSources
      ? evidence
          .filter((item) => item.sourceCodes.length)
          .map((item) => `${item.label} viene de ${naturalJoin(item.sourceCodes)}`)
          .join('; ')
      : '';

    return {
      text: `De ${title}, ${details}.${sourceDetails ? ` Fuentes: ${sourceDetails}.` : ''}`,
      evidence,
      disclaimer: 'La respuesta usa únicamente los valores del campo solicitado y sus orígenes recibidos.'
    };
  }

  private sourcesAnswer(
    profile: ConsolidatedProfileResponse,
    normalizedQuestion = ''
  ): IntelligenceAnswer {
    const origins = collectOrigins(profile);
    const title = resolveProfileTitle(profile) || 'esta persona';
    if (!origins.length) {
      return {
        text: `De ${title} no recibí registros de origen asociados a sus datos o direcciones.`,
        evidence: [],
        disclaimer: 'No se agregan fuentes que no estén presentes en el response.'
      };
    }

    const availableCodes = Array.from(new Set(origins.map((origin) => clean(origin.sourceCode)).filter(Boolean)));
    const compactQuestion = compactText(normalizedQuestion);
    const requestedCodes = availableCodes.filter((code) =>
      normalizedQuestion.includes(normalizeText(code)) || compactQuestion.includes(compactText(code))
    );

    if (requestedCodes.length) {
      const requestedNormalized = new Set(requestedCodes.map(normalizeText));
      const evidence: IntelligenceEvidence[] = [];

      (profile.data ?? []).forEach((datum) => {
        const item = dataEvidence(datum);
        if (clean(item.value) && item.sourceCodes.some((code) => requestedNormalized.has(normalizeText(code)))) {
          evidence.push(item);
        }
      });
      (profile.addresses ?? []).forEach((address, index) => {
        const item = addressEvidence(address, index);
        if (item.sourceCodes.some((code) => requestedNormalized.has(normalizeText(code)))) {
          evidence.push(item);
        }
      });

      if (evidence.length) {
        return {
          text: `De ${title}, la fuente ${naturalJoin(requestedCodes)} respalda esto en los datos recibidos: ${evidence.map((item) => `${item.label}: ${item.value}`).join('; ')}.`,
          evidence,
          disclaimer: 'Se muestran únicamente datos y direcciones cuyo origin.sourceCode coincide con la fuente solicitada.'
        };
      }
    }

    return {
      text: `Lo que aparece de ${title} viene de ${origins.length} registros de origen. Las fuentes que más se repiten son ${formatCounter(groupOrigins(origins), 8)}. Eso te sirve para ubicar rápidamente de dónde se está formando el perfil y qué fuente aporta más registros visibles.`,
      evidence: origins.map((origin, index) => originEvidence(origin, index)),
      disclaimer: 'La lista se obtiene exclusivamente de los objetos origins recibidos en datos y direcciones.'
    };
  }

  private nodeAnswer(node: IntelligenceNodeContext, graph?: IntelligenceGraphContext): IntelligenceAnswer {
    const details = node.details.filter((detail) => clean(detail.value) && detail.value !== '—');
    const detailText = details.length
      ? details.map((detail) => `${detail.label}: ${detail.value}`).join('; ')
      : 'sin detalle adicional visible';
    const connected = graph ? connectedGraphNodes(graph, node.id) : [];
    const connectionText = connected.length
      ? ` En el grafo está conectado directamente con ${connected.length} ${plural(connected.length, 'nodo', 'nodos')}: ${formatNodeTitles(connected, 6)}.`
      : ' No veo conexiones directas adicionales para este nodo dentro del grafo recibido.';

    return {
      text: `Mira, el nodo que tienes seleccionado es ${node.title}. En pantalla aparece como ${node.type.toLocaleLowerCase('es-MX')}. ${node.subtitle ? `Su referencia visible es ${node.subtitle}. ` : ''}Lo que trae como detalle es: ${detailText}.${connectionText}`,
      evidence: [nodeEvidence(node), ...connected.slice(0, 6).map(nodeEvidence)],
      disclaimer: 'La descripción corresponde únicamente al nodo seleccionado y a las aristas presentes en el grafo recibido.'
    };
  }

  private createFacts(
    data: ConsolidatedProfileDataDto[],
    addresses: ConsolidatedProfileAddressDto[]
  ): IntelligenceEvidence[] {
    return [
      ...data.map((datum) => dataEvidence(datum)),
      ...addresses.map((address, index) => addressEvidence(address, index))
    ];
  }

  private detectConflicts(data: ConsolidatedProfileDataDto[]): IntelligenceConflict[] {
    const groups = new Map<string, ConsolidatedProfileDataDto[]>();
    data.forEach((datum) => {
      const key = normalizeCode(datum.code || datum.dataType || datum.dataId);
      groups.set(key, [...(groups.get(key) ?? []), datum]);
    });

    const conflicts: IntelligenceConflict[] = [];
    groups.forEach((items) => {
      const distinctValues = Array.from(
        new Map(
          items
            .map((item) => clean(item.value))
            .filter(Boolean)
            .map((value) => [normalizeText(value), value] as const)
        ).values()
      );
      if (distinctValues.length <= 1) {
        return;
      }
      const first = items[0];
      conflicts.push({
        field: humanize(first.code || first.dataType || first.dataId || 'Dato'),
        values: distinctValues,
        evidence: items.map((item) => dataEvidence(item))
      });
    });
    return conflicts;
  }

  private buildRecommendations(
    conflicts: IntelligenceConflict[],
    addresses: ConsolidatedProfileAddressDto[],
    origins: ConsolidatedProfileOriginDto[]
  ): string[] {
    const recommendations: string[] = [];
    if (conflicts.length) {
      recommendations.push(`Contrastar ${conflicts.length} ${plural(conflicts.length, 'campo que trae valores distintos', 'campos que traen valores distintos')} con sus registros de origen.`);
    }
    if (origins.length > 1) {
      recommendations.push(`Seguir los ${origins.length} registros de origen para ver qué aporta cada fuente y dónde coinciden.`);
    }
    if (addresses.length) {
      recommendations.push(`Revisar ${addresses.length} ${plural(addresses.length, 'dirección', 'direcciones')} y qué fuentes respaldan cada una.`);
    }
    return recommendations;
  }
}

function buildProfileStory(
  profile: ConsolidatedProfileResponse,
  title: string,
  conflicts: IntelligenceConflict[]
): string {
  const subject = title || 'esta persona';
  const addresses = profile.addresses ?? [];
  const origins = collectOrigins(profile);
  const conflictText = conflicts.length
    ? `Sí hay ${conflicts.length} ${plural(conflicts.length, 'dato que conviene contrastar', 'datos que conviene contrastar')} porque aparecen con valores distintos.`
    : 'Dentro de lo recibido, los campos repetidos no muestran valores diferentes entre sí.';
  return `Te cuento lo que aparece de ${subject}. ${buildPersonalDetailsSentence(profile)} Además, hay ${addresses.length} ${plural(addresses.length, 'dirección registrada', 'direcciones registradas')} y ${origins.length} ${plural(origins.length, 'registro de origen', 'registros de origen')} respaldando la información. ${conflictText}`;
}

function buildPersonalDetailsSentence(profile: ConsolidatedProfileResponse): string {
  const preferred: Array<[string[], string]> = [
    [['FECHANACIMIENTO', 'BIRTHDATE', 'DATEOFBIRTH'], 'fecha de nacimiento'],
    [['SEXO', 'SEX', 'GENDER'], 'sexo'],
    [['ESTADOCIVIL', 'MARITALSTATUS'], 'estado civil'],
    [['NACIONALIDAD', 'NATIONALITY'], 'nacionalidad'],
    [['EMPLOYMENTDEPENDENCE', 'DEPENDENCIA', 'DEPENDENCIAEMPLEO'], 'dependencia laboral'],
    [['EMPLOYMENTCORPORATION', 'CORPORACION', 'CORPORACIONEMPLEO'], 'corporación laboral'],
    [['OCUPACION', 'OCCUPATION', 'CARGO'], 'ocupación/cargo']
  ];
  const values = preferred
    .map(([codes, label]) => {
      const value = findValue(profile, codes);
      return value ? `${label}: ${value}` : '';
    })
    .filter(Boolean)
    .slice(0, 6);
  if (!values.length) {
    const count = (profile.data ?? []).filter((datum) => clean(datum.value)).length;
    return count
      ? `El perfil trae ${count} ${plural(count, 'dato con valor', 'datos con valor')}.`
      : 'El perfil no trae datos personales con valor para describir.';
  }
  return `Entre sus datos personales aparecen ${naturalJoin(values)}.`;
}

function graphStory(
  profile: ConsolidatedProfileResponse,
  graph?: IntelligenceGraphContext,
  selectedNode?: IntelligenceNodeContext,
  relationshipOnly = false
): { text: string; evidence: IntelligenceEvidence[] } {
  if (!graph?.nodes?.length) {
    return { text: '', evidence: [] };
  }
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const root = nodeMap.get(profile.profileId) ?? graph.nodes.find((node) => ['perfil', 'persona', 'person', 'profile'].includes(normalizeText(node.type)));
  if (!root) {
    return { text: '', evidence: [] };
  }
  const connected = connectedGraphNodes(graph, root.id);
  const title = resolveProfileTitle(profile) || root.title || 'esta persona';
  if (!connected.length) {
    return {
      text: `En el grafo, ${title} aparece como nodo principal pero no tiene conexiones directas en las aristas que recibí.`,
      evidence: [nodeEvidence(root)]
    };
  }

  const repeated = formatCounter(groupBy(connected.map((node) => clean(node.title) || humanNodeType(node.type))), 5);
  let text = `Y en el grafo sí hay bastante movimiento alrededor de ${title}: tiene ${connected.length} ${plural(connected.length, 'conexión directa', 'conexiones directas')}. Lo que más se repite entre esos vínculos es ${repeated}.`;

  const selected = selectedNode ?? (graph.selectedNodeId ? nodeMap.get(graph.selectedNodeId) : undefined);
  if (selected && selected.id !== root.id) {
    const selectedNeighbors = connectedGraphNodes(graph, selected.id);
    if (selectedNeighbors.some((node) => node.id === root.id)) {
      text += ` Ahora mismo tienes seleccionado ${selected.title}: ese nodo sí tiene una conexión directa con ${title} dentro del grafo.`;
    } else if (selectedNeighbors.length) {
      text += ` Ahora mismo tienes seleccionado ${selected.title}. No está unido directamente a ${title} en las aristas recibidas; sus conexiones directas visibles son ${formatNodeTitles(selectedNeighbors, 5)}.`;
    }
  }

  if (!relationshipOnly) {
    text += ' Aquí “conexión” significa únicamente que el grafo los enlaza; no estoy suponiendo una relación personal que los datos no indiquen.';
  }

  return {
    text,
    evidence: [nodeEvidence(root), ...connected.slice(0, 11).map(nodeEvidence)]
  };
}

function connectedGraphNodes(graph: IntelligenceGraphContext, nodeId: string): IntelligenceNodeContext[] {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const ids: string[] = [];
  graph.links.forEach((link) => {
    if (link.sourceId === nodeId) ids.push(link.targetId);
    else if (link.targetId === nodeId) ids.push(link.sourceId);
  });
  const seen = new Set<string>();
  return ids
    .filter((id) => !seen.has(id) && !!nodeMap.get(id) && seen.add(id))
    .map((id) => nodeMap.get(id)!)
    .filter(Boolean);
}

function nodeEvidence(node: IntelligenceNodeContext): IntelligenceEvidence {
  const details = node.details
    .filter((detail) => clean(detail.label) && clean(detail.value) && detail.value !== '—')
    .slice(0, 4)
    .map((detail) => `${detail.label}: ${detail.value}`);
  return {
    kind: 'node',
    id: node.id,
    label: node.title,
    value: details.join('; ') || node.subtitle || humanNodeType(node.type),
    sourceCodes: []
  };
}

function humanNodeType(value: string): string {
  const normalized = normalizeText(value);
  const map: Record<string, string> = {
    person: 'persona', persona: 'persona', profile: 'perfil', perfil: 'perfil',
    source: 'fuente', fuente: 'fuente', vehicle: 'vehículo', vehiculo: 'vehículo',
    address: 'dirección', direccion: 'dirección', organization: 'organización', organizacion: 'organización',
    phone: 'teléfono', telefono: 'teléfono'
  };
  return map[normalized] ?? (clean(value).toLocaleLowerCase('es-MX') || 'entidad');
}

function groupOrigins(origins: ConsolidatedProfileOriginDto[]): Map<string, number> {
  return groupBy(origins.map((origin) => clean(origin.sourceCode) || 'Fuente sin código'));
}

function groupBy(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  values.forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  return map;
}

function formatCounter(counter: Map<string, number>, limit: number): string {
  const ordered = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  const selected = ordered.slice(0, limit).map(([label, count]) => `${label} (${count})`);
  const remaining = ordered.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  if (remaining) selected.push(`${remaining} más`);
  return naturalJoin(selected) || 'sin categorías disponibles';
}

function formatNodeTitles(nodes: IntelligenceNodeContext[], limit: number): string {
  const values = nodes.slice(0, limit).map((node) => clean(node.title) || humanNodeType(node.type));
  if (nodes.length > limit) values.push(`${nodes.length - limit} más`);
  return naturalJoin(values);
}

function naturalJoin(values: string[]): string {
  const cleanValues = values.filter(Boolean);
  if (cleanValues.length <= 1) return cleanValues[0] ?? '';
  return `${cleanValues.slice(0, -1).join(', ')} y ${cleanValues[cleanValues.length - 1]}`;
}

function dataEvidence(datum: ConsolidatedProfileDataDto): IntelligenceEvidence {
  return {
    kind: 'data',
    id: datum.dataId,
    label: humanize(datum.code || datum.dataType || 'Dato'),
    value: clean(datum.value) || '—',
    sourceCodes: uniqueSourceCodes(datum.origins ?? [])
  };
}

function addressEvidence(address: ConsolidatedProfileAddressDto, index: number): IntelligenceEvidence {
  return {
    kind: 'address',
    id: address.addressId,
    label: clean(address.type) || `Dirección ${index + 1}`,
    value: formatAddress(address),
    sourceCodes: uniqueSourceCodes(address.origins ?? [])
  };
}

function originEvidence(origin: ConsolidatedProfileOriginDto, index: number): IntelligenceEvidence {
  const sourceCode = clean(origin.sourceCode) || `Fuente ${index + 1}`;
  const sourceRecord = clean(origin.sourceRecordId);
  return {
    kind: 'origin',
    id: origin.originId || `${sourceCode}-${index}`,
    label: 'Registro de origen',
    value: sourceRecord ? `${sourceCode} (${sourceRecord})` : sourceCode,
    sourceCodes: [sourceCode]
  };
}

function collectOrigins(profile: ConsolidatedProfileResponse): ConsolidatedProfileOriginDto[] {
  const seen = new Set<string>();
  const origins: ConsolidatedProfileOriginDto[] = [];
  const add = (origin: ConsolidatedProfileOriginDto) => {
    const key = [origin.originId, origin.sourceCode, origin.sourceRecordId].map((part) => clean(part)).filter(Boolean).join('|');
    if (!key || seen.has(key)) return;
    seen.add(key);
    origins.push(origin);
  };
  (profile.data ?? []).forEach((datum) => (datum.origins ?? []).forEach(add));
  (profile.addresses ?? []).forEach((address) => (address.origins ?? []).forEach(add));
  return origins;
}

function uniqueSourceCodes(origins: ConsolidatedProfileOriginDto[]): string[] {
  return Array.from(new Set(origins.map((origin) => clean(origin.sourceCode)).filter(Boolean)));
}

function resolveProfileTitle(profile: ConsolidatedProfileResponse): string {
  const direct = findValue(profile, ['NOMBRECOMPLETO', 'FULLNAME']);
  if (direct) return direct;
  const firstName = findValue(profile, ['NOMBRE', 'NOMBRES', 'NAME', 'FIRSTNAME']);
  const paternal = findValue(profile, ['APELLIDOPATERNO', 'PRIMERAPELLIDO', 'LASTNAME', 'SURNAME']);
  const maternal = findValue(profile, ['APELLIDOMATERNO', 'SEGUNDOAPELLIDO', 'SECONDLASTNAME', 'MOTHERSLASTNAME']);
  return [firstName, paternal, maternal].filter(Boolean).join(' ').trim();
}

function findValue(profile: ConsolidatedProfileResponse, codes: string[]): string {
  const wanted = new Set(codes.map(normalizeCode));
  return clean((profile.data ?? []).find((datum) => wanted.has(normalizeCode(datum.code ?? '')))?.value);
}

function compactAddressPlace(address: ConsolidatedProfileAddressDto): string {
  const municipality = clean(address.municipality);
  const state = clean(address.state);
  if (municipality && state) return `${municipality}, ${state}`;
  return municipality || state;
}

function formatAddress(address: ConsolidatedProfileAddressDto): string {
  const street = [clean(address.street), clean(address.exteriorNumber)].filter(Boolean).join(' ');
  const interior = clean(address.interiorNumber) ? `Int. ${clean(address.interiorNumber)}` : '';
  return [
    street,
    interior,
    clean(address.neighborhood),
    clean(address.municipality),
    clean(address.state),
    clean(address.postalCode) ? `C.P. ${clean(address.postalCode)}` : ''
  ].filter(Boolean).join(', ') || 'dirección consolidada sin detalle adicional';
}

const FIELD_QUERY_ALIASES: Record<string, string[]> = {
  curp: ['curp'],
  rfc: ['rfc'],
  cuip: ['cuip'],
  cib: ['cib'],
  nombre: ['nombre', 'nombres', 'nombre completo'],
  'apellido paterno': ['apellido paterno', 'primer apellido'],
  'apellido materno': ['apellido materno', 'segundo apellido'],
  'fecha de nacimiento': ['fecha nacimiento', 'fecha de nacimiento', 'nacimiento'],
  sexo: ['sexo'],
  'estado civil': ['estado civil'],
  nacionalidad: ['nacionalidad'],
  dependencia: ['dependencia', 'dependencia laboral', 'employment dependence'],
  corporacion: ['corporacion', 'corporacion laboral', 'employment corporation'],
  ocupacion: ['ocupacion', 'cargo', 'ocupacion cargo']
};

function requestedFieldAliases(normalizedQuestion: string): string[] {
  return Object.entries(FIELD_QUERY_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => normalizedQuestion.includes(alias)))
    .map(([canonical]) => canonical);
}

function extractOrdinalIndex(value: string): number | null {
  const normalized = normalizeText(value);
  if (/\b(ultima|ultimo)\b/.test(normalized)) return -1;
  const patterns: Array<[RegExp, number]> = [
    [/\b(primera|primer|primero|1ra|1er|1ero|1)\b/, 0],
    [/\b(segunda|segundo|2da|2do|2)\b/, 1],
    [/\b(tercera|tercer|tercero|3ra|3er|3ero|3)\b/, 2],
    [/\b(cuarta|cuarto|4ta|4to|4)\b/, 3],
    [/\b(quinta|quinto|5ta|5to|5)\b/, 4],
    [/\b(sexta|sexto|6ta|6to|6)\b/, 5],
    [/\b(septima|septimo|7ma|7mo|7)\b/, 6],
    [/\b(octava|octavo|8va|8vo|8)\b/, 7],
    [/\b(novena|noveno|9na|9no|9)\b/, 8],
    [/\b(decima|decimo|10ma|10mo|10)\b/, 9]
  ];
  return patterns.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function ordinalLabel(index: number): string {
  const labels = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];
  return labels[index] ?? `dirección #${index + 1}`;
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function compactText(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function normalizeCode(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '').toUpperCase();
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').trim();
}

function humanize(value: string): string {
  const compact = clean(value);
  if (!compact) return 'Dato';
  return compact
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLocaleLowerCase('es-MX')
    .replace(/^./, (character) => character.toLocaleUpperCase('es-MX'));
}

function containsAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function plural(count: number, singular: string, pluralValue: string): string {
  return count === 1 ? singular : pluralValue;
}
