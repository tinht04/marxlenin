import React from "react";
import { Loader } from "./Loader";

interface ControlPanelProps {
  status: "idle" | "processing" | "ready" | "querying";
  error: string;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  error,
  onFileChange,
  fileInputRef,
}) => {
  const disableUpload =
    (import.meta as any)?.env?.VITE_DISABLE_UPLOAD === "true";
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
      <h3 className="text-lg font-semibold mb-4 border-b pb-3">
        Bảng điều khiển
      </h3>
      <div className="space-y-4">
        <div>
          {disableUpload ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
              Tải lên PDF tạm thời đã bị vô hiệu hóa. Tệp PDF được nạp sẵn trong
              ứng dụng.
            </div>
          ) : (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Tải lên một tệp</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={onFileChange}
                      accept="application/pdf"
                      ref={fileInputRef}
                      disabled={
                        status === "processing" || status === "querying"
                      }
                    />
                  </label>
                  <p className="pl-1">hoặc kéo và thả</p>
                </div>
                <p className="text-xs text-gray-500">Chỉ nhận tệp PDF</p>
              </div>
            </div>
          )}
        </div>

        {status === "processing" && <Loader message="Đang xử lý PDF..." />}
        {error && (
          <p className="text-red-500 text-sm font-semibold text-center p-2 bg-red-50 rounded-md">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
