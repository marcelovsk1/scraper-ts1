declare module 'openai' {
  export class Configuration {
    constructor(config: { apiKey: string });
  }

  export class OpenAIApi {
    constructor(configuration: Configuration);
    createChatCompletion(params: {
      model: string;
      messages: { role: string; content: string }[];
      temperature?: number;
    }): Promise<{ data: { choices: { message: { content: string } }[] } }>;
  }
}
