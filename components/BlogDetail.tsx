import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { marked } from "marked";
import "./markdown.css";

// Configure marked to support tables
marked.setOptions({
  breaks: true,
  gfm: true,
});

const BLOG_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/export?format=csv&gid=1599321333";

export interface BlogRecord {
  ID: string;
  Title: string;
  Content: string;
  Date: string;
  Summary: string;
  CaseStudy: string;
  Source: string;
  Status: string;
}

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Papa.parse(BLOG_SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true, // Thêm này để bỏ qua dòng trống
      complete: (results) => {
        const data = results.data as BlogRecord[];
        const found = data.find(
          (item) => item.ID === id && item.Status === "Active"
        );
        setBlog(found || null);
        setLoading(false);
      },
      error: (err) => {
        setLoading(false);
        console.error("Error parsing Blog CSV:", err);
      },
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
        Đang tải...
      </div>
    );
  }

  if (!blog) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
        Không tìm thấy bài viết.
      </div>
    );
  }

  // Đảm bảo Content là string và có giá trị
  const content = String(blog.Content || "");

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 32 }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 24,
          background: "#e5e7eb",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#d1d5db")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#e5e7eb")}
      >
        ← Quay lại
      </button>

      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        {blog.Title}
      </h1>

      {blog.Date && (
        <div
          style={{
            color: "#64748b",
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          📅 {blog.Date}
        </div>
      )}

      <div
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #e2e8f0",
        }}
        className="markdown-content"
      >
        {content ? (
          <div
            dangerouslySetInnerHTML={{ __html: marked(content) }}
            style={{
              color: "#334155",
              lineHeight: 1.8,
              fontSize: 15,
            }}
          />
        ) : (
          <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
            Chưa có nội dung
          </div>
        )}
      </div>

      {blog.Source && (
        <div style={{ marginTop: 24 }}>
          <a
            href={blog.Source}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              color: "#3b82f6",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            🔗 Nguồn tham khảo →
          </a>
        </div>
      )}
    </div>
  );
};

export default BlogDetail;
