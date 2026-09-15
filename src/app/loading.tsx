// Roza FM Suite — Route-level loading state
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-10 h-10 border-3 border-[#1e2940] border-t-[#00D4AA] rounded-full animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
        <div className="text-[12px] text-[#64748b]">Loading Roza FM Suite...</div>
      </div>
    </div>
  );
}
