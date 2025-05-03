import { useRef, useState } from "react";
import { CiCirclePlus } from "react-icons/ci";
import axios from "axios";

interface HeaderProps {
  onFileUpload: (fileName: string | null) => void;
  availableDocuments: string[];
  currentPdfName: string | null;
}

function Header({
  onFileUpload,
  availableDocuments,
  currentPdfName,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
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

        const response = await axios.post(
          "http://localhost:8000/upload/",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (response.data.filename) {
          onFileUpload(response.data.filename);
        } else {
          throw new Error("No filename in response");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        onFileUpload(null);
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

  const handleDocumentSelect = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedDoc = event.target.value;
    if (selectedDoc) {
      onFileUpload(selectedDoc);
    } else {
      onFileUpload(null);
    }
  };

  return (
    <div className="px-6 py-4 shadow-lg flex justify-between items-center">
      <img src="/Logo.svg" width={100} />

      <div className="flex items-center gap-3 md:gap-8">
        <div className="w-full sm:w-auto max-w-xs">
          <select
            value={currentPdfName || ""}
            onChange={handleDocumentSelect}
            className="w-[100px] sm:w-full border-[1px] border-green-500 text-green-600 rounded-lg p-2 text-xs md:text-sm outline-none "
          >
            <option value="" className="text-black">
              📄 Select document
            </option>
            {availableDocuments.map((doc) => (
              <option
                key={doc}
                value={doc}
                className={
                  doc === currentPdfName ? "text-green-600" : "text-black"
                }
              >
                {doc}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className="cursor-pointer border-2 p-1 sm:py-2 sm:px-8 rounded-full sm:rounded-xl text-sm flex gap-3 items-center font-semibold disabled:opacity-50"
        >
          <CiCirclePlus size={20} />
          <span className="hidden sm:inline">
            {isUploading ? "Uploading..." : "Upload PDF"}
          </span>
        </button>

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
