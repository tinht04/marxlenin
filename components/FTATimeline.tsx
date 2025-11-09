import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";

const FTA_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/export?format=csv&gid=1785429482";

export interface FTARecord {
  ID: string;
  FTA_Name: string;
  Signing_Date: string;
  Effective_Date: string;
  Members: string;
  Description: string;
  VN_Role: string;
  Topic: string;
  Link: string;
  Status: string;
  Benefits: string;
  Source: string;
}

const FTATimeline: React.FC = () => {
  const [ftaList, setFtaList] = useState<FTARecord[]>([]);
  const [selectedFTA, setSelectedFTA] = useState<FTARecord | null>(null);
  const [filterTopic, setFilterTopic] = useState<string>("All");
  const [topics, setTopics] = useState<string[]>([]);

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DFE6E9",
    "#74B9FF",
    "#A29BFE",
    "#FD79A8",
    "#FDCB6E",
  ];

  const getYear = (date: string) => {
    const d = new Date(date);
    return isNaN(d.getFullYear()) ? "" : d.getFullYear();
  };

  useEffect(() => {
    Papa.parse(FTA_SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data as FTARecord[];
        const filtered = data.filter((item) => item.FTA_Name);
        setFtaList(filtered);

        const uniqueTopics = Array.from(
          new Set(filtered.map((item) => item.Topic).filter(Boolean))
        ).sort();
        setTopics(["All", ...uniqueTopics]);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
      },
    });
  }, []);

  const filteredList =
    filterTopic === "All"
      ? ftaList
      : ftaList.filter((fta) => fta.Topic === filterTopic);

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#0f172a",
        padding: "40px 20px",
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 8,
              letterSpacing: "-1px",
            }}
          >
            Vietnam FTA Timeline
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 16 }}>
            Các Hiệp Định Thương Mại Tự Do
          </p>
        </div>

        {/* Filter dropdown */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 50,
          }}
        >
          <div style={{ position: "relative" }}>
            <select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              style={{
                background: "#1e293b",
                border: "2px solid #334155",
                borderRadius: 12,
                padding: "14px 48px 14px 24px",
                fontSize: 16,
                color: "#fff",
                outline: "none",
                cursor: "pointer",
                appearance: "none",
                minWidth: 250,
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#334155")}
            >
              {topics.map((topic) => (
                <option
                  key={topic}
                  value={topic}
                  style={{ background: "#1e293b" }}
                >
                  {topic === "All" ? "📋 Tất cả" : `📁 ${topic}`}
                </option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                pointerEvents: "none",
                fontSize: 12,
              }}
            >
              ▼
            </div>
          </div>
        </div>

        {/* Timeline */}
        {filteredList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: 18,
              marginTop: 80,
            }}
          >
            Không tìm thấy FTA nào
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Timeline line */}
            <div
              style={{
                position: "absolute",
                top: 80,
                left: "50%",
                width: 2,
                height: "calc(100% - 80px)",
                background:
                  "linear-gradient(180deg, #334155 0%, #334155 90%, transparent 100%)",
                transform: "translateX(-50%)",
              }}
            />

            {/* FTA Items */}
            <div style={{ position: "relative" }}>
              {filteredList.map((fta, idx) => {
                const isLeft = idx % 2 === 0;
                return (
                  <motion.div
                    key={fta.ID}
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    style={{
                      display: "flex",
                      justifyContent: isLeft ? "flex-start" : "flex-end",
                      marginBottom: 60,
                      position: "relative",
                    }}
                  >
                    {/* Card */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -3 }}
                      onClick={() => setSelectedFTA(fta)}
                      style={{
                        width: "45%",
                        minWidth: 300,
                        background: "#1e293b",
                        borderRadius: 16,
                        padding: 24,
                        cursor: "pointer",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        border: "1px solid #334155",
                        position: "relative",
                      }}
                    >
                      {/* Year badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: -15,
                          right: isLeft ? "auto" : 24,
                          left: isLeft ? 24 : "auto",
                          background: colors[idx % colors.length],
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 20,
                          fontSize: 14,
                          fontWeight: 700,
                          boxShadow: `0 4px 15px ${
                            colors[idx % colors.length]
                          }40`,
                        }}
                      >
                        {getYear(fta.Signing_Date)}
                      </div>

                      <h3
                        style={{
                          color: "#fff",
                          fontSize: 20,
                          fontWeight: 700,
                          marginTop: 20,
                          marginBottom: 12,
                        }}
                      >
                        {fta.FTA_Name}
                      </h3>

                      <p
                        style={{
                          color: "#94a3b8",
                          fontSize: 14,
                          lineHeight: 1.6,
                          marginBottom: 16,
                        }}
                      >
                        {fta.Description}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {fta.Topic && (
                          <span
                            style={{
                              background: "#334155",
                              color: "#94a3b8",
                              padding: "4px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            {fta.Topic}
                          </span>
                        )}
                        <span
                          style={{
                            background:
                              fta.Status === "Active"
                                ? "#10b98140"
                                : "#f59e0b40",
                            color:
                              fta.Status === "Active" ? "#10b981" : "#f59e0b",
                            padding: "4px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {fta.Status}
                        </span>
                      </div>
                    </motion.div>

                    {/* Center dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 40,
                        transform: "translateX(-50%)",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: colors[idx % colors.length],
                        border: "4px solid #0f172a",
                        boxShadow: `0 0 0 4px #334155, 0 4px 15px ${
                          colors[idx % colors.length]
                        }60`,
                        zIndex: 10,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup */}
      <AnimatePresence>
        {selectedFTA && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFTA(null)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(8px)",
                zIndex: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "#1e293b",
                  borderRadius: 24,
                  width: "100%",
                  maxWidth: 700,
                  maxHeight: "90vh",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
                  border: "1px solid #334155",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "32px 32px 24px",
                    borderBottom: "1px solid #334155",
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => setSelectedFTA(null)}
                    style={{
                      position: "absolute",
                      top: 24,
                      right: 24,
                      background: "#334155",
                      border: "none",
                      borderRadius: 8,
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#94a3b8",
                      fontSize: 20,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#475569";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#334155";
                      e.currentTarget.style.color = "#94a3b8";
                    }}
                  >
                    ✕
                  </button>

                  <h2
                    style={{
                      color: "#fff",
                      fontSize: 28,
                      fontWeight: 700,
                      marginBottom: 8,
                      paddingRight: 50,
                    }}
                  >
                    {selectedFTA.FTA_Name}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        background:
                          selectedFTA.Status === "Active"
                            ? "#10b98140"
                            : "#f59e0b40",
                        color:
                          selectedFTA.Status === "Active"
                            ? "#10b981"
                            : "#f59e0b",
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {selectedFTA.Status}
                    </span>
                    {selectedFTA.Topic && (
                      <span
                        style={{
                          background: "#334155",
                          color: "#94a3b8",
                          padding: "4px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        {selectedFTA.Topic}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: 32,
                    overflowY: "auto",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "grid", gap: 20 }}>
                    {[
                      {
                        icon: "📅",
                        label: "Ngày ký",
                        value: selectedFTA.Signing_Date,
                      },
                      {
                        icon: "✅",
                        label: "Ngày có hiệu lực",
                        value: selectedFTA.Effective_Date,
                      },
                      {
                        icon: "🌏",
                        label: "Thành viên",
                        value: selectedFTA.Members,
                      },
                      {
                        icon: "🇻🇳",
                        label: "Vai trò VN",
                        value: selectedFTA.VN_Role,
                      },
                      {
                        icon: "💼",
                        label: "Lợi ích",
                        value: selectedFTA.Benefits,
                      },
                      {
                        icon: "📝",
                        label: "Mô tả",
                        value: selectedFTA.Description,
                      },
                    ].map(
                      (item, i) =>
                        item.value && (
                          <div
                            key={i}
                            style={{
                              background: "#0f172a",
                              padding: 20,
                              borderRadius: 12,
                              border: "1px solid #334155",
                            }}
                          >
                            <div
                              style={{
                                color: "#64748b",
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {item.icon} {item.label}
                            </div>
                            <div
                              style={{
                                color: "#e2e8f0",
                                fontSize: 15,
                                lineHeight: 1.6,
                              }}
                            >
                              {item.value}
                            </div>
                          </div>
                        )
                    )}

                    {selectedFTA.Source && (
                      <a
                        href={selectedFTA.Source}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          background:
                            "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                          color: "#fff",
                          padding: 16,
                          borderRadius: 12,
                          textAlign: "center",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: 15,
                          transition: "all 0.3s",
                          boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow =
                            "0 6px 20px rgba(59, 130, 246, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 15px rgba(59, 130, 246, 0.3)";
                        }}
                      >
                        🔗 Xem nguồn tham khảo
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FTATimeline;
