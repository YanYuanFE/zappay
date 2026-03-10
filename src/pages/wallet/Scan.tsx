import { Link } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";

export default function Scan() {
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-6">
        <Link
          to="/wallet"
          className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-lg font-bold text-white">Scan QR Code</h1>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm aspect-square rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center">
          <Camera className="w-12 h-12 text-white/40 mb-4" />
          <p className="text-sm text-white/60 text-center">
            Camera access needed to scan QR codes
          </p>
          <p className="text-xs text-white/40 mt-2">
            QR scanner will be integrated here
          </p>
        </div>
      </div>

      <div className="px-8 pb-8">
        <p className="text-center text-xs text-white/40">
          Scan a merchant's QR code to pay instantly
        </p>
      </div>
    </div>
  );
}
