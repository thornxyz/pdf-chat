import { useState, useEffect } from "react";
import { FiX, FiActivity, FiClock, FiCheckCircle, FiTrendingUp } from "react-icons/fi";
import { evalApi } from "../lib/api";

interface EvalStatsProps {
    pdfName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface EvalData {
    query_count: number;
    avg_overlap: number;
    avg_overlap_percent: number;
    avg_correlation: number | null;
    avg_fhe_latency_ms: number;
    avg_plain_latency_ms: number;
    latency_ratio: number | null;
    recent_evals?: Array<{
        query_text: string;
        fhe_overlap: number;
        rank_correlation: number | null;
        fhe_latency_ms: number;
        plain_latency_ms: number;
        created_at: string;
    }>;
    message?: string;
}

function EvalStats({ pdfName, isOpen, onClose }: EvalStatsProps) {
    const [data, setData] = useState<EvalData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && pdfName) {
            fetchEvalStats();
        }
    }, [isOpen, pdfName]);

    const fetchEvalStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await evalApi.getStats(pdfName);
            setData(response);
        } catch (err) {
            setError("Failed to fetch evaluation stats");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10">
                            <FiActivity className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">FHE Evaluation Stats</h2>
                            <p className="text-xs text-slate-500">FHE vs Plaintext Retrieval Comparison</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 hover:text-slate-700 hover:bg-white/80 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-rose-600">{error}</div>
                    ) : data?.message ? (
                        <div className="text-center py-12 text-slate-500">
                            <FiActivity className="mx-auto mb-3 text-slate-300" size={48} />
                            <p>{data.message}</p>
                            <p className="text-sm mt-2">Ask some questions to start collecting evaluation data.</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                                    <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                        <FiCheckCircle size={16} />
                                        <span className="text-xs font-medium uppercase tracking-wide">Accuracy</span>
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-800">
                                        {data.avg_overlap_percent}%
                                    </div>
                                    <div className="text-xs text-emerald-600 mt-1">FHE overlap with plaintext</div>
                                </div>

                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                                        <FiTrendingUp size={16} />
                                        <span className="text-xs font-medium uppercase tracking-wide">Correlation</span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-800">
                                        {data.avg_correlation !== null ? data.avg_correlation.toFixed(2) : "N/A"}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">Spearman rank correlation</div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700 mb-1">
                                        <FiClock size={16} />
                                        <span className="text-xs font-medium uppercase tracking-wide">FHE Latency</span>
                                    </div>
                                    <div className="text-2xl font-bold text-amber-800">
                                        {data.avg_fhe_latency_ms.toFixed(0)}ms
                                    </div>
                                    <div className="text-xs text-amber-600 mt-1">Average FHE retrieval</div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                    <div className="flex items-center gap-2 text-purple-700 mb-1">
                                        <FiActivity size={16} />
                                        <span className="text-xs font-medium uppercase tracking-wide">Queries</span>
                                    </div>
                                    <div className="text-2xl font-bold text-purple-800">
                                        {data.query_count}
                                    </div>
                                    <div className="text-xs text-purple-600 mt-1">Total evaluated</div>
                                </div>
                            </div>

                            {/* Latency Comparison */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Latency Comparison</h3>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">FHE Retrieval</span>
                                            <span className="font-medium text-slate-800">{data.avg_fhe_latency_ms.toFixed(1)}ms</span>
                                        </div>
                                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (data.avg_fhe_latency_ms / (data.avg_fhe_latency_ms + 100)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">Plaintext Retrieval</span>
                                            <span className="font-medium text-slate-800">{data.avg_plain_latency_ms.toFixed(1)}ms</span>
                                        </div>
                                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (data.avg_plain_latency_ms / (data.avg_fhe_latency_ms + 100)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {data.latency_ratio && (
                                    <p className="text-xs text-slate-500 mt-3">
                                        FHE is {data.latency_ratio}x slower than plaintext (expected for privacy-preserving computation)
                                    </p>
                                )}
                            </div>

                            {/* Recent Evaluations */}
                            {data.recent_evals && data.recent_evals.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Evaluations</h3>
                                    <div className="space-y-2">
                                        {data.recent_evals.slice(0, 5).map((eval_item, idx) => (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-slate-600 truncate max-w-[60%]">
                                                        {eval_item.query_text.substring(0, 50)}...
                                                    </span>
                                                    <span className={`text-sm font-medium ${eval_item.fhe_overlap >= 0.75 ? 'text-emerald-600' : eval_item.fhe_overlap >= 0.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {(eval_item.fhe_overlap * 100).toFixed(0)}% match
                                                    </span>
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

export default EvalStats;
