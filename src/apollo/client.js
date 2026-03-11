import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

// Get backend URL from environment or use default
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, ''); // Remove trailing slash
const GRAPHQL_URI = `${BACKEND_URL}/graphql`;
const WS_URI = BACKEND_URL.replace(/^http/, 'ws') + '/graphql';

const httpLink = createHttpLink({
  uri: GRAPHQL_URI,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(createClient({
  url: WS_URI,
  connectionParams: () => {
    const token = localStorage.getItem('token');
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
  // Make subscriptions resilient (common issue on flaky networks / laptop sleep)
  retryAttempts: Infinity,
  retryWait: async (retries) => {
    // exponential backoff up to 10s
    const delay = Math.min(1000 * (2 ** Math.min(retries, 4)), 10000);
    await new Promise((r) => setTimeout(r, delay));
  },
}));

// Split link: use WebSocket for subscriptions, HTTP for queries/mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

