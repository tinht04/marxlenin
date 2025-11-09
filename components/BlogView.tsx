import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const BLOG_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/export?format=csv&gid=1599321333"; // Thay gid đúng của tab Blog_Sheet

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

import { useNavigate } from "react-router-dom";

const BlogView: React.FC = () => {
  const [blogList, setBlogList] = useState<BlogRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    Papa.parse(BLOG_SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data as BlogRecord[];
        const filtered = data.filter(
          (item) => item.Title && item.Status === "Active"
        );
        setBlogList(filtered);
      },
      error: (err) => {
        console.error("Error parsing Blog CSV:", err);
      },
    });
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 32 }}>Blog</h1>
      <div style={{ display: "grid", gap: 24 }}>
        {blogList.map((blog) => (
          <motion.div
            key={blog.ID}
            whileHover={{ scale: 1.02 }}
            style={{
              background: "#f8fafc",
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              padding: 24,
              cursor: "pointer",
              borderLeft:
                blog.Status === "Active"
                  ? "6px solid #3b82f6"
                  : "6px solid #94a3b8",
            }}
            onClick={() => navigate(`/blog/${blog.ID}`)}
          >
            <div style={{ fontSize: 22, fontWeight: 600 }}>{blog.Title}</div>
            <div style={{ color: "#64748b", fontSize: 15, margin: "8px 0" }}>
              {blog.Summary}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{blog.Date}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BlogView;
