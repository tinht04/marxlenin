import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} MarxLeninEdu — Tất cả quyền được bảo lưu.
      </div>
    </footer>
  );
};

export default Footer;
