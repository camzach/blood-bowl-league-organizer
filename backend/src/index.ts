import { loadTypedefsSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { join } from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers';
import { createServer } from '@graphql-yoga/node';
import { DIRECTIVES } from '@graphql-codegen/typescript-mongodb';
import type { Db } from 'mongodb';
import { MongoClient, ServerApiVersion } from 'mongodb';

const typedefs = loadTypedefsSync(
  join(__dirname, 'schemas', '**/*.graphql'),
  { loaders: [new GraphQLFileLoader()] },
).map(src => src.document).filter((doc): doc is NonNullable<typeof doc> => !!doc);
const schema = makeExecutableSchema({ typeDefs: [DIRECTIVES, typedefs], resolvers });

const uri = 'mongodb+srv://admin:abc@bblm.pkmbu.mongodb.net/BBLM?retryWrites=true&w=majority';
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 }).connect();

export type Context = {
  db: Db;
};

const server = createServer({
  schema,
  port: 3000,
  cors: { origin: ['*'] },
  context: async(): Promise<Context> => ({ db: (await client).db('bblm') }),
});
server.start().catch(e => {
  console.log('Failed to start', e);
});

