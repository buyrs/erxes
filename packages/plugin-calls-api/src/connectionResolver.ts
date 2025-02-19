import * as mongoose from 'mongoose';

import { IContext as IMainContext } from '@erxes/api-utils/src/types';
import { createGenerateModels } from '@erxes/api-utils/src/core';
import { IIntegrationModel, loadIntegrationClass } from './models/Integrations';
import { IIntegrationDocument } from './models/definitions/integrations';
import { IConversationDocument } from './models/definitions/conversations';
import { ICustomerModel, loadCustomerClass } from './models/Customers';
import {
  IConversationModel,
  loadConversationClass
} from './models/Conversations';

import { ICustomerDocument } from './models/definitions/customers';
import {
  IActiveSessionDocument,
  IActiveSessions
} from './models/definitions/activeSessions';
import {
  IActiveSessionModel,
  loadActiveSessionClass
} from './models/ActiveSessions';

export interface IModels {
  Integrations: IIntegrationModel;
  Conversations: IConversationModel;
  Customers: ICustomerModel;
  ActiveSessions: IActiveSessionModel;
}

export interface IContext extends IMainContext {
  subdomain: string;
  models: IModels;
}

export let models: IModels | null = null;

export const loadClasses = (db: mongoose.Connection): IModels => {
  models = {} as IModels;

  models.Integrations = db.model<IIntegrationDocument, IIntegrationModel>(
    'calls_integrations',
    loadIntegrationClass(models)
  );

  models.Conversations = db.model<IConversationDocument, IConversationModel>(
    'calls_conversations',
    loadConversationClass(models)
  );

  models.Customers = db.model<ICustomerDocument, ICustomerModel>(
    'calls_customers',
    loadCustomerClass(models)
  );
  models.ActiveSessions = db.model<IActiveSessionDocument, IActiveSessionModel>(
    'calls_active_sessions',
    loadActiveSessionClass(models)
  );

  return models;
};

export const generateModels = createGenerateModels<IModels>(
  models,
  loadClasses
);
