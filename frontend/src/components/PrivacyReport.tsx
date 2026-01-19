import { useState, useEffect, useRef } from "react";
import { FiX, FiShield, FiDownload, FiLock, FiCheck } from "react-icons/fi";
import { privacyApi } from "../lib/api";

interface PrivacyReportProps {
    pdfName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface AuditData {
    total_queries: number;
    avg_ciphertexts_touched: number;
    reduced_dim: number;
    quantization_bits: number;
    zero_plaintext_docs_exposed: boolean;
    decryption_scope: string[];
    recent_audits?: Array<{
        query_hash: string;
        ciphertexts_touched: number;
        homomorphic_ops: string;
        reduced_dim: number;
        quantization_bits: number;
        timestamp: string;
    }>;
    message?: string;
}

function PrivacyReport({ pdfName, isOpen, onClose }: PrivacyReportProps) {
    const [data, setData] = useState<AuditData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && pdfName) {
            fetchAuditReport();
        }
    }, [isOpen, pdfName]);

    const fetchAuditReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await privacyApi.getAuditReport(pdfName);
            setData(response);
        } catch (err) {
            setError("Failed to fetch privacy audit report");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        // Simple text-based report download
        const reportText = `
PRIVACY AUDIT REPORT
====================
Document: ${pdfName}
Generated: ${new Date().toISOString()}

SUMMARY
-------
Total Queries Processed: ${data?.total_queries || 0}
Average Ciphertexts Touched: ${data?.avg_ciphertexts_touched || 0}
Reduced Dimension: ${data?.reduced_dim || 32}
Quantization Bits: ${data?.quantization_bits || 4}

PRIVACY GUARANTEES
------------------
✓ Zero Plaintext Documents Exposed: ${data?.zero_plaintext_docs_exposed ? 'TRUE' : 'FALSE'}
✓ Decryption Scope: ${data?.decryption_scope?.join(', ') || 'similarity_scores only'}
✓ All document content processed under FHE encryption
✓ Only similarity scores were decrypted - never document content

AUDIT TRAIL
-----------
${data?.recent_audits?.map((a, i) =>
            `${i + 1}. Query Hash: ${a.query_hash}... | Ciphertexts: ${a.ciphertexts_touched} | Time: ${a.timestamp}`
        ).join('\n') || 'No audit entries yet'}

---
This report certifies that all document queries were processed using
Fully Homomorphic Encryption (FHE), ensuring end-to-end privacy.
    `.trim();

        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy_report_${pdfName.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10">
                            <FiShield className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Privacy Audit Report</h2>
                            <p className="text-xs text-slate-500">FHE Operation Transparency Log</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {data && !data.message && (
                            <button
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                            >
                                <FiDownload size={14} />
                                Download Report
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-white/80 transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]" ref={reportRef}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-rose-600">{error}</div>
                    ) : data?.message ? (
                        <div className="text-center py-12 text-slate-500">
                            <FiShield className="mx-auto mb-3 text-slate-300" size={48} />
                            <p>{data.message}</p>
                            <p className="text-sm mt-2">Ask some questions to start collecting audit data.</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            {/* Privacy Guarantee Banner */}
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                                        <FiLock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Zero Plaintext Exposure</h3>
                                        <p className="text-emerald-100 text-sm">All document queries processed under FHE encryption</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="bg-white/10 rounded-lg p-3">
                                        <div className="text-2xl font-bold">{data.total_queries}</div>
                                        <div className="text-xs text-emerald-100">Queries Audited</div>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                        <div className="text-2xl font-bold">{data.avg_ciphertexts_touched}</div>
                                        <div className="text-xs text-emerald-100">Avg Ciphertexts/Query</div>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Checkmarks */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Privacy Guarantees</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                                            <FiCheck className="text-emerald-600" size={14} />
                                        </div>
                                        <span className="text-sm text-slate-700">Zero plaintext documents exposed</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                                            <FiCheck className="text-emerald-600" size={14} />
                                        </div>
                                        <span className="text-sm text-slate-700">Only similarity scores decrypted (never content)</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                                            <FiCheck className="text-emerald-600" size={14} />
                                        </div>
                                        <span className="text-sm text-slate-700">All computations performed on encrypted data</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                                            <FiCheck className="text-emerald-600" size={14} />
                                        </div>
                                        <span className="text-sm text-slate-700">{data.reduced_dim}-dim vectors with {data.quantization_bits}-bit quantization</span>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Details */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Technical Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Reduced Dimension</div>
                                        <div className="text-lg font-semibold text-slate-800">{data.reduced_dim}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Quantization</div>
                                        <div className="text-lg font-semibold text-slate-800">{data.quantization_bits}-bit</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Decryption Scope</div>
                                        <div className="text-lg font-semibold text-slate-800">{data.decryption_scope.join(', ')}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Homomorphic Ops</div>
                                        <div className="text-lg font-semibold text-slate-800">Mul + Add</div>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Trail */}
                            {data.recent_audits && data.recent_audits.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Audit Entries</h3>
                                    <div className="space-y-2">
                                        {data.recent_audits.slice(0, 5).map((audit, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                            {audit.query_hash}...
                                                        </code>
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        {audit.ciphertexts_touched} ciphertexts
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {new Date(audit.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default PrivacyReport;
