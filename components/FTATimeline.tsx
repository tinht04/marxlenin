import React, { useEffect, useState, useRef } from "react";
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
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Video fade in/out effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Fade in video when component mounts (slower)
    setTimeout(() => setVideoOpacity(1), 100);

    const handleLoadedMetadata = () => {
      video.volume = 0;
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;

      // Fade in audio in first 4 seconds with smooth curve
      if (currentTime < 4) {
        // Ease-in curve for smoother fade
        const progress = currentTime / 4;
        video.volume = Math.pow(progress, 0.5); // Square root for gentler fade-in
      } else if (duration - currentTime < 4) {
        // Fade out audio in last 4 seconds with smooth curve
        const progress = (duration - currentTime) / 4;
        video.volume = Math.pow(progress, 0.5); // Square root for gentler fade-out
      } else {
        video.volume = 1;
      }
    };

    const handleEnded = () => {
      // Fade out video
      setVideoOpacity(0);
      setTimeout(() => {
        setVideoPlaying(false);
      }, 300); // Match the CSS transition time (0.3s)
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    
    // Auto play video
    video.play().catch(err => console.log('Auto-play prevented:', err));

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const filteredList =
    filterTopic === "All"
      ? ftaList
      : ftaList.filter((fta) => fta.Topic === filterTopic);

  return (
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(135deg, #f5e6d3 0%, #faf8f3 50%, #f5e6d3 100%)",
        padding: "40px 20px",
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
      }}
    >
      {/* Dong Son Drum Background */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url('/img/dongson-drum.png')",
        backgroundSize: "1200px 1200px",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.08,
        pointerEvents: "none",
        zIndex: 0,
      }} />
      
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: 800,
              background: "linear-gradient(135deg, #b8860b 0%, #d4a574 50%, #cd7f32 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 8,
              letterSpacing: "-1px",
            }}
          >
            Vietnam FTA Timeline
          </h1>
          <p style={{ color: "#8b5a00", fontSize: 16, fontWeight: 600 }}>
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
                background: "linear-gradient(135deg, #fff9f0, #ffffff)",
                border: "2px solid #d4a574",
                borderRadius: 12,
                padding: "14px 48px 14px 24px",
                fontSize: 16,
                color: "#8b5a00",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                appearance: "none",
                minWidth: 250,
                transition: "all 0.3s ease",
                boxShadow: "0 4px 12px rgba(184, 134, 11, 0.1)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#b8860b")}
              onBlur={(e) => (e.target.style.borderColor = "#d4a574")}
            >
              {topics.map((topic) => (
                <option
                  key={topic}
                  value={topic}
                  style={{ background: "#fff9f0", color: "#8b5a00" }}
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
                color: "#b8860b",
                pointerEvents: "none",
                fontSize: 12,
              }}
            >
              ▼
            </div>
          </div>
        </div>

        {/* Video Section - Below Filter */}
        {videoPlaying && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 60,
              marginTop: 20,
              opacity: videoOpacity,
              transition: "opacity 0.3s ease-in-out",
            }}
          >
            {/* Video container */}
            <div
              style={{
                position: "relative",
                width: "min(600px, 90vw)",
                aspectRatio: "16/9",
                transition: "transform 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 20,
                  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 8px rgba(184, 134, 11, 0.3), 0 0 100px rgba(184, 134, 11, 0.2)",
                  border: "4px solid #d4a574",
                }}
              >
                <source src="/video/yeu-nuoc.mp4" type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            </div>
          </div>
        )}

        {/* Timeline - Only show after video ends */}
        {!videoPlaying && (
          <>
            {filteredList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#8b5a00",
                  fontSize: 18,
                  marginTop: 80,
                  fontWeight: 600,
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
                width: 4,
                height: "calc(100% - 80px)",
                background:
                  "linear-gradient(180deg, #b8860b 0%, #d4a574 50%, #cd7f32 90%, transparent 100%)",
                transform: "translateX(-50%)",
                borderRadius: 2,
                boxShadow: "0 0 8px rgba(184, 134, 11, 0.3)",
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
                        background: "linear-gradient(135deg, #fff9f0, #ffffff)",
                        borderRadius: 16,
                        padding: 24,
                        cursor: "pointer",
                        boxShadow: "0 10px 30px rgba(184, 134, 11, 0.2)",
                        border: "2px solid #d4a574",
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
                          background: "linear-gradient(135deg, #d4a574, #b8860b)",
                          color: "#fff",
                          padding: "8px 20px",
                          borderRadius: 20,
                          fontSize: 14,
                          fontWeight: 700,
                          boxShadow: "0 4px 12px rgba(184, 134, 11, 0.3)",
                        }}
                      >
                        {getYear(fta.Signing_Date)}
                      </div>

                      <h3
                        style={{
                          color: "#8b5a00",
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
                          color: "#8b5a00",
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
                              background: "linear-gradient(135deg, #ffe0b2, #ffecb3)",
                              color: "#8b5a00",
                              padding: "4px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              border: "1px solid #d4a574",
                            }}
                          >
                            {fta.Topic}
                          </span>
                        )}
                        <span
                          style={{
                            background:
                              fta.Status === "Active"
                                ? "linear-gradient(135deg, #d4f4dd, #c6f6d5)"
                                : "linear-gradient(135deg, #fed7aa, #fde68a)",
                            color:
                              fta.Status === "Active" ? "#065f46" : "#92400e",
                            padding: "4px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            border: fta.Status === "Active" ? "1px solid #6ee7b7" : "1px solid #fbbf24",
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
                        background: "linear-gradient(135deg, #d4a574, #b8860b)",
                        border: "4px solid #f5e6d3",
                        boxShadow: "0 0 0 4px #d4a574, 0 4px 15px rgba(184, 134, 11, 0.5)",
                        zIndex: 10,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
            )}
          </>
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
                background: "rgba(139, 90, 0, 0.7)",
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
                  background: "linear-gradient(135deg, #fff9f0, #ffffff)",
                  borderRadius: 24,
                  width: "100%",
                  maxWidth: 700,
                  maxHeight: "90vh",
                  overflow: "hidden",
                  boxShadow: "0 25px 50px rgba(184, 134, 11, 0.4)",
                  border: "2px solid #d4a574",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "32px 32px 24px",
                    borderBottom: "2px solid #d4a574",
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => setSelectedFTA(null)}
                    style={{
                      position: "absolute",
                      top: 24,
                      right: 24,
                      background: "linear-gradient(135deg, #ffe0b2, #ffecb3)",
                      border: "1px solid #d4a574",
                      borderRadius: 8,
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#8b5a00",
                      fontSize: 20,
                      transition: "all 0.2s",
                      fontWeight: 700,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #d4a574, #b8860b)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #ffe0b2, #ffecb3)";
                      e.currentTarget.style.color = "#8b5a00";
                    }}
                  >
                    ✕
                  </button>

                  <h2
                    style={{
                      color: "#8b5a00",
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
                            ? "linear-gradient(135deg, #d4f4dd, #c6f6d5)"
                            : "linear-gradient(135deg, #fed7aa, #fde68a)",
                        color:
                          selectedFTA.Status === "Active"
                            ? "#065f46"
                            : "#92400e",
                        padding: "4px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        border: selectedFTA.Status === "Active" ? "1px solid #6ee7b7" : "1px solid #fbbf24",
                      }}
                    >
                      {selectedFTA.Status}
                    </span>
                    {selectedFTA.Topic && (
                      <span
                        style={{
                          background: "linear-gradient(135deg, #ffe0b2, #ffecb3)",
                          color: "#8b5a00",
                          padding: "4px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          border: "1px solid #d4a574",
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
                              background: "linear-gradient(135deg, #fffaf0, #fff9f0)",
                              padding: 20,
                              borderRadius: 12,
                              border: "2px solid #d4a574",
                            }}
                          >
                            <div
                              style={{
                                color: "#8b5a00",
                                fontSize: 13,
                                fontWeight: 700,
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {item.icon} {item.label}
                            </div>
                            <div
                              style={{
                                color: "#8b5a00",
                                fontSize: 15,
                                lineHeight: 1.6,
                              }}
                            >
                              {item.value}
                            </div>
                          </div>
                        )
                    )}

                    {selectedFTA.Link && (
                      <a
                        href={selectedFTA.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          background:
                            "linear-gradient(135deg, #d4a574 0%, #b8860b 100%)",
                          color: "#fff",
                          padding: 16,
                          borderRadius: 12,
                          textAlign: "center",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: 15,
                          border: "2px solid #cd7f32",
                          boxShadow: "0 4px 12px rgba(184, 134, 11, 0.3)",
                          transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow =
                            "0 6px 20px rgba(184, 134, 11, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(184, 134, 11, 0.3)";
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
