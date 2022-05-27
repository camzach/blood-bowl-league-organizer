import { loadTypedefsSync } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { join } from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers';
import { createServer } from '@graphql-yoga/node';
import { DIRECTIVES } from '@graphql-codegen/typescript-mongodb';
import type { Db } from 'mongodb';
import { MongoClient, ServerApiVersion } from 'mongodb';

export type Context = { db: Db };

const typedefs = loadTypedefsSync(
  join(__dirname, 'schemas', '**/*.graphql'),
  { loaders: [new GraphQLFileLoader()] },
).map(src => src.document).filter((doc): doc is NonNullable<typeof doc> => !!doc);
const schema = makeExecutableSchema({ typeDefs: [DIRECTIVES, typedefs], resolvers });

const uri = 'mongodb+srv://admin:abc@bblm.pkmbu.mongodb.net/BBLM?retryWrites=true&w=majority';

void new MongoClient(uri, { serverApi: ServerApiVersion.v1 }).connect()
  .then(c => createServer({
    schema,
    port: 3000,
    cors: { origin: ['*'] },
    context: { db: c.db('bblm') },
  }))
  .then(async server => server.start())
  .catch(e => {
    console.log('Failed to start', e);
  });
