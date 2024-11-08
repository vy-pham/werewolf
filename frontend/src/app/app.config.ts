import {
  ApplicationConfig,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { provideToastr } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { setContext } from '@apollo/client/link/context';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(), // required animations providers
    provideToastr(), //
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const authLink = setContext((_, { headers }) => {
        const token = JSON.parse(localStorage.getItem('token') as string);

        return {
          headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
          },
        };
      });

      return {
        link: authLink.concat(
          httpLink.create({
            uri: 'http://localhost:4300/graphql',
          })
        ),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
