import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'className',
  standalone: true,
})
export class ClassNamePipe implements PipeTransform {
  transform(...classes: any[]): string {
    const filterClass = classes
      .filter((name) => typeof name === 'string')
      .join(' ');
    return filterClass;
  }
}
