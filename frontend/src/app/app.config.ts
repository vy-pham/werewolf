import { ApplicationConfig, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { GET_MY_USER } from './home/home.queries';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideHttpClient(), provideApollo(() => {
    const httpLink = inject(HttpLink);

    return {
      link: httpLink.create({
        uri: 'http://localhost:4300/graphql',
      }),
      cache: new InMemoryCache(),

    };
  })]
};
