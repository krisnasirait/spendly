export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-25"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">📧</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ngintip email lo...
        </h1>
        <p className="text-gray-500">Sabar ya, bentar lagi keliatan 😂</p>
      </div>
    </main>
  );
}
