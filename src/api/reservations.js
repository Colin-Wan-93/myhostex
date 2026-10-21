// api/reservations.js
import { client } from './client.js';

export const reservationApi = {
  /** 获取预订列表（通用） */
  getList(params) {
    return client.get('/reservations', {
      params: {
        status: params.status ?? 'accepted',
        start_check_in_date: params.startCheckInDate,
        end_check_in_date: params.endCheckInDate,
        order_by: params.orderBy ?? 'check_in_date',
        offset: params.offset,
        limit: params.limit ?? 100,
      },
    });
  },

  /** 获取已接受预订（快捷方法） */
  getAcceptedList(params) {
    return this.getList({ ...params, status: 'accepted' });
  },

  /** 获取单个预订详情 */
  getById(id) {
    return client.get(`/reservations/${id}`);
  },

  /** 创建预订 */
  create(data) {
    return client.post('/reservations', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** 更新预订 */
  update(id, data) {
    return client.put(`/reservations/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /** 删除预订 */
  delete(id) {
    return client.delete(`/reservations/${id}`);
  },
};
