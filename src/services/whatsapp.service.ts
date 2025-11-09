import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/env';
import { logInfo, logError, logDebug } from '../utils/logger';
import {
  TextMessage,
  InteractiveListMessage,
  InteractiveButtonMessage,
  WhatsAppApiResponse,
  WhatsAppError as WhatsAppApiError,
} from '../types/whatsapp.types';

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public code?: number,
    public type?: string,
    public fbtraceId?: string
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class WhatsAppClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logDebug('WhatsApp API Request', {
        url: config.url,
        method: config.method,
        data: config.data,
      });
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logDebug('WhatsApp API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.handleAxiosError(error);
        throw error;
      }
    );
  }

  private handleAxiosError(error: AxiosError<WhatsAppApiError>): void {
    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      logError('WhatsApp API Error', {
        message: whatsappError.message,
        type: whatsappError.type,
        code: whatsappError.code,
        fbtrace_id: whatsappError.fbtrace_id,
      });
    } else {
      logError('WhatsApp API Request Failed', {
        message: error.message,
        code: error.code,
      });
    }
  }

  /**
   * Send a text message to a WhatsApp number
   */
  async sendTextMessage(to: string, body: string): Promise<string> {
    try {
      const payload: TextMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body },
      };

      logInfo('Sending text message', { to, bodyLength: body.length });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('Text message sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }

  /**
   * Send interactive list message with blood pressure options
   */
  async sendInteractiveMenu(to: string): Promise<string> {
    try {
      const payload: InteractiveListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: '❗️ Выберите диапазон артериального давления:',
          },
          action: {
            button: 'Выбрать диапазон',
            sections: [
              {
                title: 'Давление',
                rows: [
                  { id: 'bp_lt115', title: '<115' },
                  { id: 'bp_120', title: '120' },
                  { id: 'bp_125', title: '125' },
                  { id: 'bp_130', title: '130' },
                  { id: 'bp_135', title: '135' },
                  { id: 'bp_140', title: '140' },
                  { id: 'bp_145', title: '145' },
                  { id: 'bp_150', title: '150' },
                  { id: 'bp_155', title: '155' },
                  { id: 'bp_gt160', title: '>160' },
                ],
              },
            ],
          },
        },
      };

      logInfo('Sending interactive menu', { to });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('Interactive menu sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }

  /**
   * Send range selection buttons (Step 1: Low vs High)
   */
  async sendRangeSelectionButtons(to: string): Promise<string> {
    try {
      const payload: InteractiveButtonMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: '📊 Выберите диапазон артериального давления:',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'range_low',
                  title: '⬇️ Низкое (<115)',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'range_high',
                  title: '⬆️ Высокое (≥120)',
                },
              },
            ],
          },
        },
      };

      logInfo('Sending range selection buttons', { to });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('Range selection buttons sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }

  /**
   * Send low range blood pressure list (<80 to 115)
   */
  async sendLowRangeList(to: string): Promise<string> {
    try {
      const payload: InteractiveListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: '⬇️ Выберите точное значение (низкое/нормальное):',
          },
          action: {
            button: 'Выбрать значение',
            sections: [
              {
                title: 'Низкое',
                rows: [
                  { id: 'bp_lt80', title: '<80' },
                  { id: 'bp_85', title: '85' },
                  { id: 'bp_90', title: '90' },
                  { id: 'bp_95', title: '95' },
                  { id: 'bp_100', title: '100' },
                  { id: 'bp_105', title: '105' },
                  { id: 'bp_110', title: '110' },
                  { id: 'bp_115', title: '115' },
                ],
              },
            ],
          },
        },
      };

      logInfo('Sending low range BP list', { to });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('Low range BP list sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }

  /**
   * Send high range blood pressure list (120 to >145)
   */
  async sendHighRangeList(to: string): Promise<string> {
    try {
      const payload: InteractiveListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: '⬆️ Выберите точное значение (повышенное/высокое):',
          },
          action: {
            button: 'Выбрать значение',
            sections: [
              {
                title: 'Высокое',
                rows: [
                  { id: 'bp_120', title: '120' },
                  { id: 'bp_125', title: '125' },
                  { id: 'bp_130', title: '130' },
                  { id: 'bp_135', title: '135' },
                  { id: 'bp_140', title: '140' },
                  { id: 'bp_145', title: '145' },
                  { id: 'bp_gt145', title: '>145' },
                ],
              },
            ],
          },
        },
      };

      logInfo('Sending high range BP list', { to });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('High range BP list sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }

  /**
   * Send blood pressure notification to kids
   */
  async sendBloodPressureNotification(to: string, value: string): Promise<string> {
    // Add exclamation mark for critical high blood pressure
    const emoji = value === '>145' || value === '>160' ? '❗️' : '✅';
    const message = `${emoji} Артериальное давление: ${value}`;

    return this.sendTextMessage(to, message);
  }

  /**
   * Send confirmation message to senior
   */
  async sendConfirmation(to: string, value: string): Promise<string> {
    const message = `✅ Получено: ${value}. Отправлено детям.`;
    return this.sendTextMessage(to, message);
  }

  /**
   * Send error message to user
   */
  async sendErrorMessage(to: string): Promise<string> {
    const message = '❌ Извините, доставка не удалась. Попробуйте еще раз или обратитесь в поддержку.';
    return this.sendTextMessage(to, message);
  }

  /**
   * Send subscription prompt to kids with interactive button
   */
  async sendSubscriptionPrompt(to: string): Promise<string> {
    try {
      const payload: InteractiveButtonMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: '✅ Продолжить получать уведомления о давлении?',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'subscribe_yes',
                  title: '✅ Да, продолжить',
                },
              },
            ],
          },
        },
      };

      logInfo('Sending subscription prompt', { to });

      const response = await this.client.post<WhatsAppApiResponse>('', payload);

      const messageId = response.data.messages[0].id;
      logInfo('Subscription prompt sent successfully', { to, messageId });

      return messageId;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const whatsappError = error.response.data.error;
        throw new WhatsAppError(
          whatsappError.message,
          whatsappError.code,
          whatsappError.type,
          whatsappError.fbtrace_id
        );
      }
      throw error;
    }
  }
}

// Export singleton instance
export const whatsappClient = new WhatsAppClient();
