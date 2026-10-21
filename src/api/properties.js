// api/properties.js
import { client } from './client.js';

export const propertyApi = {
  /**
   * 获取房源列表
   * @param {Object} params
   * @param {number} params.offset - 偏移量，默认 0
   * @param {number} params.limit - 每页数量，默认 100
   */
  getProperties(params = {}) {
    return client.get('/properties', {
      params: {
        offset: params.offset ?? 0,
        limit: params.limit ?? 100,
      },
    });
  },

  /**
   * 获取单个房源详情
   * @param {string|number} id - 房源 ID
   */
  getById(id) {
    return client.get(`/properties/${id}`);
  },

  /**
   * 分页获取全部房源
   */
  async getAllProperties() {
    const all = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, total } = await this.getProperties({ offset, limit });
      all.push(...data);
      if (all.length >= total) break;
      offset += limit;
    }

    return all;
  },
};
