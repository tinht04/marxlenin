import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-t-4 border-amber-600 mt-auto relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 opacity-50"></div>
      
      {/* Decorative circles - Dong Son style */}
      <div className="absolute bottom-2 left-8 w-6 h-6 border-2 border-amber-400 rounded-full opacity-20"></div>
      <div className="absolute bottom-3 left-10 w-3 h-3 border border-amber-500 rounded-full opacity-30"></div>
      <div className="absolute bottom-2 right-8 w-6 h-6 border-2 border-amber-400 rounded-full opacity-20"></div>
      <div className="absolute bottom-3 right-10 w-3 h-3 border border-amber-500 rounded-full opacity-30"></div>
      
      {/* Geometric pattern elements */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
        <div className="w-4 h-4 border-2 border-amber-400 rotate-45 opacity-20"></div>
      </div>
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
        <div className="w-4 h-4 border-2 border-amber-400 rotate-45 opacity-20"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-amber-600">━━━━━</span>
        </div>
        <p className="text-sm font-medium bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 bg-clip-text text-transparent">
          © {new Date().getFullYear()} Lịch sử Đảng — Tất cả quyền được bảo lưu.
        </p>
        <p className="text-sm font-medium bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 bg-clip-text text-transparent">
          {/* <a href="https://docs.google.com/document/d/1ajxDx53XqQaDr2ZF1004vdnHJJ-zbpPX5IDoBd9RqDE/edit?usp=sharing" target="_blank" rel="noopener noreferrer"> Phụ lục sử dụng tài liệu và AI.</a> */}
         
        </p>
      </div>
    </footer>
  );
};

export default Footer;
