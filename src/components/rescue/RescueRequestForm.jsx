import { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function RescueRequestForm({ onClose, onSubmit }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    location: "",
    description: "",
    urgency: "medium",
  });
  const [images, setImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});

  const urgencyOptions = [
    { value: "low", label: t("rescueForm.low"), color: "peer-checked:bg-slate-200 peer-checked:text-slate-700 peer-checked:border-slate-400" },
    { value: "medium", label: t("rescueForm.medium"), color: "peer-checked:bg-warning/15 peer-checked:text-warning peer-checked:border-warning" },
    { value: "high", label: t("rescueForm.high"), color: "peer-checked:bg-danger/15 peer-checked:text-danger peer-checked:border-danger" },
    { value: "critical", label: t("rescueForm.critical"), color: "peer-checked:bg-danger peer-checked:text-white peer-checked:border-danger" },
  ];

  const handleImageFiles = (files) => {
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5 - images.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages((prev) => [...prev, ...newImages].slice(0, 5));
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
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
    if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files);
  };

  const validate = () => {
    const errs = {};
    if (!formData.location.trim()) errs.location = t("rescueForm.locationError");
    if (!formData.description.trim()) errs.description = t("rescueForm.descriptionError");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.({
      ...formData,
      images: images.map((img) => img.preview),
      userName: user?.displayName || "User",
      userAvatar: user?.avatarUrl || "",
      timeAgo: t("sosPage.justNow"),
      status: "pending",
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 pb-4 border-b border-slate-100 dark:border-slate-800 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">{t("rescueForm.title")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t("rescueForm.subtitle")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-500">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-bold mb-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-danger filled-icon">
                  location_on
                </span>
                {t("rescueForm.location")}
              </span>
            </label>
            <input
              type="text"
              placeholder={t("rescueForm.locationPlaceholder")}
              value={formData.location}
              onChange={(e) =>
                setFormData((p) => ({ ...p, location: e.target.value }))
              }
              className={`w-full px-4 py-3 rounded-xl border ${errors.location ? "border-danger" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm transition-all`}
            />
            {errors.location && (
              <p className="text-xs text-danger mt-1.5 font-medium">
                {errors.location}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold mb-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary filled-icon">
                  description
                </span>
                {t("rescueForm.description")}
              </span>
            </label>
            <textarea
              rows={4}
              placeholder={t("rescueForm.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
              className={`w-full px-4 py-3 rounded-xl border ${errors.description ? "border-danger" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none transition-all`}
            />
            {errors.description && (
              <p className="text-xs text-danger mt-1.5 font-medium">
                {errors.description}
              </p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-bold mb-3">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-warning filled-icon">
                  priority_high
                </span>
                {t("rescueForm.urgencyLevel")}
              </span>
            </label>
            <div className="flex gap-3">
              {urgencyOptions.map((opt) => (
                <label key={opt.value} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={formData.urgency === opt.value}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, urgency: e.target.value }))
                    }
                    className="peer sr-only"
                  />
                  <div
                    className={`text-center py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 transition-all hover:border-slate-300 ${opt.color}`}
                  >
                    {opt.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-bold mb-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary filled-icon">
                  photo_camera
                </span>
                {t("rescueForm.sceneImages")}
                <span className="text-xs font-normal text-slate-400">
                  {t("rescueForm.maxImages")}
                </span>
              </span>
            </label>

            {/* Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                cloud_upload
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("rescueForm.dragDrop")}{" "}
                <span className="text-primary font-bold">{t("rescueForm.chooseFiles")}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {t("rescueForm.fileTypes")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      alt={`Upload ${i + 1}`}
                      src={img.preview}
                      className="size-20 rounded-xl object-cover border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 size-6 rounded-full bg-danger text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <span className="material-symbols-outlined text-sm">
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t("rescueForm.cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base filled-icon">
                sos
              </span>
              {t("rescueForm.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
