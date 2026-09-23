import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Sinal simples para levar o feed da Home de volta ao topo quando o usuário toca
 * no ícone "Início" da barra inferior já estando nela (mesmo comportamento de
 * apps como Instagram/TikTok, já que navegar para a mesma rota não faz nada).
 */
@Injectable({ providedIn: 'root' })
export class HomeScrollService {
  private readonly scrollToTop$ = new Subject<void>();
  readonly onScrollToTop = this.scrollToTop$.asObservable();

  requestScrollToTop(): void {
    this.scrollToTop$.next();
  }
}
