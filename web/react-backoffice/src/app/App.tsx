const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">E-KYC TKSK</h1>
        <p className="text-slate-600">
          Frontend React untuk modul TKSK. Proyek ini memakai Vite + TypeScript + Tailwind v4
          dan mengikuti struktur alias yang sama dengan <code>react-main</code>.
        </p>
        <div className="text-slate-500 text-sm">
          Mulai kembangkan halaman pada folder <code>src/presentation/pages</code> dan gunakan alias
          seperti <code>@presentation</code>, <code>@domain</code>, dan lainnya.
        </div>
      </div>
    </div>
  );
};

export default App;

