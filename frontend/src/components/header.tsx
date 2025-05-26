import { useRef, useState } from "react";
import { CiCirclePlus } from "react-icons/ci";
import { MdDelete } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import Select from "react-select";
import { usePdfContext } from "../hooks/usePdfContext";
import { useAuth } from "../hooks/useAuth";
import { DocumentSelectOption, UploadResponse } from "../lib/types";
import api from "../lib/api";

function Header() {
  const {
    currentPdfName,
    availableDocuments,
    setCurrentPdfName,
    refreshDocuments,
  } = usePdfContext();

  const { user, logout } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  const options: DocumentSelectOption[] = availableDocuments.map((doc) => ({
    value: doc.filename,
    label:
      doc.display_name.length > 30
        ? doc.display_name.slice(0, 30) + "..."
        : doc.display_name,
  }));

  const selectedOption =
    currentPdfName &&
    availableDocuments.some((doc) => doc.filename === currentPdfName)
      ? options.find((option) => option.value === currentPdfName)
      : null;

  const handleDeleteDocument = async () => {
    if (!currentPdfName) return;
    if (
      window.confirm(`Are you sure you want to delete "${currentPdfName}"?`)
    ) {
      setIsDeleting(true);
      try {
        const encodedPdfName = encodeURIComponent(currentPdfName);
        await api.delete(`/documents/${encodedPdfName}`);
        setCurrentPdfName(null);
        await refreshDocuments();
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Failed to delete document!");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post<UploadResponse>("/upload/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data.filename) {
          await refreshDocuments();
          setTimeout(() => {
            setCurrentPdfName(response.data.filename);
          }, 100);
        } else {
          throw new Error("No filename in response");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setCurrentPdfName(null);
        alert("Failed to upload PDF file!");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } else {
      alert("Please upload a valid PDF file!");
    }
  };

  const handleDocumentSelect = (selected: DocumentSelectOption | null) => {
    if (selected) {
      setCurrentPdfName(selected.value);
    } else {
      setCurrentPdfName(null);
    }
  };

  return (
    <div className="px-1 py-1 md:px-6 md:py-2 shadow-lg flex justify-between items-center">
      <img src="/Logo.svg" width={100} />

      <div className="flex items-center gap-1 md:gap-6">
        {currentPdfName && (
          <button
            onClick={handleDeleteDocument}
            disabled={isDeleting}
            className="p-0.5 rounded-full text-red-600 hover:bg-red-100 hover:text-red-800 disabled:opacity-50 transition-colors"
            title="Delete document"
          >
            <span className="block sm:hidden">
              <MdDelete size={20} />
            </span>
            <span className="hidden sm:block">
              <MdDelete size={24} />
            </span>
          </button>
        )}
        <div className="w-[100px] sm:w-[250px]">
          <Select
            onChange={handleDocumentSelect}
            options={options}
            value={selectedOption}
            placeholder="Select document"
            className="text-nowrap text-xs md:text-sm"
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "36px",
                fontSize: "0.875rem",
                borderColor: state.isFocused ? "#22c55e" : base.borderColor,
                boxShadow: state.isFocused
                  ? "0 0 0 2px rgba(34, 197, 94, 0.5)"
                  : base.boxShadow,
                "&:hover": {
                  borderColor: "#22c55e",
                },
                "@media (max-width: 640px)": {
                  minHeight: "28px",
                  fontSize: "10px",
                },
              }),
              dropdownIndicator: (base) => ({
                ...base,
                padding: "2px",
                svg: {
                  height: 16,
                  width: 16,
                },
                "@media (max-width: 640px)": {
                  svg: {
                    height: 12,
                    width: 12,
                  },
                },
              }),
              indicatorSeparator: () => ({
                display: "none",
              }),
              valueContainer: (base) => ({
                ...base,
                padding: "0 6px",
                "@media (max-width: 640px)": {
                  padding: "0 4px",
                },
              }),
              option: (base) => ({
                ...base,
                fontSize: "0.875rem",
                "@media (max-width: 640px)": {
                  fontSize: "10px",
                },
              }),
              menu: (base) => ({
                ...base,
                fontSize: "0.875rem",
                "@media (max-width: 640px)": {
                  fontSize: "10px",
                },
              }),
            }}
          />
        </div>
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-1 md:py-2 md:px-4 rounded-full md:rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
        >
          <CiCirclePlus size={20} />
          <span className="hidden sm:inline">
            {isUploading ? "Uploading..." : "Upload PDF"}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 hidden md:inline">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-1 md:py-2 md:px-4 rounded-full md:rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors flex items-center gap-2 text-sm"
          >
            <FiLogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

export default Header;
