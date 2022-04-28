import { loadSchemaSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { join } from 'path';
import { addResolversToSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers';
import { createServer } from '@graphql-yoga/node';

const typedefs = loadSchemaSync(join(__dirname, 'schemas', '**/*.graphql'), { loaders: [new GraphQLFileLoader()] });
const schema = addResolversToSchema(typedefs, resolvers);

const server = createServer({ schema, port: 3000, cors: { origin: ['*'] } });
server.start().catch(e => {
  console.log('Failed to start', e);
});

