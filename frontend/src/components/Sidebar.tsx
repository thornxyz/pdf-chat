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
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-0 h-screen bg-white/80 text-slate-800 border-r border-slate-200/60 shadow-2xl backdrop-blur-xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } w-72 md:translate-x-0 md:relative md:z-auto md:h-screen flex flex-col`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10">
                <img src="/vite.svg" width={24} alt="Logo" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">ChatPDF</div>
                <div className="text-xs text-slate-500">Secure document chat</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <ImCross size={15} />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-5">
          <button
            onClick={handleButtonClick}
            disabled={isUploading}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 shadow-sm ${isUploading
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "border-slate-200 hover:bg-white hover:border-emerald-300 text-slate-700"
              }`}
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
            ) : (
              <CiCirclePlus size={20} />
            )}
            <span className="text-sm font-semibold">
              {isUploading ? "Uploading..." : "Upload PDF"}
            </span>
            {isUploading && (
              <div className="ml-auto">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 scrollbar-modern">
          <div className="text-[11px] font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">
            Documents
          </div>
          <div className="space-y-1">
            {availableDocuments.map((doc) => (
              <div
                key={doc.filename}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${currentPdfName === doc.filename
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                  }`}
                onClick={() => handleDocumentSelect(doc.filename)}
              >
                <MdDescription size={18} className="flex-shrink-0 text-slate-400" />
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
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity disabled:opacity-50"
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
        <div className="p-5 border-t border-slate-200/70 mt-auto">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-700">
              <FiUser size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="text-sm font-semibold text-slate-700 truncate">
                {user?.username}
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-full p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout"
            >
              <FiLogOut size={18} />
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
        className="fixed top-4 left-4 z-30 md:hidden bg-white/90 border border-slate-200 text-slate-700 p-2.5 rounded-xl shadow-lg hover:bg-white"
      >
        <HiOutlineMenuAlt2 size={15} />
      </button>
    </>
  );
}

export default Sidebar;
