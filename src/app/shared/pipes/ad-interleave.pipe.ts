import { Pipe, PipeTransform, inject } from '@angular/core';
import { AdvertisementService } from '../../services/advertisement.service';
import { Advertisement } from '../../models/advertisement.model';
import { firstValueFrom, from, of } from 'rxjs';
import { map, mergeMap, toArray } from 'rxjs/operators';

export interface InterleavedItem<T> {
  type: 'data' | 'ad';
  data?: T;
  ad?: Advertisement;
}

@Pipe({
  name: 'adInterleave',
  standalone: true
})
export class AdInterleavePipe implements PipeTransform {
  private adService = inject(AdvertisementService);

  async transform<T>(items: T[] | null): Promise<InterleavedItem<T>[]> {
    if (!items || items.length === 0) return [];

    const result: InterleavedItem<T>[] = [];
    for (let i = 0; i < items.length; i++) {
      result.push({ type: 'data', data: items[i] });
      
      // A cada 10 itens, insere um anúncio
      if ((i + 1) % 10 === 0) {
        try {
          const ad = await firstValueFrom(this.adService.getRandomAdvertisement());
          if (ad) {
            result.push({ type: 'ad', ad });
          }
        } catch (e) {
          console.error('Error fetching ad for pipe', e);
        }
      }
    }
    return result;
  }
}
