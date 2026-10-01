import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subscriber, map } from 'rxjs';

import { SKIP_SYSTEM_AUTH } from '../http/http-context.tokens';
import { ConsolidatedProfileResponse } from '../infrastructure/consolidated-profiles-api/consolidated-profiles-api.models';
import { IntelligenceNodeContext } from './profile-intelligence.models';
import { INTELLIGENCE_API_BASE_URL } from './intelligence-api.config';
import {
  GraphAnalysisApiResponse,
  IntelligenceAnswerApiResponse,
  IntelligenceAnswerRequest,
  IntelligenceChatHistoryMessage,
  IntelligenceChatMode,
  IntelligenceChatRequest,
  IntelligenceChatStreamEvent,
  IntelligenceGraphPayload,
  IntelligenceLlmHealthResponse,
  IntelligenceProfilePayload,
  ProfileAnalysisApiResponse
} from './intelligence-api.models';

@Injectable({ providedIn: 'root' })
export class IntelligenceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(INTELLIGENCE_API_BASE_URL).replace(/\/+$/, '');
  private readonly context = new HttpContext().set(SKIP_SYSTEM_AUTH, true);

  analyzeProfile(profile: ConsolidatedProfileResponse): Observable<ProfileAnalysisApiResponse> {
    return this.http.post<ProfileAnalysisApiResponse>(
      `${this.baseUrl}/api/v1/intelligence/profile/analyze`,
      this.toProfilePayload(profile),
      { context: this.context, withCredentials: false }
    );
  }

  checkLlmHealth(): Observable<IntelligenceLlmHealthResponse> {
    return this.http.get<{
      status: 'ok' | 'degraded';
      model: string;
      llmEnabled: boolean;
      caseLimitBytes?: number;
    }>(
      `${this.baseUrl}/health`,
      { context: this.context, withCredentials: false }
    ).pipe(
      map((health) => ({
        status: health.status,
        runtimeReachable: true,
        modelAvailable: health.llmEnabled,
        model: health.model,
        detail: health.llmEnabled
          ? 'API de IA local disponible.'
          : 'El LLM local está deshabilitado.'
      }))
    );
  }

  answerProfile(
    profile: ConsolidatedProfileResponse,
    question: string,
    selectedNode?: IntelligenceNodeContext | null,
    graph?: IntelligenceGraphPayload | null
  ): Observable<IntelligenceAnswerApiResponse> {
    const request: IntelligenceAnswerRequest = {
      profile: this.toProfilePayload(profile),
      question,
      selectedNode: selectedNode ?? null,
      graph: graph ?? null
    };

    return this.http.post<IntelligenceAnswerApiResponse>(
      `${this.baseUrl}/api/v1/intelligence/profile/answer`,
      request,
      { context: this.context, withCredentials: false }
    );
  }

  streamChat(
    profile: ConsolidatedProfileResponse,
    question: string,
    history: IntelligenceChatHistoryMessage[],
    thinking: boolean,
    selectedNode?: IntelligenceNodeContext | null,
    graph?: IntelligenceGraphPayload | null,
    mode: IntelligenceChatMode = 'auto'
  ): Observable<IntelligenceChatStreamEvent> {
    const request: IntelligenceChatRequest = {
      profile: this.toProfilePayload(profile),
      question,
      selectedNode: selectedNode ?? null,
      graph: graph ?? null,
      history: history.slice(-8),
      thinking,
      mode
    };

    return new Observable<IntelligenceChatStreamEvent>((subscriber) => {
      const controller = new AbortController();

      void this.consumeChatStream(request, controller.signal, subscriber);

      return () => controller.abort();
    });
  }

  analyzeGraph(payload: IntelligenceGraphPayload): Observable<GraphAnalysisApiResponse> {
    return this.http.post<GraphAnalysisApiResponse>(
      `${this.baseUrl}/api/v1/intelligence/graph/analyze`,
      payload,
      { context: this.context, withCredentials: false }
    );
  }

  private async consumeChatStream(
    request: IntelligenceChatRequest,
    signal: AbortSignal,
    subscriber: Subscriber<IntelligenceChatStreamEvent>
  ): Promise<void> {
    try {
      // fetch se usa sólo para poder leer el stream progresivamente. No pasa por el
      // interceptor del sistema y credentials:'omit' impide enviar cookies/JWT.
      const response = await fetch(`${this.baseUrl}/api/v1/intelligence/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(request),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal
      });

      if (!response.ok) {
        throw new Error(`La API IA respondió HTTP ${response.status}.`);
      }
      if (!response.body) {
        throw new Error('La API IA no devolvió un stream de respuesta.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const emitBlock = (block: string): void => {
        const data = block
          .replace(/\r\n/g, '\n')
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n')
          .trim();
        if (!data) {
          return;
        }
        subscriber.next(JSON.parse(data) as IntelligenceChatStreamEvent);
      };

      while (!subscriber.closed) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          emitBlock(block);
        }
      }

      // Algunos proxies pueden cerrar el stream sin el separador final \n\n.
      // Procesamos cualquier bloque residual para no perder `done`/`replace`.
      if (!subscriber.closed && buffer.trim()) {
        emitBlock(buffer);
      }

      if (!subscriber.closed) {
        subscriber.complete();
      }
    } catch (error) {
      if (signal.aborted) {
        if (!subscriber.closed) {
          subscriber.complete();
        }
        return;
      }
      subscriber.error(error);
    }
  }

  private toProfilePayload(profile: ConsolidatedProfileResponse): IntelligenceProfilePayload {
    // Minimización: no se envían searchId, preconsolidatedResultId, versiones ni otros
    // metadatos que el analizador no necesita para describir lo visible.
    return {
      profileId: profile.profileId,
      data: profile.data ?? [],
      addresses: profile.addresses ?? []
    };
  }
}
