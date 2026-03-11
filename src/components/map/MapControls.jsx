export default function MapControls() {
  return (
    <div className="absolute bottom-8 left-8 flex flex-col gap-2">
      <div className="bg-white/90 dark:bg-background-dark/90 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-xl flex flex-col">
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
          <span className="material-symbols-outlined">add</span>
        </button>
        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-2" />
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
      <button className="bg-white/90 dark:bg-background-dark/90 backdrop-blur size-12 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center text-primary">
        <span className="material-symbols-outlined filled-icon">near_me</span>
      </button>
    </div>
  );
}
