import { useRef, useState } from "react";
import { CiCirclePlus, CiFileOn } from "react-icons/ci";
import axios from "axios";

interface HeaderProps {
  onFileUpload: (fileName: string | null) => void;
}

function Header({ onFileUpload }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
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
          setUploadedFileName(response.data.filename);
          onFileUpload(response.data.filename);
        } else {
          throw new Error("No filename in response");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadedFileName(null);
        onFileUpload(null);
        alert("Failed to upload PDF file!");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    } else {
      alert("Please upload a valid PDF file!");
    }
  };

  return (
    <div className="px-6 py-4 shadow-lg flex justify-between items-center">
      <div>Logo</div>

      <div className="flex items-center gap-8">
        {uploadedFileName && (
          <div className="flex gap-2 items-center text-green-600">
            <CiFileOn className="w-5 h-5" />
            <span className="text-sm ">{uploadedFileName}</span>
          </div>
        )}
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className="cursor-pointer border-2 py-1 px-8 rounded-xl text-sm flex gap-3 items-center font-semibold disabled:opacity-50"
        >
          <CiCirclePlus size={20} />
          {isUploading ? "Uploading..." : "Upload PDF"}
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
