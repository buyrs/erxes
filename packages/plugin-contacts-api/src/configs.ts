import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';

import { initBroker, sendSegmentsMessage } from './messageBroker';
import { routeErrorHandling } from '@erxes/api-utils/src/requests';
import { buildFile } from './exporterByUrl';
import segments from './segments';
import dashboards from './dashboards';
import forms from './forms';
import { generateModels } from './connectionResolver';
import logs from './logUtils';
import imports from './imports';
import tags from './tags';
import internalNotes from './internalNotes';
import automations from './automations';
import search from './search';
import * as permissions from './permissions';
import { getSubdomain } from '@erxes/api-utils/src/core';
import webhooks from './webhooks';
import {
  updateContactsValidationStatus,
  updateContactValidationStatus,
} from './verifierUtils';
import exporter from './exporter';
import documents from './documents';
import { EMAIL_VALIDATION_STATUSES, NOTIFICATION_MODULES } from './constants';
import app from '@erxes/api-utils/src/app';

export let mainDb;
export let debug;

export default {
  name: 'contacts',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers,
    };
  },

  hasSubscriptions: true,
  subscriptionPluginPath: require('path').resolve(
    __dirname,
    'graphql',
    'subscriptionPlugin.js',
  ),

  meta: {
    imports,
    segments,
    automations,
    forms,
    logs: { consumers: logs },
    tags,
    search,
    internalNotes,
    webhooks,
    dashboards,
    exporter,
    documents,
    // for fixing permissions
    permissions,
    notificationModules: NOTIFICATION_MODULES,
  },
  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.models = await generateModels(subdomain);
    context.subdomain = subdomain;
  },

  onServerInit: async (options) => {
    mainDb = options.db;

    app.get(
      '/file-export',
      routeErrorHandling(async (req: any, res) => {
        const { query } = req;
        const { segment } = query;
        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        const result = await buildFile(models, subdomain, query);

        res.attachment(`${result.name}.xlsx`);

        if (segment) {
          try {
            sendSegmentsMessage({
              subdomain,
              action: 'removeSegment',
              data: { segmentId: segment },
            });
          } catch (e) {
            console.log((e as Error).message);
          }
        }

        return res.send(result.response);
      }),
    );

    app.post(
      `/verifier/webhook`,
      routeErrorHandling(async (req, res) => {
        const { emails, phones, email, phone } = req.body;
        const subdomain = getSubdomain(req);
        const models = await generateModels(subdomain);

        if (email) {
          await updateContactValidationStatus(models, email);
        } else if (emails) {
          await updateContactsValidationStatus(models, 'email', emails);
        } else if (phone) {
          await updateContactValidationStatus(models, phone);
        } else if (phones) {
          await updateContactsValidationStatus(models, 'phone', phones);
        }

        return res.send('success');
      }),
    );

    app.get('/verify', async (req, res) => {
      const { p } = req.query;

      const data = JSON.parse(
        Buffer.from(p as string, 'base64').toString('utf8'),
      );

      const { email, customerId } = data;

      const subdomain = getSubdomain(req);
      const models = await generateModels(subdomain);

      const customer = await models.Customers.findOne({ _id: customerId });

      if (!customer) {
        return res.send('Can not find customer');
      }

      if (customer.primaryEmail !== email) {
        return res.send('Customer email does not match');
      }

      if (customer.emails?.findIndex((e) => e === email) === -1) {
        return res.send('Customer email does not match');
      }

      await models.Customers.updateOne(
        { _id: customerId },
        { $set: { primaryEmail: email, emailValidationStatus: 'valid' } },
      );

      return res.send('Successfully verified, you can close this tab now');
    });

    initBroker();

    debug = options.debug;
  },
};
