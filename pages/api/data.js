import moment from "moment-timezone";

const SOURCE_URL =
  "https://am4-helper.web.app/assets/resource-prices.json";

const TIMEZONE = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    // =========================================================
    // 取得遠端資料
    // =========================================================

    const response = await fetch(SOURCE_URL);

    if (!response.ok) {
      throw new Error(
        `無法取得 resource-prices.json，HTTP ${response.status}`
      );
    }

    const data = await response.json();

    // =========================================================
    // 台灣目前時間 GMT+8
    // =========================================================

    const now = moment().tz(TIMEZONE);

    // =========================================================
    // 將 JSON 所有資料：
    //
    // GMT+0
    // ↓
    // GMT+8
    //
    // 並建立完整日期時間
    // =========================================================

    const allData = [];

    // 取得目前台灣時間的年月
    const currentYear = now.year();
    const currentMonth = now.month();

    for (const [day, dataset] of Object.entries(data)) {
      if (!Array.isArray(dataset)) {
        continue;
      }

      const sourceDay = Number(day);

      if (!Number.isInteger(sourceDay)) {
        continue;
      }

      for (const item of dataset) {
        if (!item.time) {
          continue;
        }

        /*
         * JSON 裡面的時間：
         *
         * 00:00:00.000Z
         * 00:30:00.000Z
         * 01:00:00.000Z
         *
         * 這裡明確當成 GMT+0。
         */

        const utcDateTime = moment.utc(
          `${currentYear}-${String(currentMonth + 1).padStart(
            2,
            "0"
          )}-${String(sourceDay).padStart(2, "0")} ${item.time}`,
          "YYYY-MM-DD HH:mm:ss.SSS[Z]"
        );

        if (!utcDateTime.isValid()) {
          continue;
        }

        // GMT+0 → GMT+8
        const taipeiDateTime = utcDateTime.clone().tz(TIMEZONE);

        allData.push({
          fuel: Number(item.fuel),
          co2: Number(item.co2),

          // 原始 GMT+0 時間
          utcTime: utcDateTime.format("YYYY/MM/DD HH:mm:ss"),

          // 網站顯示的 GMT+8 時間
          time: taipeiDateTime.format("HH:mm"),

          // GMT+8 日期
          date: taipeiDateTime.format("YYYY-MM-DD"),

          // 顯示用日期
          displayDate: taipeiDateTime.format("YYYY/MM/DD"),

          // 用 timestamp 做時間排序
          timestamp: taipeiDateTime.valueOf(),
        });
      }
    }

    // =========================================================
    // 排序
    // =========================================================

    allData.sort((a, b) => a.timestamp - b.timestamp);

    // =========================================================
    // 目前價格時間
    //
    // 例如：
    //
    // 14:00:01 ~ 14:29:59
    // → 使用 14:00
    //
    // 14:30:00 ~ 14:59:59
    // → 使用 14:30
    //
    // 這樣時間到半小時就會切換價格
    // =========================================================

    const currentSlot = now
      .clone()
      .seconds(0)
      .milliseconds(0);

    if (now.minutes() >= 30) {
      currentSlot.minutes(30);
    } else {
      currentSlot.minutes(0);
    }

    const currentSlotTimestamp = currentSlot.valueOf();

    // =========================================================
    // 只保留「現在這個時間」以及未來資料
    //
    // 不顯示已經過去的時間
    // =========================================================

    const futureData = allData.filter(
      (item) => item.timestamp >= currentSlotTimestamp
    );

    // =========================================================
    // 依照 GMT+8 日期分組
    // =========================================================

    const groupedData = {};

    for (const item of futureData) {
      if (!groupedData[item.date]) {
        groupedData[item.date] = [];
      }

      groupedData[item.date].push(item);
    }

    // =========================================================
    // 建立日期列表
    // =========================================================

    const dates = Object.keys(groupedData).sort();

    // =========================================================
    // 標記今天
    // =========================================================

    const todayDate = now.format("YYYY-MM-DD");

    const days = dates.map((date) => {
      return {
        date,
        displayDate: moment(date, "YYYY-MM-DD").format(
          "YYYY/MM/DD"
        ),
        isToday: date === todayDate,
        data: groupedData[date],
      };
    });

    // =========================================================
    // 找目前時間的資料
    // =========================================================

    const currentData =
      allData.find(
        (item) => item.timestamp === currentSlotTimestamp
      ) || null;

    // =========================================================
    // 回傳
    // =========================================================

    return res.status(200).json({
      timezone: "GMT+8",

      taipeiTime: now.format("YYYY/MM/DD HH:mm:ss"),

      currentTime: currentSlot.format("HH:mm"),

      today: todayDate,

      currentData,

      days,
    });
  } catch (error) {
    console.error(
      "抓取 resource-prices.json 失敗:",
      error
    );

    return res.status(500).json({
      error: "抓取或轉換失敗",
      details:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}