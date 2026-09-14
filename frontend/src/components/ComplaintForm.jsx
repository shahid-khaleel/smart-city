import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, MapPin, AlertCircle, Loader2, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MapComponent from './MapComponent';

const ComplaintForm = ({ onSubmit }) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  });

  const [position, setPosition] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef(null);

  // Real backend AI (zero-shot text classifier) - not a local guess.
  // Note: this only ever reads the title/description text; there's no
  // vision model in this app, so a photo's actual content is never analyzed
  // even though attaching one can trigger this.
  //
  // Re-runs on every description/title edit and overwrites the category
  // with the latest result - including one you picked manually - so editing
  // the description after picking the wrong category corrects it. A manual
  // pick is only left undisturbed until you next edit the description/title.
  const detectCategory = async (text) => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/complaints/predict-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setFormData((prev) => ({ ...prev, category: data.predicted_category }));
    } catch (err) {
      console.error('Auto category detection failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-detect shortly after the user stops typing the title/description
  useEffect(() => {
    const text = `${formData.title} ${formData.description}`.trim();
    if (!text) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => detectCategory(text), 900);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, formData.description]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);

      // Also try detecting right away using whatever text has been entered so far
      const text = `${formData.title} ${formData.description}`.trim();
      if (text) detectCategory(text);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.category || !formData.description) {
      setError('Title, category and description are required.');
      return;
    }

    if (!position) {
      setError('Please set the incident location on the map.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalCategory = formData.category;
      let finalImageUrl = null;

      if (imageFile) {
        const cloudData = new FormData();
        cloudData.append('file', imageFile);
        cloudData.append('upload_preset', 'smartcity_connectAI');
        cloudData.append('cloud_name', 'njtyl4tg');

        const cloudResponse = await fetch('https://api.cloudinary.com/v1_1/njtyl4tg/image/upload', {
          method: 'POST',
          body: cloudData,
        });

        if (!cloudResponse.ok) throw new Error('Image upload failed.');
        const cloudResult = await cloudResponse.json();
        finalImageUrl = cloudResult.secure_url;
      }

      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title,
        description: formData.description,
        category: finalCategory,
        location_lat: position.lat,
        location_lng: position.lng,
        address: `GPS: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
        image_url: finalImageUrl,
      };

      const response = await fetch('/complaints/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit your report.');
      }

      const savedComplaint = await response.json();

      if (onSubmit) {
        onSubmit(savedComplaint);
      }

      setFormData({ title: '', category: '', description: '' });
      setPosition(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-5 md:p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
        <div className="p-2 bg-brand-50 rounded-lg">
          <AlertCircle className="text-brand-600" size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Report an issue</h2>
          <p className="text-xs text-gray-500">Tell us what's wrong and where</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="text-red-500 shrink-0" size={15} />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            className="input resize-none"
            placeholder="Describe the issue in detail (e.g., There is a large pothole in the right lane causing traffic slowdowns…)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="input"
              placeholder="e.g., Broken streetlight on 5th Ave"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Category</label>
              {isAnalyzing && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 animate-in fade-in">
                  <Loader2 size={12} className="animate-spin" /> Detecting…
                </span>
              )}
            </div>

            <div className="relative">
              <select name="category" value={formData.category} onChange={handleInputChange} className="input appearance-none cursor-pointer">
                <option value="">Select a category…</option>
                <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                <option value="Water & Sanitation">Water & Sanitation</option>
                <option value="Electrical & Lighting">Electrical & Lighting</option>
                <option value="Vandalism & Safety">Vandalism & Safety</option>
                <option value="Environment & Parks">Environment & Parks</option>
                <option value="Other / Unclassified">Other / Unclassified</option>
              </select>

              {formData.category && !isAnalyzing && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none animate-in zoom-in-50">
                  <Bot size={16} className="text-emerald-500" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Category is detected automatically from your description — editing the description will update it, even after you've picked one manually.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center justify-between">
              <span>Location</span>
              <span className="badge badge-blue">
                <MapPin size={10} /> Click map to pin
              </span>
            </label>

            <div className="h-[220px] rounded-lg overflow-hidden border border-gray-200">
              <MapComponent isPicker={true} complaintLocation={position || { lat: 12.9716, lng: 77.5946 }} onLocationSelect={setPosition} />
            </div>
          </div>

          <div>
            <label className="label">Photo (optional)</label>
            <div
              className="h-[220px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-brand-400 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              {imagePreview ? (
                <div className="absolute inset-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <span className="bg-white text-gray-700 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-lg">
                      Click to replace
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform duration-200">
                    <UploadCloud className="text-brand-600" size={18} />
                  </div>
                  <p className="text-sm text-gray-600 font-medium mb-0.5">Upload a photo</p>
                  <p className="text-xs text-gray-400">Click or drag an image here</p>
                </>
              )}
              <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageDrop} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Submitting…
            </>
          ) : (
            'Submit report'
          )}
        </button>
      </form>
    </div>
  );
};

export default ComplaintForm;
