import { useRef, useState } from "react";
import { CiCirclePlus } from "react-icons/ci";
import { MdDelete, MdDescription } from "react-icons/md";
import { ImCross } from "react-icons/im";
import { FiLogOut, FiUser } from "react-icons/fi";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { usePdfContext } from "../hooks/usePdfContext";
import { useAuth } from "../hooks/useAuth";
import { UploadResponse, SidebarProps } from "../lib/types";
import api from "../lib/api";

function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
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

  const handleDeleteDocument = async (filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      setIsDeleting(true);
      try {
        const encodedPdfName = encodeURIComponent(filename);
        await api.delete(`/documents/${encodedPdfName}`);
        if (currentPdfName === filename) {
          setCurrentPdfName(null);
        }
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

  const handleDocumentSelect = (filename: string) => {
    setCurrentPdfName(filename);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-300 opacity-20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-0 h-screen bg-white text-gray-800 border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 md:translate-x-0 md:relative md:z-auto md:h-screen flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/vite.svg" width={50} alt="Logo" />
              <div className="text-2xl font-semibold">ChatPDF</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden hover:text-gray-700"
            >
              <ImCross size={15} />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={handleButtonClick}
            disabled={isUploading}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-green-500 transition-colors disabled:opacity-50 text-gray-700"
          >
            <CiCirclePlus size={20} />
            <span className="text-sm">
              {isUploading ? "Uploading..." : "Upload PDF"}
            </span>
          </button>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Documents
          </div>
          <div className="space-y-1">
            {availableDocuments.map((doc) => (
              <div
                key={doc.filename}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentPdfName === doc.filename
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`}
                onClick={() => handleDocumentSelect(doc.filename)}
              >
                <MdDescription size={16} className="flex-shrink-0" />
                <span
                  className="flex-1 text-sm truncate"
                  title={doc.display_name}
                >
                  {doc.display_name.length > 25
                    ? doc.display_name.slice(0, 25) + "..."
                    : doc.display_name}
                </span>
                {currentPdfName === doc.filename && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.filename);
                    }}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity disabled:opacity-50"
                    title="Delete document"
                  >
                    <MdDelete size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center justify-between">
            <div>
              <FiUser size={22} />
            </div>
            <div className="text-sm truncate px-2 text-gray-700">
              Hello, {user?.username}
            </div>
            <button
              onClick={logout}
              className="hover:text-red-600 transition-colors"
              title="Logout"
            >
              <FiLogOut size={22} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-2 left-2 z-30 md:hidden bg-white border border-gray-300 text-gray-700 p-2 rounded-lg shadow-lg hover:bg-gray-50"
      >
        <HiOutlineMenuAlt2 size={15} />
      </button>
    </>
  );
}

export default Sidebar;
