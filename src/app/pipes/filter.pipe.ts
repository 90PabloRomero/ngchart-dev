import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'appFilter' })
export class FilterPipe implements PipeTransform {
  /**
   * Pipe filters the list of elements based on the search text provided
   *
   * @param items list of elements to search in
   * @param searchSheet search string
   * @returns list of elements filtered by search text or []
   */
  transform(items: any[], searchSheet: string): any[] {
    if (!items) {
      return [];
    }
    if (!searchSheet) {
      return items;
    }
    searchSheet = searchSheet.toLocaleLowerCase();

    return items.filter(it => {
      return it.SheetName.toLocaleLowerCase().includes(searchSheet);
    });
  }
}