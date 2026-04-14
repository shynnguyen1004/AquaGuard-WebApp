import { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ReportIssueForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "bug",
    description: "",
  });
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const issueTypes = [
    { id: "bug", labelKey: "reportIssue.typeBug", icon: "bug_report" },
    { id: "feature", labelKey: "reportIssue.typeFeature", icon: "lightbulb" },
    { id: "data", labelKey: "reportIssue.typeData", icon: "database" },
    { id: "other", labelKey: "reportIssue.typeOther", icon: "help" },
  ];

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles)
      .slice(0, 3 - files.length)
      .map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      }));
    setFiles((prev) => [...prev, ...validFiles].slice(0, 3));
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = t("reportIssue.titleRequired");
    if (!formData.description.trim()) errs.description = t("reportIssue.descriptionRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setFormData({ title: "", type: "bug", description: "" });
      setFiles([]);
      setTimeout(() => setSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/50 p-6 lg:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-black flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">report</span>
          {t("reportIssue.title")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("reportIssue.subtitle")}
        </p>
      </div>

      {success ? (
        <div className="bg-safe/10 border border-safe/20 rounded-2xl p-6 text-center animate-fade-in">
          <div className="size-16 bg-safe text-white rounded-full flex items-center justify-center mx-auto mb-4 scale-110">
            <span className="material-symbols-outlined text-3xl">check</span>
          </div>
          <h3 className="text-lg font-bold text-safe mb-1">{t("reportIssue.successTitle")}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("reportIssue.successMessage")}
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t("reportIssue.submitAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-bold mb-3 text-slate-700 dark:text-slate-300">
              {t("reportIssue.reportType")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {issueTypes.map((type) => (
                <label key={type.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type.id}
                    checked={formData.type === type.id}
                    onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                    className="peer sr-only"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all text-slate-500 hover:border-slate-300 h-full min-h-[72px]">
                    <span className={`material-symbols-outlined text-xl ${formData.type === type.id ? 'text-primary filled-icon' : ''}`}>
                      {type.icon}
                    </span>
                    <span className={`text-[11px] font-bold text-center leading-tight truncate w-full ${formData.type === type.id ? 'text-primary' : ''}`}>
                      {t(type.labelKey)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
              {t("reportIssue.titleLabel")}
            </label>
            <input
              type="text"
              placeholder={t("reportIssue.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border ${errors.title ? "border-danger" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all`}
            />
            {errors.title && <p className="text-xs text-danger mt-1.5 font-medium">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
              {t("reportIssue.detailedDescription")}
            </label>
            <textarea
              rows={4}
              placeholder={t("reportIssue.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border ${errors.description ? "border-danger" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none transition-all`}
            />
            {errors.description && <p className="text-xs text-danger mt-1.5 font-medium">{errors.description}</p>}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
              {t("reportIssue.attachments")} <span className="font-normal text-slate-400">{t("reportIssue.maxFiles")}</span>
            </label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${dragActive
                ? "border-primary bg-primary/5"
                : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
            >
              <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                attach_file
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("reportIssue.dropFiles")} <span className="text-primary font-bold">{t("reportIssue.chooseFile")}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{t("reportIssue.fileTypes")}</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* File Previews */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.preview ? (
                        <img src={file.preview} alt="preview" className="size-10 rounded-lg object-cover" />
                      ) : (
                        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{file.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="size-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors shrink-0 m-1"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="size-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                {t("reportIssue.sending")}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined filled-icon">send</span>
                {t("reportIssue.submit")}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
