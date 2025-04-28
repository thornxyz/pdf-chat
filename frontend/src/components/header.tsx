import { useRef, useState } from "react";
import { CiCirclePlus, CiFileOn } from "react-icons/ci";

function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click(); // Programmatically open the file picker
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedFileName(file.name);
      // Here you can also trigger an upload if needed
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
          className="cursor-pointer border-2 py-1 px-8 rounded-xl text-sm flex gap-3 items-center font-semibold"
        >
          <CiCirclePlus size={20} />
          Upload PDF
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
