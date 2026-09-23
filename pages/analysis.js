import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SETTINGS = {
  fuelLowLimit: 400,
  fuelMediumLimit: 600,
  co2LowLimit: 130,
  co2MediumLimit: 150,
};

const PRESETS = {
  保守: {
    fuelLowLimit: 350,
    fuelMediumLimit: 500,
    co2LowLimit: 120,
    co2MediumLimit: 140,
  },
  一般: {
    fuelLowLimit: 400,
    fuelMediumLimit: 600,
    co2LowLimit: 130,
    co2MediumLimit: 150,
  },
  便宜: {
    fuelLowLimit: 450,
    fuelMediumLimit: 550,
    co2LowLimit: 140,
    co2MediumLimit: 150,
  },
};

const FEATURES = [
  { id: "price", label: "💰 價格" },
  { id: "overview", label: "📊 資源分析" },
  { id: "trend", label: "📉 趨勢" },
  { id: "low", label: "🔎 低價" },
  { id: "update", label: "🕐 更新" },
];

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "─";
  }

  return number.toLocaleString("zh-TW");
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp)) {
    return NaN;
  }

  if (timestamp < 100000000000) {
    return timestamp * 1000;
  }

  return timestamp;
}

function formatDateTime(timestamp) {
  const normalized = normalizeTimestamp(timestamp);

  if (!Number.isFinite(normalized)) {
    return "─";
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "─";
  }

  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`;
}

function formatTime(timestamp) {
  const normalized = normalizeTimestamp(timestamp);

  if (!Number.isFinite(normalized)) {
    return "─";
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "─";
  }

  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return `${values.hour}:${values.minute}`;
}

function getTimeUntil(targetTimestamp, currentTimestamp) {
  const target = normalizeTimestamp(targetTimestamp);
  const current = normalizeTimestamp(currentTimestamp);

  if (!Number.isFinite(target) || !Number.isFinite(current)) {
    return "";
  }

  const diff = target - current;

  if (diff <= 0) {
    return "";
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}天${hours}小時${minutes}分後`;
  }

  if (hours > 0) {
    return `${hours}小時${minutes}分後`;
  }

  return `${minutes}分後`;
}

function getPriceStatus(value, lowLimit, mediumLimit) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "normal";
  }

  if (number <= Number(lowLimit)) {
    return "low";
  }

  if (number <= Number(mediumLimit)) {
    return "medium";
  }

  return "high";
}

function getStatusColor(status) {
  if (status === "low") {
    return "#8BF27C";
  }

  if (status === "medium") {
    return "#FFD166";
  }

  if (status === "high") {
    return "#EC5F55";
  }

  return "#FFFFFF";
}

function getFuelColor(value, settings) {
  return getStatusColor(
    getPriceStatus(
      value,
      settings.fuelLowLimit,
      settings.fuelMediumLimit
    )
  );
}

function getCo2Color(value, settings) {
  return getStatusColor(
    getPriceStatus(
      value,
      settings.co2LowLimit,
      settings.co2MediumLimit
    )
  );
}

function getStatusText(status) {
  if (status === "low") {
    return "低價";
  }

  if (status === "medium") {
    return "中價";
  }

  if (status === "high") {
    return "高價";
  }

  return "";
}

function getActivePreset(settings) {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (
      Number(settings.fuelLowLimit) ===
        Number(preset.fuelLowLimit) &&
      Number(settings.fuelMediumLimit) ===
        Number(preset.fuelMediumLimit) &&
      Number(settings.co2LowLimit) ===
        Number(preset.co2LowLimit) &&
      Number(settings.co2MediumLimit) ===
        Number(preset.co2MediumLimit)
    ) {
      return name;
    }
  }

  return null;
}

/*
 * 尋找目前這一列之後的下一個燃油低價時段。
 */
function findNextFuelLowPrice(
  items,
  currentIndex,
  fuelLowLimit
) {
  if (!Array.isArray(items) || currentIndex < 0) {
    return null;
  }

  for (
    let index = currentIndex + 1;
    index < items.length;
    index += 1
  ) {
    const item = items[index];

    if (
      Number(item?.fuel) <=
      Number(fuelLowLimit)
    ) {
      return item;
    }
  }

  return null;
}

/*
 * 尋找目前這一列之後的下一個 CO₂ 低價時段。
 */
function findNextCo2LowPrice(
  items,
  currentIndex,
  co2LowLimit
) {
  if (!Array.isArray(items) || currentIndex < 0) {
    return null;
  }

  for (
    let index = currentIndex + 1;
    index < items.length;
    index += 1
  ) {
    const item = items[index];

    if (
      Number(item?.co2) <=
      Number(co2LowLimit)
    ) {
      return item;
    }
  }

  return null;
}

/*
 * 尋找「目前時間之後」的下一個燃油低價。
 *
 * 用於頁面最上方的目前價格卡片。
 */
function findNextFuelLowPriceFromNow(
  items,
  nowTimestamp,
  fuelLowLimit
) {
  if (!Array.isArray(items)) {
    return null;
  }

  const now = normalizeTimestamp(nowTimestamp);

  if (!Number.isFinite(now)) {
    return null;
  }

  for (const item of items) {
    const timestamp = normalizeTimestamp(
      item?.timestamp
    );

    if (
      !Number.isFinite(timestamp) ||
      timestamp <= now
    ) {
      continue;
    }

    if (
      Number(item?.fuel) <=
      Number(fuelLowLimit)
    ) {
      return item;
    }
  }

  return null;
}

/*
 * 尋找「目前時間之後」的下一個 CO₂ 低價。
 */
function findNextCo2LowPriceFromNow(
  items,
  nowTimestamp,
  co2LowLimit
) {
  if (!Array.isArray(items)) {
    return null;
  }

  const now = normalizeTimestamp(nowTimestamp);

  if (!Number.isFinite(now)) {
    return null;
  }

  for (const item of items) {
    const timestamp = normalizeTimestamp(
      item?.timestamp
    );

    if (
      !Number.isFinite(timestamp) ||
      timestamp <= now
    ) {
      continue;
    }

    if (
      Number(item?.co2) <=
      Number(co2LowLimit)
    ) {
      return item;
    }
  }

  return null;
}

/*
 * 產生下次低價時間顯示資料。
 *
 * currentTimestamp：
 * - 目前列：使用現在時間
 * - 歷史 / 未來列：使用該列時間
 */
function getNextLowPriceText(
  nextItem,
  currentTimestamp,
  isLowPrice
) {
  if (!isLowPrice || !nextItem) {
    return null;
  }

  const targetTime = formatDateTime(
    nextItem.timestamp
  );

  if (targetTime === "─") {
    return null;
  }

  const elapsed = getTimeUntil(
    nextItem.timestamp,
    currentTimestamp
  );

  return {
    elapsed,
    time: targetTime,
  };
}

function PageShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #07121c 0%, #0b1722 45%, #071019 100%)",
        color: "#ffffff",
        paddingBottom: 40,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div
      style={{
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontSize: 24,
          lineHeight: 1.3,
          fontWeight: 800,
          color: "#ffffff",
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            marginTop: 7,
            fontSize: 15,
            lineHeight: 1.5,
            color: "#9eb1c0",
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

function CurrentPriceCard({
  currentItem,
  settings,
  nextFuelLow,
  nextCo2Low,
}) {
  if (!currentItem) {
    return null;
  }

  const fuelStatus = getPriceStatus(
    currentItem.fuel,
    settings.fuelLowLimit,
    settings.fuelMediumLimit
  );

  const co2Status = getPriceStatus(
    currentItem.co2,
    settings.co2LowLimit,
    settings.co2MediumLimit
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 14,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          background:
            "rgba(10, 25, 36, 0.88)",
          padding: 18,
        }}
      >
        <div
          style={{
            color: "#9eb1c0",
            fontSize: 15,
          }}
        >
          目前燃油價格
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 32,
            lineHeight: 1.2,
            fontWeight: 800,
            color: getFuelColor(
              currentItem.fuel,
              settings
            ),
          }}
        >
          {formatNumber(currentItem.fuel)}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 15,
            fontWeight: 700,
            color:
              getStatusColor(fuelStatus),
          }}
        >
          {getStatusText(fuelStatus)}
        </div>

        {nextFuelLow && (
          <div
            style={{
              marginTop: 11,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#aabcc9",
            }}
          >
            下一低價：
            {formatDateTime(
              nextFuelLow.timestamp
            )}
          </div>
        )}
      </div>

      <div
        style={{
          border:
            "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          background:
            "rgba(10, 25, 36, 0.88)",
          padding: 18,
        }}
      >
        <div
          style={{
            color: "#9eb1c0",
            fontSize: 15,
          }}
        >
          目前 CO₂ 價格
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 32,
            lineHeight: 1.2,
            fontWeight: 800,
            color: getCo2Color(
              currentItem.co2,
              settings
            ),
          }}
        >
          {formatNumber(currentItem.co2)}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 15,
            fontWeight: 700,
            color:
              getStatusColor(co2Status),
          }}
        >
          {getStatusText(co2Status)}
        </div>

        {nextCo2Low && (
          <div
            style={{
              marginTop: 11,
              fontSize: 14,
              lineHeight: 1.5,
              color: "#aabcc9",
            }}
          >
            下一低價：
            {formatDateTime(
              nextCo2Low.timestamp
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PriceContent({
  days,
  allItems,
  currentItemIndex,
  nowTimestamp,
  settings,
}) {
  const [openDates, setOpenDates] = useState({});

  useEffect(() => {
    if (!Array.isArray(days)) {
      return;
    }

    const initialOpenState = {};

    days.forEach((day) => {
      if (day?.date) {
        initialOpenState[day.date] =
          Boolean(day.isToday);
      }
    });

    setOpenDates(initialOpenState);
  }, [days]);

  const toggleDate = (date) => {
    setOpenDates((previous) => ({
      ...previous,
      [date]: !previous[date],
    }));
  };

  if (
    !Array.isArray(days) ||
    days.length === 0
  ) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "#8fa6b8",
          fontSize: 16,
        }}
      >
        目前沒有價格資料
      </div>
    );
  }

  return (
    <div>
      {days.map((day) => {
        const dayData = Array.isArray(
          day?.data
        )
          ? day.data
          : [];

        if (dayData.length === 0) {
          return null;
        }

        const isOpen = Boolean(
          openDates[day.date]
        );

        return (
          <div
            key={
              day.date ||
              day.displayDate
            }
            style={{
              marginBottom: 16,
              borderRadius: 14,
              overflow: "hidden",
              border:
                "1px solid rgba(255,255,255,0.08)",
              background:
                "rgba(8, 21, 31, 0.9)",
            }}
          >
            <button
              type="button"
              onClick={() =>
                toggleDate(day.date)
              }
              style={{
                width: "100%",
                border: "none",
                background:
                  "transparent",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding: "17px 18px",
                textAlign: "left",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 19,
                    lineHeight: 1.4,
                    fontWeight: 700,
                  }}
                >
                  {day.displayDate ||
                    day.date}

                  {day.isToday && (
                    <span
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        marginLeft: 9,
                        padding:
                          "4px 9px",
                        borderRadius: 999,
                        background:
                          "rgba(123, 199, 249, 0.14)",
                        color: "#7BC7F9",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      今天
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  color: "#9eb1c0",
                  fontSize: 18,
                  transform: isOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition:
                    "transform 0.2s ease",
                }}
              >
                ▼
              </div>
            </button>

            {isOpen && (
              <div
                style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling:
                    "touch",
                  borderTop:
                    "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: 760,
                    borderCollapse:
                      "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col
                      style={{
                        width: "18%",
                      }}
                    />
                    <col
                      style={{
                        width: "18%",
                      }}
                    />
                    <col
                      style={{
                        width: "18%",
                      }}
                    />
                    <col
                      style={{
                        width: "23%",
                      }}
                    />
                    <col
                      style={{
                        width: "23%",
                      }}
                    />
                  </colgroup>

                  <thead>
                    <tr
                      style={{
                        background:
                          "rgba(255,255,255,0.035)",
                      }}
                    >
                      <th
                        style={{
                          padding:
                            "15px 9px",
                          color:
                            "#9eb1c0",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        時間
                      </th>

                      <th
                        style={{
                          padding:
                            "15px 9px",
                          color:
                            "#9eb1c0",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        燃油價格
                      </th>

                      <th
                        style={{
                          padding:
                            "15px 9px",
                          color:
                            "#9eb1c0",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        CO₂價格
                      </th>

                      <th
                        style={{
                          padding:
                            "15px 9px",
                          color:
                            "#9eb1c0",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        燃油下次低價時間
                      </th>

                      <th
                        style={{
                          padding:
                            "15px 9px",
                          color:
                            "#9eb1c0",
                          fontSize: 15,
                          fontWeight: 700,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        CO₂下次低價時間
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {dayData.map(
                      (
                        item,
                        itemIndex
                      ) => {
                        /*
                         * 重要修正：
                         *
                         * 不能使用：
                         * allItems.indexOf(item)
                         *
                         * 因為 allItems 裡面的 item
                         * 是重新建立過的物件。
                         *
                         * 改用 timestamp + 日期
                         * 找到 allItems 中對應的資料。
                         */
                        const itemTimestamp =
                          normalizeTimestamp(
                            item?.timestamp
                          );

                        const globalIndex =
                          allItems.findIndex(
                            (
                              candidate
                            ) =>
                              Number(
                                candidate?.timestamp
                              ) ===
                                Number(
                                  itemTimestamp
                                ) &&
                              String(
                                candidate?.dayDate ??
                                  ""
                              ) ===
                                String(
                                  day?.date ??
                                    ""
                                )
                          );

                        const isCurrent =
                          globalIndex >=
                            0 &&
                          globalIndex ===
                            currentItemIndex;

                        const isFuelLow =
                          Number(
                            item.fuel
                          ) <=
                          Number(
                            settings.fuelLowLimit
                          );

                        const isCo2Low =
                          Number(
                            item.co2
                          ) <=
                          Number(
                            settings.co2LowLimit
                          );

                        /*
                         * 只有這一列本身是低價，
                         * 才尋找下一個低價時段。
                         */
                        const nextFuelLow =
                         (isCurrent || isFuelLow) &&
                         globalIndex >= 0
                            ? findNextFuelLowPrice(
                                allItems,
                                globalIndex,
                                settings.fuelLowLimit
                            )
                            : null;

                         const nextCo2Low =
                          (isCurrent || isCo2Low) &&
                          globalIndex >= 0
                            ? findNextCo2LowPrice(
                                allItems,
                                globalIndex,
                                settings.co2LowLimit
                            )
                            : null;

                        /*
                         * 目前列：
                         * 使用現在時間計算「幾分鐘後」。
                         *
                         * 其他低價列：
                         * 使用該列自己的時間計算。
                         */
                        const referenceTimestamp =
                          isCurrent
                            ? nowTimestamp
                            : itemTimestamp;

                        const fuelNextText =
                            getNextLowPriceText(
                                nextFuelLow,
                                referenceTimestamp,
                                isCurrent || isFuelLow
                            );

                            const co2NextText =
                            getNextLowPriceText(
                                nextCo2Low,
                                referenceTimestamp,
                                isCurrent || isCo2Low
                            );

                        const fuelStatus =
                          getPriceStatus(
                            item.fuel,
                            settings.fuelLowLimit,
                            settings.fuelMediumLimit
                          );

                        const co2Status =
                          getPriceStatus(
                            item.co2,
                            settings.co2LowLimit,
                            settings.co2MediumLimit
                          );

                        return (
                          <tr
                            key={`${day.date}-${item.timestamp}-${itemIndex}`}
                            style={{
                              background:
                                isCurrent
                                  ? "rgba(123, 199, 249, 0.08)"
                                  : "transparent",
                              boxShadow:
                                isCurrent
                                  ? "inset 0 0 0 1px rgba(123, 199, 249, 0.65)"
                                  : "none",
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "15px 9px",
                                textAlign:
                                  "center",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  flexDirection:
                                    "column",
                                  alignItems:
                                    "center",
                                  gap: 5,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize:
                                      isCurrent
                                        ? 22
                                        : 19,
                                    fontWeight:
                                      isCurrent
                                        ? 800
                                        : 600,
                                    lineHeight:
                                      1.2,
                                    color:
                                      isCurrent
                                        ? "#7BC7F9"
                                        : "#d9e4eb",
                                  }}
                                >
                                  {formatTime(
                                    item.timestamp
                                  )}
                                </span>

                                {isCurrent && (
                                  <span
                                    style={{
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      padding:
                                        "3px 9px",
                                      borderRadius:
                                        999,
                                      background:
                                        "#7BC7F9",
                                      color:
                                        "#06111a",
                                      fontSize: 12,
                                      fontWeight:
                                        800,
                                      lineHeight:
                                        1.3,
                                    }}
                                  >
                                    現在
                                  </span>
                                )}
                              </div>
                            </td>

                            <td
                              style={{
                                padding:
                                  "15px 9px",
                                textAlign:
                                  "center",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    isCurrent
                                      ? 23
                                      : 20,
                                  lineHeight:
                                    1.2,
                                  fontWeight:
                                    800,
                                  color:
                                    getFuelColor(
                                      item.fuel,
                                      settings
                                    ),
                                }}
                              >
                                {formatNumber(
                                  item.fuel
                                )}
                              </div>

                              {isFuelLow && (
                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color:
                                      "#8BF27C",
                                  }}
                                >
                                  低價
                                </div>
                              )}

                              {fuelStatus ===
                                "medium" && (
                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color:
                                      "#FFD166",
                                  }}
                                >
                                  中價
                                </div>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "15px 9px",
                                textAlign:
                                  "center",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    isCurrent
                                      ? 23
                                      : 20,
                                  lineHeight:
                                    1.2,
                                  fontWeight:
                                    800,
                                  color:
                                    getCo2Color(
                                      item.co2,
                                      settings
                                    ),
                                }}
                              >
                                {formatNumber(
                                  item.co2
                                )}
                              </div>

                              {isCo2Low && (
                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color:
                                      "#8BF27C",
                                  }}
                                >
                                  低價
                                </div>
                              )}

                              {co2Status ===
                                "medium" && (
                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color:
                                      "#FFD166",
                                  }}
                                >
                                  中價
                                </div>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 8px",
                                textAlign:
                                  "center",
                                verticalAlign:
                                  "middle",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                              }}
                            >
                              {fuelNextText ? (
                                <div
                                  style={{
                                    width:
                                      "100%",
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    textAlign:
                                      "center",
                                    gap: 3,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize:
                                        isCurrent
                                          ? 17
                                          : 16,
                                      lineHeight:
                                        1.4,
                                      fontWeight:
                                        800,
                                      color:
                                        "#8BF27C",
                                      textAlign:
                                        "center",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {fuelNextText.elapsed ||
                                      "下次低價"}
                                  </div>

                                  <div
                                    style={{
                                      fontSize:
                                        isCurrent
                                          ? 16
                                          : 15,
                                      lineHeight:
                                        1.4,
                                      fontWeight:
                                        700,
                                      color:
                                        "#d9e4eb",
                                      textAlign:
                                        "center",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    （
                                    {
                                      fuelNextText.time
                                    }
                                    ）
                                  </div>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    display:
                                      "block",
                                    width:
                                      "100%",
                                    textAlign:
                                      "center",
                                    fontSize: 19,
                                    color:
                                      "#637786",
                                  }}
                                >
                                  ─
                                </span>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 8px",
                                textAlign:
                                  "center",
                                verticalAlign:
                                  "middle",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.055)",
                              }}
                            >
                              {co2NextText ? (
                                <div
                                  style={{
                                    width:
                                      "100%",
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    textAlign:
                                      "center",
                                    gap: 3,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize:
                                        isCurrent
                                          ? 17
                                          : 16,
                                      lineHeight:
                                        1.4,
                                      fontWeight:
                                        800,
                                      color:
                                        "#8BF27C",
                                      textAlign:
                                        "center",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {co2NextText.elapsed ||
                                      "下次低價"}
                                  </div>

                                  <div
                                    style={{
                                      fontSize:
                                        isCurrent
                                          ? 16
                                          : 15,
                                      lineHeight:
                                        1.4,
                                      fontWeight:
                                        700,
                                      color:
                                        "#d9e4eb",
                                      textAlign:
                                        "center",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    （
                                    {
                                      co2NextText.time
                                    }
                                    ）
                                  </div>
                                </div>
                              ) : (
                                <span
                                  style={{
                                    display:
                                      "block",
                                    width:
                                      "100%",
                                    textAlign:
                                      "center",
                                    fontSize: 19,
                                    color:
                                      "#637786",
                                  }}
                                >
                                  ─
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceChart({
  items,
  settings,
}) {
  const visibleItems =
    items.slice(0, 48);

  if (visibleItems.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "#8fa6b8",
          fontSize: 16,
        }}
      >
        沒有可用資料
      </div>
    );
  }

  const fuelValues =
    visibleItems.map(
      (item) =>
        Number(item.fuel) || 0
    );

  const co2Values =
    visibleItems.map(
      (item) =>
        Number(item.co2) || 0
    );

  const maxFuel = Math.max(
    ...fuelValues,
    settings.fuelMediumLimit
  );

  const maxCo2 = Math.max(
    ...co2Values,
    settings.co2MediumLimit
  );

  return (
    <div
      style={{
        overflowX: "auto",
        paddingBottom: 6,
      }}
    >
      <div
        style={{
          minWidth: Math.max(
            700,
            visibleItems.length * 50
          ),
          height: 280,
          display: "flex",
          alignItems: "flex-end",
          gap: 7,
          padding:
            "17px 10px 34px",
          borderRadius: 14,
          background:
            "rgba(8, 21, 31, 0.9)",
          border:
            "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {visibleItems.map(
          (item, index) => {
            const fuel =
              Number(item.fuel) ||
              0;

            const co2 =
              Number(item.co2) ||
              0;

            const fuelHeight =
              Math.max(
                5,
                (fuel / maxFuel) *
                  185
              );

            const co2Height =
              Math.max(
                5,
                (co2 / maxCo2) *
                  185
              );

            return (
              <div
                key={`${item.timestamp}-${index}`}
                style={{
                  flex: "0 0 38px",
                  height: "100%",
                  display: "flex",
                  alignItems:
                    "flex-end",
                  justifyContent:
                    "center",
                  gap: 3,
                }}
              >
                <div
                  title={`燃油 ${formatNumber(
                    fuel
                  )}`}
                  style={{
                    width: 15,
                    height:
                      fuelHeight,
                    borderRadius:
                      "4px 4px 0 0",
                    background:
                      getFuelColor(
                        fuel,
                        settings
                      ),
                    opacity: 0.8,
                  }}
                />

                <div
                  title={`CO₂ ${formatNumber(
                    co2
                  )}`}
                  style={{
                    width: 15,
                    height:
                      co2Height,
                    borderRadius:
                      "4px 4px 0 0",
                    background:
                      getCo2Color(
                        co2,
                        settings
                      ),
                    opacity: 0.8,
                  }}
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

function OverviewContent({
  currentItem,
  futureItems,
  settings,
}) {
  if (!currentItem) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "#8fa6b8",
          fontSize: 16,
        }}
      >
        目前沒有資料
      </div>
    );
  }

  const fuelStatus =
    getPriceStatus(
      currentItem.fuel,
      settings.fuelLowLimit,
      settings.fuelMediumLimit
    );

  const co2Status =
    getPriceStatus(
      currentItem.co2,
      settings.co2LowLimit,
      settings.co2MediumLimit
    );

  const fuelLowCount =
    futureItems.filter(
      (item) =>
        Number(item.fuel) <=
        Number(
          settings.fuelLowLimit
        )
    ).length;

  const co2LowCount =
    futureItems.filter(
      (item) =>
        Number(item.co2) <=
        Number(
          settings.co2LowLimit
        )
    ).length;

  const cards = [
    {
      title: "目前燃油",
      value:
        formatNumber(
          currentItem.fuel
        ),
      color: getFuelColor(
        currentItem.fuel,
        settings
      ),
      status:
        getStatusText(
          fuelStatus
        ),
    },
    {
      title: "目前 CO₂",
      value:
        formatNumber(
          currentItem.co2
        ),
      color: getCo2Color(
        currentItem.co2,
        settings
      ),
      status:
        getStatusText(
          co2Status
        ),
    },
    {
      title: "未來燃油低價",
      value: `${fuelLowCount}`,
      color: "#8BF27C",
      status: "個時段",
    },
    {
      title: "未來 CO₂ 低價",
      value: `${co2LowCount}`,
      color: "#8BF27C",
      status: "個時段",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.title}
          style={{
            borderRadius: 14,
            background:
              "rgba(8, 21, 31, 0.9)",
            border:
              "1px solid rgba(255,255,255,0.08)",
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#9eb1c0",
              fontSize: 15,
            }}
          >
            {card.title}
          </div>

          <div
            style={{
              marginTop: 8,
              color: card.color,
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              marginTop: 6,
              color: card.color,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {card.status}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendContent({
  items,
  settings,
}) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "#8fa6b8",
          fontSize: 16,
        }}
      >
        目前沒有趨勢資料
      </div>
    );
  }

  const fuelPrices =
    items.map((item) =>
      Number(item.fuel)
    );

  const co2Prices =
    items.map((item) =>
      Number(item.co2)
    );

  const validFuel =
    fuelPrices.filter(
      Number.isFinite
    );

  const validCo2 =
    co2Prices.filter(
      Number.isFinite
    );

  const fuelAverage =
    validFuel.length > 0
      ? validFuel.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / validFuel.length
      : 0;

  const co2Average =
    validCo2.length > 0
      ? validCo2.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / validCo2.length
      : 0;

  const lowestFuel =
    validFuel.length > 0
      ? Math.min(...validFuel)
      : 0;

  const lowestCo2 =
    validCo2.length > 0
      ? Math.min(...validCo2)
      : 0;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          background:
            "rgba(8, 21, 31, 0.9)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          padding: 19,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 15,
          }}
        >
          燃油趨勢
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              平均
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color:
                  getFuelColor(
                    fuelAverage,
                    settings
                  ),
              }}
            >
              {formatNumber(
                Math.round(
                  fuelAverage
                )
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              最低
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color: "#8BF27C",
              }}
            >
              {formatNumber(
                lowestFuel
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              低價門檻
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color: "#8BF27C",
              }}
            >
              {formatNumber(
                settings.fuelLowLimit
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 14,
          background:
            "rgba(8, 21, 31, 0.9)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          padding: 19,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 15,
          }}
        >
          CO₂ 趨勢
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              平均
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color:
                  getCo2Color(
                    co2Average,
                    settings
                  ),
              }}
            >
              {formatNumber(
                Math.round(
                  co2Average
                )
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              最低
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color: "#8BF27C",
              }}
            >
              {formatNumber(
                lowestCo2
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                color: "#9eb1c0",
                fontSize: 14,
              }}
            >
              低價門檻
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                color: "#8BF27C",
              }}
            >
              {formatNumber(
                settings.co2LowLimit
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LowPriceContent({
  items,
  settings,
}) {
  const fuelLowItems =
    items.filter(
      (item) =>
        Number(item.fuel) <=
        Number(
          settings.fuelLowLimit
        )
    );

  const co2LowItems =
    items.filter(
      (item) =>
        Number(item.co2) <=
        Number(
          settings.co2LowLimit
        )
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          minWidth: 0,
          borderRadius: 14,
          background:
            "rgba(8, 21, 31, 0.9)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 14,
            color: "#ffffff",
          }}
        >
          ⛽ 燃油低價時段
        </div>

        {fuelLowItems.length ===
        0 ? (
          <div
            style={{
              color: "#8194a3",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            目前沒有低價時段
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            {fuelLowItems.map(
              (item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    padding:
                      "12px 10px",
                    borderRadius: 9,
                    background:
                      "rgba(139, 242, 124, 0.06)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      fontSize: 15,
                      lineHeight: 1.4,
                      color: "#d9e4eb",
                    }}
                  >
                    {formatDateTime(
                      item.timestamp
                    )}
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color:
                        "#8BF27C",
                    }}
                  >
                    {formatNumber(
                      item.fuel
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div
        style={{
          minWidth: 0,
          borderRadius: 14,
          background:
            "rgba(8, 21, 31, 0.9)",
          border:
            "1px solid rgba(255,255,255,0.08)",
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 14,
            color: "#ffffff",
          }}
        >
          🌱 CO₂ 低價時段
        </div>

        {co2LowItems.length ===
        0 ? (
          <div
            style={{
              color: "#8194a3",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            目前沒有低價時段
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            {co2LowItems.map(
              (item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap: 8,
                    padding:
                      "12px 10px",
                    borderRadius: 9,
                    background:
                      "rgba(139, 242, 124, 0.06)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      fontSize: 15,
                      lineHeight: 1.4,
                      color: "#d9e4eb",
                    }}
                  >
                    {formatDateTime(
                      item.timestamp
                    )}
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color:
                        "#8BF27C",
                    }}
                  >
                    {formatNumber(
                      item.co2
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PriceSettingInput({
  label,
  value,
  onChange,
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 7,
          color: "#9eb1c0",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          border:
            "1px solid rgba(255,255,255,0.12)",
          borderRadius: 9,
          background: "#0b1a26",
          color: "#ffffff",
          padding: "11px 12px",
          fontSize: 16,
          outline: "none",
        }}
      />
    </div>
  );
}

function SettingsContent({
  settings,
  setSettings,
}) {
  const activePreset =
    getActivePreset(settings);

  const updateSetting = (
    key,
    value
  ) => {
    const parsed = Number(value);

    setSettings((previous) => ({
      ...previous,
      [key]:
        Number.isFinite(parsed)
          ? parsed
          : 0,
    }));
  };

  return (
    <div
      style={{
        borderRadius: 14,
        background:
          "rgba(8, 21, 31, 0.9)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        padding: 18,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <PriceSettingInput
          label="燃油低價"
          value={
            settings.fuelLowLimit
          }
          onChange={(value) =>
            updateSetting(
              "fuelLowLimit",
              value
            )
          }
        />

        <PriceSettingInput
          label="燃油中價"
          value={
            settings.fuelMediumLimit
          }
          onChange={(value) =>
            updateSetting(
              "fuelMediumLimit",
              value
            )
          }
        />

        <PriceSettingInput
          label="CO₂低價"
          value={
            settings.co2LowLimit
          }
          onChange={(value) =>
            updateSetting(
              "co2LowLimit",
              value
            )
          }
        />

        <PriceSettingInput
          label="CO₂中價"
          value={
            settings.co2MediumLimit
          }
          onChange={(value) =>
            updateSetting(
              "co2MediumLimit",
              value
            )
          }
        />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 9,
        }}
      >
        {Object.entries(
          PRESETS
        ).map(
          ([name, preset]) => {
            const selected =
              activePreset ===
              name;

            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  setSettings({
                    ...preset,
                  })
                }
                style={{
                  border:
                    selected
                      ? "1px solid #7BC7F9"
                      : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9,
                  background:
                    selected
                      ? "rgba(123,199,249,0.12)"
                      : "rgba(255,255,255,0.03)",
                  color:
                    selected
                      ? "#7BC7F9"
                      : "#b9c9d4",
                  padding:
                    "9px 14px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {name}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}

function UpdateContent({
  timezone,
  currentTime,
  taipeiTime,
  onRefresh,
  loading,
  lastUpdated,
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        background:
          "rgba(8, 21, 31, 0.9)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              color: "#9eb1c0",
              fontSize: 14,
            }}
          >
            台北時間
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 24,
              fontWeight: 800,
              color: "#7BC7F9",
            }}
          >
            {taipeiTime || "─"}
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#9eb1c0",
              fontSize: 14,
            }}
          >
            資料時間
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 17,
              lineHeight: 1.5,
              color: "#d9e4eb",
            }}
          >
            {currentTime || "─"}
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#9eb1c0",
              fontSize: 14,
            }}
          >
            時區
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 17,
              color: "#d9e4eb",
            }}
          >
            {timezone || "GMT+8"}
          </div>
        </div>

        <div>
          
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            width: "100%",
            border:
              "1px solid rgba(123,199,249,0.4)",
            borderRadius: 10,
            background:
              "rgba(123,199,249,0.08)",
            color: "#7BC7F9",
            padding: "12px 14px",
            fontSize: 16,
            fontWeight: 700,
            cursor: loading
              ? "default"
              : "pointer",
            opacity: loading
              ? 0.6
              : 1,
          }}
        >
          {loading
            ? "更新中..."
            : "立即更新"}
        </button>

        <div
          style={{
            color: "#8194a3",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          價格資料每 30 分鐘更新一次。
          <br />
          時區：GMT+8。
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active
          ? "1px solid #7BC7F9"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 9,
        background: active
          ? "rgba(123,199,249,0.12)"
          : "rgba(255,255,255,0.03)",
        color: active
          ? "#7BC7F9"
          : "#9eb1c0",
        padding: "9px 14px",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function AnalysisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [now, setNow] =
    useState(null);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [settings, setSettings] =
    useState(DEFAULT_SETTINGS);

  const [
    selectedFeature,
    setSelectedFeature,
  ] = useState("price");

  const [
    analysisHours,
    setAnalysisHours,
  ] = useState(24);

  const refreshTimerRef =
    useRef(null);

  const clockTimerRef =
    useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/data",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `資料載入失敗：HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      setData(result);
    } catch (fetchError) {
      console.error(fetchError);

      setError(
        fetchError?.message ||
          "資料載入失敗"
      );
    } finally {
      setLoading(false);
    }
  };

  const scheduleNextRefresh =
    () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }

      const current =
        new Date();

      const next = new Date(
        current
      );

      if (
        current.getMinutes() <
        30
      ) {
        next.setMinutes(
          30,
          0,
          0
        );
      } else {
        next.setHours(
          current.getHours() + 1
        );

        next.setMinutes(
          0,
          0,
          0
        );
      }

      const delay =
        Math.max(
          1000,
          next.getTime() -
            current.getTime()
        ) + 1000;

      refreshTimerRef.current =
        window.setTimeout(
          () => {
            fetchData();
            scheduleNextRefresh();
          },
          delay
        );
    };

  useEffect(() => {
    setNow(Date.now());

    fetchData();
    scheduleNextRefresh();

    clockTimerRef.current =
      window.setInterval(() => {
        setNow(Date.now());
      }, 30000);

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          setNow(Date.now());
          fetchData();
          scheduleNextRefresh();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }

      if (
        clockTimerRef.current
      ) {
        window.clearInterval(
          clockTimerRef.current
        );
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  const days = useMemo(() => {
    if (
      !Array.isArray(
        data?.days
      )
    ) {
      return [];
    }

    return data.days;
  }, [data]);

  const allItems = useMemo(() => {
    const result = [];

    days.forEach((day) => {
      if (
        !Array.isArray(
          day?.data
        )
      ) {
        return;
      }

      day.data.forEach(
        (item) => {
          const timestamp =
            normalizeTimestamp(
              item?.timestamp
            );

          if (
            !Number.isFinite(
              timestamp
            )
          ) {
            return;
          }

          result.push({
            ...item,
            timestamp,
            dayDate: day.date,
            dayDisplayDate:
              day.displayDate,
            isToday: day.isToday,
          });
        }
      );
    });

    result.sort(
      (a, b) =>
        Number(a.timestamp) -
        Number(b.timestamp)
    );

    return result;
  }, [days]);

  /*
   * 目前時段判定：
   *
   * 例如：
   * 現在 18:40
   *
   * 18:30 <= 現在時間
   * 19:00 > 現在時間
   *
   * 所以目前時段就是 18:30。
   */
  const currentItemIndex =
    useMemo(() => {
      if (
        allItems.length === 0 ||
        !Number.isFinite(
          Number(now)
        )
      ) {
        return -1;
      }

      let index = -1;

      for (
        let i = 0;
        i < allItems.length;
        i += 1
      ) {
        const timestamp =
          Number(
            allItems[i].timestamp
          );

        if (
          !Number.isFinite(
            timestamp
          )
        ) {
          continue;
        }

        if (
          timestamp <=
          Number(now)
        ) {
          index = i;
        } else {
          break;
        }
      }

      return index;
    }, [allItems, now]);

  const currentItem =
    currentItemIndex >= 0
      ? allItems[
          currentItemIndex
        ]
      : null;

  const futureItems =
    useMemo(() => {
      if (
        currentItemIndex < 0
      ) {
        return [];
      }

      return allItems.slice(
        currentItemIndex
      );
    }, [
      allItems,
      currentItemIndex,
    ]);

  const analysisItems =
    useMemo(() => {
      if (
        futureItems.length === 0 ||
        !Number.isFinite(
          Number(now)
        )
      ) {
        return [];
      }

      const endTimestamp =
        Number(now) +
        Number(analysisHours) *
          60 *
          60 *
          1000;

      return futureItems.filter(
        (item) =>
          Number(
            item.timestamp
          ) <=
          endTimestamp
      );
    }, [
      futureItems,
      now,
      analysisHours,
    ]);

  const nextFuelLow =
    useMemo(() => {
      if (!currentItem) {
        return null;
      }

      return findNextFuelLowPriceFromNow(
        allItems,
        now,
        settings.fuelLowLimit
      );
    }, [
      allItems,
      currentItem,
      now,
      settings.fuelLowLimit,
    ]);

  const nextCo2Low =
    useMemo(() => {
      if (!currentItem) {
        return null;
      }

      return findNextCo2LowPriceFromNow(
        allItems,
        now,
        settings.co2LowLimit
      );
    }, [
      allItems,
      currentItem,
      now,
      settings.co2LowLimit,
    ]);

  const taipeiTime =
    data?.taipeiTime ||
    (Number.isFinite(
      Number(now)
    )
      ? new Date(
          now
        ).toLocaleString(
          "zh-TW",
          {
            timeZone:
              "Asia/Taipei",
            hour12: false,
          }
        )
      : "─");

  const currentTime =
    data?.currentTime ||
    taipeiTime;

  const lastUpdated =
    data?.updatedAt || null;

  return (
    <PageShell>
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding:
            "22px 14px 0",
          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.3,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            資源分析
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#9eb1c0",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            即時燃油與 CO₂
            價格分析
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              border:
                "1px solid rgba(236,95,85,0.35)",
              borderRadius: 10,
              background:
                "rgba(236,95,85,0.08)",
              color: "#EC5F55",
              padding:
                "12px 14px",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginBottom: 16,
          }}
        >
          <CurrentPriceCard
            currentItem={
              currentItem
            }
            settings={settings}
            nextFuelLow={
              nextFuelLow
            }
            nextCo2Low={
              nextCo2Low
            }
          />
        </div>

        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            marginBottom: 0,
          }}
        >
          <div
            style={{
              borderRadius:
                settingsOpen
                  ? "12px 12px 0 0"
                  : 12,
              border:
                "1px solid rgba(255,255,255,0.08)",
              background:
                "rgba(7, 18, 28, 0.97)",
              backdropFilter:
                "blur(12px)",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setSettingsOpen(
                  (previous) =>
                    !previous
                )
              }
              style={{
                width: "100%",
                border: "none",
                background:
                  "transparent",
                color: "#ffffff",
                cursor: "pointer",
                padding:
                  "15px 16px",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                ⚙️ 價格區間設定
              </span>

              <span
                style={{
                  color: "#9eb1c0",
                  fontSize: 17,
                  transform:
                    settingsOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  transition:
                    "transform 0.2s ease",
                }}
              >
                ▼
              </span>
            </button>

            {settingsOpen && (
              <div
                style={{
                  borderTop:
                    "1px solid rgba(255,255,255,0.07)",
                  padding: 14,
                }}
              >
                <SettingsContent
                  settings={
                    settings
                  }
                  setSettings={
                    setSettings
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            top: "74px",
            zIndex: 20,
            overflowX: "auto",
            background:
              "rgba(7, 18, 28, 0.97)",
            backdropFilter:
              "blur(12px)",
            borderBottom:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              minWidth: 560,
            }}
          >
            {FEATURES.map(
              (feature) => {
                const active =
                  selectedFeature ===
                  feature.id;

                return (
                  <button
                    key={
                      feature.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedFeature(
                        feature.id
                      )
                    }
                    style={{
                      flex: "1 1 0",
                      minWidth: 112,
                      border: "none",
                      borderBottom:
                        active
                          ? "2px solid #7BC7F9"
                          : "2px solid transparent",
                      background:
                        active
                          ? "rgba(123,199,249,0.07)"
                          : "transparent",
                      color: active
                        ? "#7BC7F9"
                        : "#9eb1c0",
                      padding:
                        "14px 8px",
                      fontSize: 15,
                      fontWeight:
                        active
                          ? 800
                          : 600,
                      cursor:
                        "pointer",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {
                      feature.label
                    }
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div
          style={{
            paddingTop: 22,
          }}
        >
          {selectedFeature ===
            "price" && (
            <>
              <SectionTitle
                title="即時價格查詢"
                description={`${taipeiTime}　GMT+8／每 30 分鐘更新`}
              />

              <PriceContent
                days={days}
                allItems={allItems}
                currentItemIndex={
                  currentItemIndex
                }
                nowTimestamp={now}
                settings={
                  settings
                }
              />
            </>
          )}

          {selectedFeature ===
            "overview" && (
            <>
              <SectionTitle
                title="資源分析"
                description="分析目前時段與未來價格狀況"
              />

              <div
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 9,
                  overflowX:
                    "auto",
                  paddingBottom: 2,
                }}
              >
                {[12, 24, 48, 72].map(
                  (hours) => (
                    <FilterButton
                      key={hours}
                      active={
                        analysisHours ===
                        hours
                      }
                      onClick={() =>
                        setAnalysisHours(
                          hours
                        )
                      }
                    >
                      未來 {hours} 小時
                    </FilterButton>
                  )
                )}
              </div>

              <OverviewContent
                currentItem={
                  currentItem
                }
                futureItems={
                  analysisItems
                }
                settings={
                  settings
                }
              />
            </>
          )}

          {selectedFeature ===
            "trend" && (
            <>
              <SectionTitle
                title="價格趨勢"
                description="未來價格變化"
              />

              <PriceChart
                items={
                  analysisItems
                }
                settings={
                  settings
                }
              />

              <div
                style={{
                  marginTop: 16,
                }}
              >
                <TrendContent
                  items={
                    analysisItems
                  }
                  settings={
                    settings
                  }
                />
              </div>
            </>
          )}

          {selectedFeature ===
            "low" && (
            <>
              <SectionTitle
                title="低價時段"
                description="所有資料中的低價時段"
              />

              <LowPriceContent
                items={allItems}
                settings={
                  settings
                }
              />
            </>
          )}

          {selectedFeature ===
            "update" && (
            <>
              <SectionTitle
                title="更新資訊"
                description="價格資料與更新狀態"
              />

              <UpdateContent
                timezone={
                  data?.timezone ||
                  "GMT+8"
                }
                currentTime={
                  currentTime
                }
                taipeiTime={
                  taipeiTime
                }
                onRefresh={
                  fetchData
                }
                loading={
                  loading
                }
                lastUpdated={
                  lastUpdated
                }
              />
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #07121c;
        }

        body {
          overflow-x: hidden;
        }

        button,
        input {
          font-family: inherit;
        }

        @media (max-width: 600px) {
          .analysis-page {
            padding-left: 10px;
            padding-right: 10px;
          }
        }
      `}</style>
    </PageShell>
  );
}