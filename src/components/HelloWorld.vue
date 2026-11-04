<template>
  <div class="home">
    <!-- 房间区域 -->
    <section>
      <div class="header">
        <h2>房间列表</h2>
        <el-button type="primary" :loading="exporting" :disabled="roomLoading || resLoading || tableData.length === 0"
          @click="exportImage">
          {{ exporting ? '导出中...' : '导出图片' }}
        </el-button>
      </div>
      <div ref="exportArea" class="export-area">
        <div v-if="roomLoading">房间加载中...</div>
        <div v-else-if="roomError" style="color: red">{{ roomError }}</div>
        <div v-else>
          <p>房间数：{{ roomsData.length }}</p>
        </div>
        <el-table :data="tableData" border stripe style="width: 100%; margin-top: 20px">
          <el-table-column prop="name" label="房源" width="100" />
          <el-table-column prop="weekday_base" label="平日基础" />
          <el-table-column prop="weekday_rate_average" label="平日房价" />
          <el-table-column prop="weekday_payment_average" label="平日实收" />
          <el-table-column prop="weekend_base" label="周末基础" />
          <el-table-column prop="weekend_rate_average" label="周末房价" />
          <el-table-column prop="weekend_payment_average" label="周末实收" />
        </el-table>
      </div>

      <!-- 移动端导出专用：纯 HTML 表格，离屏渲染，宽度由 CSS 固定，不依赖 JS 布局 -->
      <div v-if="showMobileExport" ref="mobileExportArea" class="mobile-export-area">
        <p class="export-title">房间数：{{ roomsData.length }}</p>
        <table class="export-table">
          <thead>
            <tr>
              <th>房源</th>
              <th>平日基础</th>
              <th>平日房价</th>
              <th>平日实收</th>
              <th>周末基础</th>
              <th>周末房价</th>
              <th>周末实收</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tableData" :key="index">
              <td>{{ row.name }}</td>
              <td>{{ row.weekday_base }}</td>
              <td>{{ row.weekday_rate_average }}</td>
              <td>{{ row.weekday_payment_average }}</td>
              <td>{{ row.weekend_base }}</td>
              <td>{{ row.weekend_rate_average }}</td>
              <td>{{ row.weekend_payment_average }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { reservationApi } from '@/api/reservations'
import { propertyApi } from '@/api/properties'
import { GROUPCONFIG } from '@/config/rooms.js'
import { getRecentWeekSeparated, checkDateRangeType, roundToTwoDecimals } from '@/utils/functions.js'
import { toPng } from 'html-to-image'

const tableData = ref([]);
// ===== 房间数据 =====
const rooms = ref([])
const roomsData = ref([])
const roomLoading = ref(false)
const roomError = ref(null)
const lastFetchTime = ref(null)

async function fetchRooms(force = false) {
  if (!force && roomsData.value.length > 0) {
    return roomsData.value
  }

  roomLoading.value = true
  roomError.value = null

  try {
    let index = 0
    let allRooms = []

    while (true) {
      const res = await propertyApi.getProperties({ offset: index })

      if (!res?.data?.properties || !Array.isArray(res.data.properties)) {
        roomError.value = '获取房间列表失败'
        break
      }

      allRooms.push(...res.data.properties)

      if (res.data.total < 100) {
        break
      }

      index += 100
    }

    roomsData.value = allRooms
    lastFetchTime.value = Date.now()
    return roomsData.value
  } catch (e) {
    roomError.value = e?.message || '获取房间列表失败'
    return []
  } finally {
    roomLoading.value = false
  }
}


const exportArea = ref(null)
const exporting = ref(false)

// ===== 移动端导出专用 =====
const mobileExportArea = ref(null)
const showMobileExport = ref(false)

// 判断是否移动端（需要更精确时可改成 ua 检测）
const isMobile = () => window.innerWidth < 768

// ===== 预订数据 =====
const reservations = ref([])
const resLoading = ref(false)
const resError = ref(null)

const fetchReservations = async (startDate, endDate, offset) => {
  const res = await reservationApi.getList({
    startCheckInDate: startDate,
    endCheckInDate: endDate,
    offset,
  })
  return res.data
}

const loopFetchReservations = async (startDate, endDate) => {
  resLoading.value = true
  resError.value = null
  try {
    let index = 0
    let all = []
    while (true) {
      const res = await fetchReservations(startDate, endDate, index)
      if (!res?.reservations || !Array.isArray(res.reservations)) {
        resError.value = '获取预订列表失败'
        break
      }
      all.push(...res.reservations)
      if (res.reservations.length < 100) break
      index += 100
    }
    reservations.value = all
  } catch (e) {
    resError.value = e?.message || '获取预订列表失败'
  } finally {
    resLoading.value = false
  }
}

async function exportImage() {
  exporting.value = true
  try {
    let target = exportArea.value
    let options = {
      backgroundColor: '#ffffff',   // 避免透明背景
      pixelRatio: 2,                // 2 倍清晰度，文字不糊
      cacheBust: true,
    }

    if (isMobile()) {
      // 移动端：渲染离屏的固定宽度纯 HTML 表格
      showMobileExport.value = true
      await nextTick()
      target = mobileExportArea.value
      if (!target) return

      options = {
        ...options,
        width: 800,   // 截图画布固定宽度，与离屏容器一致
        // 关键：覆盖克隆节点的样式，把离屏偏移重置回画布原点
        style: {
          position: 'static',
          left: '0',
          top: '0',
          zIndex: 'auto',
        },
      }
    }

    if (!target) return

    const dataUrl = await toPng(target, options)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.download = `房源数据_${date}.png`
    link.href = dataUrl
    link.click()
  } catch (e) {
    console.error('导出图片失败:', e)
  } finally {
    exporting.value = false
    showMobileExport.value = false // 导出完销毁离屏表格，不影响页面
  }
}

// ===== 初始化 =====
onMounted(async () => {
  const result = getRecentWeekSeparated();

  await Promise.all([
    fetchRooms(),
    loopFetchReservations(result.all[0].date, result.all[result.all.length - 1].date),
  ])
  rooms.value = GROUPCONFIG.map((group) => {
    const groupRooms = group.rooms.map((room) => {
      return roomsData.value.find((r) => r.title === room.title)
    })
    return {
      ...group,
      rooms: groupRooms,
    }
  })

  tableData.value = rooms.value.map((group) => {
    const groupData = {
      weekday_rate: 0,
      weekday_rate_average: 0,
      weekday_payment: 0,
      weekday_payment_average: 0,
      weekday_days: 0,
      weekend_rate: 0,
      weekend_rate_average: 0,
      weekend_payment: 0,
      weekend_payment_average: 0,
      weekend_days: 0,
      isMixed: false,
      mixedIDs: [],
    }
    for (let i = 0; i < group.rooms.length; i++) {
      const room = group.rooms[i];

      for (let j = 0; j < reservations.value.length; j++) {
        const res = reservations.value[j];
        if (res.property_id === room.id) {
          const dateRangeType = checkDateRangeType(res.check_in_date, res.check_out_date);
          if (dateRangeType.isMixed) {
            groupData.isMixed = true;
            groupData.mixedIDs.push(res.channel_id);
          } else if (dateRangeType.hasWeekday) {
            groupData.weekday_rate += res.rates?.rate?.amount || 0;
            groupData.weekday_payment += res.payment?.received_amount || 0;
            groupData.weekday_days = groupData.weekday_days + dateRangeType.totalDays;
          } else if (dateRangeType.hasWeekend) {
            groupData.weekend_rate += res.rates?.rate?.amount || 0;
            groupData.weekend_payment += res.payment?.received_amount || 0;
            groupData.weekend_days = groupData.weekend_days + dateRangeType.totalDays;
          }
        }
      }

    }

    groupData.weekday_payment_average = groupData.weekday_days ? roundToTwoDecimals(groupData.weekday_payment / groupData.weekday_days) : 0;
    groupData.weekday_rate_average = groupData.weekday_days ? roundToTwoDecimals(groupData.weekday_rate / groupData.weekday_days) : 0;
    groupData.weekend_rate_average = groupData.weekend_days ? roundToTwoDecimals(groupData.weekend_rate / groupData.weekend_days) : 0;
    groupData.weekend_payment_average = groupData.weekend_days ? roundToTwoDecimals(groupData.weekend_payment / groupData.weekend_days) : 0;

    return {
      ...group,
      ...groupData
    }
  })
  console.log('tableData:', tableData.value)
  console.log('房间分组:', rooms.value)
  console.log('预订:', reservations.value)
})
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 10px;
}

section {
  margin-top: 30px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.export-area {
  background: #fff;
  padding: 16px;
}

/* ===== 移动端导出专用：离屏渲染 ===== */
.mobile-export-area {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 800px;
  /* 固定宽度，所有列完整铺开 */
  background: #fff;
  padding: 16px;
  z-index: -1;
}

.export-title {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}

/* 纯 HTML 表格：table-layout: fixed + 固定宽度，不依赖任何 JS 布局 */
.export-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
  color: #333;
}

.export-table th,
.export-table td {
  border: 1px solid #dcdfe6;
  padding: 8px 6px;
  text-align: left;
  word-break: break-all;
}

.export-table th {
  background: #f5f7fa;
  font-weight: 600;
}

/* 斑马纹，和 el-table 的 stripe 效果一致 */
.export-table tbody tr:nth-child(even) {
  background: #fafafa;
}
</style>
