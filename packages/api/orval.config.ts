import { defineConfig } from 'orval';

export default defineConfig({
  iziwellpass: {
    input: {
      target: '../../openapi.json',
    },
    output: {
      target: './src/generated/endpoints.ts',
      mode: 'split',
      client: 'react-query',
      httpClient: 'fetch',
      prettier: true,
      override: {
        mutator: {
          path: './src/client.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
