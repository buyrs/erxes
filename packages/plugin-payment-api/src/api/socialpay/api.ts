import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { IModels } from '../../connectionResolver';
import { PAYMENTS, PAYMENT_STATUS } from '../constants';
import { IInvoiceDocument } from '../../models/definitions/invoices';
import { BaseAPI } from '../base';
import { ISocialPayInvoice } from '../types';

export const hmac256 = (key, message) => {
  const hash = crypto.createHmac('sha256', key).update(message);
  return hash.digest('hex');
};

export const socialpayCallbackHandler = async (models: IModels, data: any) => {
  const { resp_code, amount, checksum, invoice, terminal } = data;

  let status = PAYMENT_STATUS.PAID;

  if (resp_code !== '00') {
    status = PAYMENT_STATUS.PENDING;
  }

  const invoiceObj = await models.Invoices.getInvoice(
    {
      identifier: invoice,
    },
    true,
  );

  const payment = await models.Payments.getPayment(
    invoiceObj.selectedPaymentId,
  );

  try {
    const api = new SocialPayAPI(payment.config);
    const res = await api.checkInvoice({
      amount,
      checksum,
      invoice,
      terminal,
    });

    if (res !== PAYMENT_STATUS.PAID) {
      return invoiceObj;
    }

    await models.Invoices.updateOne(
      { _id: invoiceObj._id },
      { $set: { status, resolvedAt: new Date() } },
    );

    invoiceObj.status = status;

    return invoiceObj;
  } catch (e) {
    throw new Error(e.message);
  }
};

export interface ISocialPayParams {
  inStoreSPTerminal: string;
  inStoreSPKey: string;
}

export class SocialPayAPI extends BaseAPI {
  private inStoreSPTerminal: string;
  private inStoreSPKey: string;

  constructor(config: ISocialPayParams) {
    super(config);
    this.inStoreSPTerminal = config.inStoreSPTerminal;
    this.inStoreSPKey = config.inStoreSPKey;
    this.apiUrl = PAYMENTS.socialpay.apiUrl;
  }

  async createInvoice(invoice: IInvoiceDocument) {
    const amount = invoice.amount.toString();
    const path = PAYMENTS.socialpay.actions.invoiceQr;

    const data: ISocialPayInvoice = {
      amount,
      checksum: hmac256(
        this.inStoreSPKey,
        this.inStoreSPTerminal + invoice.identifier + amount,
      ),
      invoice: invoice.identifier,
      terminal: this.inStoreSPTerminal,
    };

    // TODO: add phone number back
    // if (invoice.phone) {
    //   data.phone = invoice.phone;
    //   path = PAYMENTS.socialpay.actions.invoicePhone;
    //   data.checksum = hmac256(
    //     this.inStoreSPKey,
    //     this.inStoreSPTerminal + invoice.identifier + amount + invoice.phone
    //   );
    // }

    try {
      const { header, body } = await this.request({
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      }).then((r) => r.json());

      if (header.code !== 200) {
        return { error: body.error.errorDesc };
      }

      if (body.response.status !== 'SUCCESS') {
        return { error: 'Error occured while creating invoice' };
      }

      const qrData = await QRCode.toDataURL(body.response.desc);

      return { qrData, deeplink: body.response.desc };
    } catch (e) {
      return { error: e.message };
    }
  }

  async cancelInvoice(invoice: IInvoiceDocument) {
    const amount = invoice.amount.toString();

    const data: ISocialPayInvoice = {
      amount,
      checksum: hmac256(
        this.inStoreSPKey,
        this.inStoreSPTerminal + invoice.identifier + amount,
      ),
      invoice: invoice.identifier,
      terminal: this.inStoreSPTerminal,
    };

    try {
      return await this.request({
        path: PAYMENTS.socialpay.actions.invoiceCancel,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      });
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async checkInvoice(data: any) {
    try {
      const { body } = await this.request({
        path: PAYMENTS.socialpay.actions.invoiceCheck,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      }).then((r) => r.json());

      if (body.response.resp_code !== '00') {
        throw new Error(body.response.resp_desc);
      }

      return PAYMENT_STATUS.PAID;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async manualCheck(invoice: IInvoiceDocument) {
    const amount = invoice.amount.toString();

    const data: ISocialPayInvoice = {
      amount,
      checksum: hmac256(
        this.inStoreSPKey,
        this.inStoreSPTerminal + invoice.identifier + amount,
      ),
      invoice: invoice.identifier,
      terminal: this.inStoreSPTerminal,
    };

    try {
      const { body } = await this.request({
        path: PAYMENTS.socialpay.actions.invoiceCheck,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      }).then((r) => r.json());

      if (body.error) {
        return body.error.errorDesc;
      }

      if (body.response.resp_code !== '00') {
        throw new Error(body.response.resp_desc);
      }

      return PAYMENT_STATUS.PAID;
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
