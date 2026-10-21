<template>
  <div class="home">
    <!-- 房间区域 -->
    <section>
      <h2>房间列表</h2>
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
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { reservationApi } from '@/api/reservations'
import { propertyApi } from '@/api/properties'
import { GROUPCONFIG } from '@/config/rooms.js'
import { getRecentWeekSeparated, checkDateRangeType, roundToTwoDecimals } from '@/utils/functions.js'

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
  console.log(`fetchReservations: startDate=${startDate}, endDate=${endDate}, offset=${offset}`, res)
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
    groupData.weekday_payment_average = groupData.weekday_days ?  roundToTwoDecimals(groupData.weekday_payment / groupData.weekday_days) : 0;
    groupData.weekday_rate_average = groupData.weekday_days ? roundToTwoDecimals(groupData.weekday_rate / groupData.weekday_days) : 0;
    groupData.weekend_rate_average = groupData.weekend_days ?  roundToTwoDecimals(groupData.weekend_rate / groupData.weekend_days) : 0;
    groupData.weekend_payment_average = groupData.weekend_days ?  roundToTwoDecimals(groupData.weekend_payment / groupData.weekend_days) : 0;

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
</style>