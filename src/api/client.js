// api/client.js

const BASE_URL = '/v3';
const TOKEN = 'DHCvongrTc2jBz18gwyj1CmCbBQnD37uOC5lIJ2SbHeWDYrYobih2MDnVKD4F55b';

// 通用错误类
export class ApiError extends Error {
  constructor(status, statusText, data) {
    super(`API Error ${status}: ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.name = 'ApiError';
  }
}

class ApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL ?? BASE_URL;
    this.token = config.token ?? TOKEN;
    this.requestInterceptors = config.requestInterceptors ?? [];
    this.responseInterceptors = config.responseInterceptors ?? [];
  }

  async request(path, config = {}) {
    const { params, ...fetchConfig } = config;

    // 构建 URL
    const url = new URL(this.baseURL + path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, String(value));
      });
    }

    // 组装请求配置
    let finalConfig = {
      ...fetchConfig,
      headers: {
        accept: 'application/json',
        'Hostex-Access-Token': this.token,
        ...fetchConfig.headers,
      },
    };

    // 执行请求拦截器
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    let response = await fetch(url.toString(), finalConfig);

    // 执行响应拦截器
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    // 统一错误处理
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new ApiError(response.status, response.statusText, errorData);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined;
    }

    return response.json();
  }

  get(path, config) {
    return this.request(path, { ...config, method: 'GET' });
  }

  post(path, config) {
    return this.request(path, { ...config, method: 'POST' });
  }

  put(path, config) {
    return this.request(path, { ...config, method: 'PUT' });
  }

  delete(path, config) {
    return this.request(path, { ...config, method: 'DELETE' });
  }
}

// 默认实例
export const client = new ApiClient();

// 可创建多实例（不同 token/环境）
export const createClient = (config) => new ApiClient(config);
