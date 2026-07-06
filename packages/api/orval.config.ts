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
        // The mutator (customFetch) resolves to the raw parsed response body,
        // not an { data, status, headers } wrapper — so generated response
        // types must not add that wrapper either. Without this flag, Orval's
        // fetch client types responses one envelope deeper than what
        // customFetch actually returns at runtime.
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
