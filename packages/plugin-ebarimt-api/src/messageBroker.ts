import { generateModels } from './connectionResolver';
import { sendMessage } from '@erxes/api-utils/src/core';
import type {
  MessageArgs,
  MessageArgsOmitService,
} from '@erxes/api-utils/src/core';

import { afterMutationHandlers } from './afterMutations';
import { beforeResolverHandlers } from './beforeResolvers';
import { getCompany, getConfig } from './utils';
import { getPostDataCommon } from './commonUtils';
import { PutData } from './models/utils';
import {
  consumeQueue,
  consumeRPCQueue,
} from '@erxes/api-utils/src/messageBroker';

export const initBroker = async () => {
  consumeQueue('ebarimt:afterMutation', async ({ subdomain, data }) => {
    const models = await generateModels(subdomain);

    await afterMutationHandlers(models, subdomain, data);

    return;
  });

  consumeRPCQueue('ebarimt:beforeResolver', async ({ subdomain, data }) => {
    return {
      data: await beforeResolverHandlers(subdomain, data),
      status: 'success',
    };
  });

  consumeRPCQueue(
    'ebarimt:putresponses.find',
    async ({ subdomain, data: { query, sort } }) => {
      const models = await generateModels(subdomain);

      return {
        status: 'success',
        data: await models.PutResponses.find(query)
          .sort(sort || {})
          .lean(),
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.putData',
    async ({
      subdomain,
      data: { contentType, contentId, productsById, orderInfo, config },
    }) => {
      const models = await generateModels(subdomain);
      // orderInfo = {
      //   number: string /unique in day/,
      //   date:
      //     date.toISOString().split('T')[0] +
      //     ' ' +
      //     date.toTimeString().split(' ')[0],
      //   orderId: =contentId,
      //   hasVat: boolean,
      //   hasCitytax: boolean,
      //   billType: 1 | 3,
      //   customerCode: string [7],
      //   customerName: string,
      //   description: string,
      //   details: [{
      //     productId: string
      //     amount: number,
      //     count: number,
      //     inventoryCode: string,
      //     discount?: number
      //   }],
      //   cashAmount: number,
      //   nonCashAmount: number
      // };

      // config = {
      //   districtName: string,
      //   vatPercent?: number,
      //   cityTaxPercent?: number
      //   defaultGSCode?: string *
      //   companyRD: string
      // }

      return {
        status: 'success',
        data: await models.PutResponses.putData(
          {
            ...orderInfo,
            productsById,
            contentType,
            contentId,
          },
          { ...(await getConfig(subdomain, 'EBARIMT', {})), ...config },
        ),
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.putDatas',
    async ({
      subdomain,
      data: { contentType, contentId, orderInfo, config },
    }) => {
      const models = await generateModels(subdomain);
      // orderInfo = {
      //   number: string /unique in day/,
      //   date:
      //     date.toISOString().split('T')[0] +
      //     ' ' +
      //     date.toTimeString().split(' ')[0],
      //   orderId: =contentId,
      //   billType: '1' | '3',
      //   customerCode?: string [7],
      //   customerName?: string,
      //   description: string,
      //   details: [{
      //     productId: string
      //     amount: number,
      //     count: number,
      //     discount?: number
      //   }],
      //   cashAmount: number,
      //   nonCashAmount: number
      // };

      // config = {
      //   districtName: string,
      //   hasVat: boolean;
      //   vatPercent?: number,
      //   hasCitytax: boolean
      //   cityTaxPercent?: number
      //   defaultGSCode?: string *
      //   companyRD: string
      // }
      const mainConfig = {
        ...config,
        ...(await getConfig(subdomain, 'EBARIMT', {})),
      };

      const ebarimtDatas = await getPostDataCommon(
        subdomain,
        mainConfig,
        contentType,
        contentId,
        orderInfo,
      );
      const ebarimtResponses: any[] = [];

      for (const ebarimtData of ebarimtDatas) {
        let ebarimtResponse;

        if (config.skipPutData || ebarimtData.inner) {
          const putData = new PutData({
            ...mainConfig,
            ...ebarimtData,
            config,
            models,
          });
          ebarimtResponse = {
            _id: Math.random(),
            billId: 'Түр баримт',
            ...(await putData.generateTransactionInfo()),
            registerNo: mainConfig.companyRD || '',
          };
        } else {
          ebarimtResponse = await models.PutResponses.putData(
            ebarimtData,
            mainConfig,
          );
        }
        if (ebarimtResponse._id) {
          ebarimtResponses.push(ebarimtResponse);
        }
      }

      return {
        status: 'success',
        data: ebarimtResponses,
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.returnBill',
    async ({ subdomain, data: { contentType, contentId, number, config } }) => {
      const models = await generateModels(subdomain);
      const mainConfig = {
        ...(await getConfig(subdomain, 'EBARIMT', {})),
        ...config,
      };

      return {
        status: 'success',
        data: await models.PutResponses.returnBill(
          { contentType, contentId, number },
          mainConfig,
        ),
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.createOrUpdate',
    async ({ subdomain, data: { _id, doc } }) => {
      const models = await generateModels(subdomain);

      return {
        status: 'success',
        data: await models.PutResponses.updateOne(
          { _id },
          { $set: { ...doc } },
          { upsert: true },
        ),
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.putHistory',
    async ({ subdomain, data: { contentType, contentId, taxType } }) => {
      const models = await generateModels(subdomain);

      return {
        status: 'success',
        data: await models.PutResponses.putHistory({
          contentType,
          contentId,
          taxType,
        }),
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.putHistories',
    async ({ subdomain, data: { contentType, contentId } }) => {
      const models = await generateModels(subdomain);

      return {
        status: 'success',
        data: await models.PutResponses.putHistories({
          contentType,
          contentId,
        }),
      };
    },
  );

  consumeQueue(
    'ebarimt:putresponses.bulkWrite',
    async ({ subdomain, data: { bulkOps } }) => {
      const models = await generateModels(subdomain);

      await models.PutResponses.bulkWrite(bulkOps);

      return {
        status: 'success',
      };
    },
  );

  consumeRPCQueue(
    'ebarimt:putresponses.getCompany',
    async ({ subdomain, data: { companyRD } }) => {
      return {
        status: 'success',
        data: await getCompany(subdomain, companyRD),
      };
    },
  );
};

export const sendProductsMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'products',
    ...args,
  });
};

export const sendPosMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'pos',
    ...args,
  });
};

export const sendLoansMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'loans',
    ...args,
  });
};

export const sendContactsMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'contacts',
    ...args,
  });
};

export const sendCoreMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'core',
    ...args,
  });
};

export const sendCardsMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'cards',
    ...args,
  });
};

export const sendNotificationsMessage = async (
  args: MessageArgsOmitService,
): Promise<any> => {
  return sendMessage({
    serviceName: 'notifications',
    ...args,
  });
};

export const sendCommonMessage = async (args: MessageArgs): Promise<any> => {
  return sendMessage({
    ...args,
  });
};
