import { generateModels } from './connectionResolver';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
import * as permissions from './permissions';

import { getSubdomain } from '@erxes/api-utils/src/core';
import beforeResolvers from './beforeResolvers';
import documents from './documents';
import logs from './logUtils';
import { initBroker } from './messageBroker';

export let debug;
export let mainDb;

export default {
  name: 'processes',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers: await resolvers(),
    };
  },
  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.subdomain = subdomain;
    context.models = await generateModels(subdomain);

    return context;
  },
  onServerInit: async (options) => {
    await generateModels('os');

    initBroker();

    debug = options.debug;

    // es = options.elasticsearch;
  },

  meta: {
    logs: { consumers: logs },
    beforeResolvers,
    permissions,
    documents,
  },
};
